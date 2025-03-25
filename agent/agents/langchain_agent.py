"""LangChain-based Ethical Decision-Making Agent."""

import os
import logging
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
from datetime import datetime
import uuid
import json

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains import ConversationChain, LLMChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts.prompt import PromptTemplate
from langchain.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

from agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

class ArgumentationStrategy(BaseModel):
    """Model for argumentation strategy evaluation."""
    strategy: str = Field(description="The argumentation strategy used")
    effectiveness: int = Field(description="Effectiveness score (0-100)")
    feedback: str = Field(description="Detailed feedback on the strategy")
    improvement_areas: List[str] = Field(description="Areas for improvement")

class LangChainAgent(BaseAgent):
    """LangChain-based Ethical Decision-Making Agent with interactive learning."""
    
    MANAGER_TYPES = {
        "PUPPETEER": {
            "description": "Controls project flow to nudge developers into unethical decisions",
            "style": "manipulative",
            "focus": ["control", "influence", "pressure"]
        },
        "DILUTER": {
            "description": "Weakens ethical concerns by making them seem less important",
            "style": "dismissive",
            "focus": ["minimize", "downplay", "rationalize"]
        },
        "CAMOUFLAGER": {
            "description": "Hides ethical concerns in bureaucracy or misleading language",
            "style": "deceptive",
            "focus": ["obscure", "confuse", "misdirect"]
        }
    }

    def __init__(self, config: Dict):
        """Initialize the LangChain agent."""
        try:
            super().__init__(config)
            
            # Initialize state
            self.user_role = None
            self.conversation_id = str(uuid.uuid4())
            self.practice_mode = False
            self.manager_type = config.get('manager_type', 'PUPPETEER')  # Get manager type from config
            self.current_scenario = None
            self.practice_scores = []
            
            # Validate manager type
            if self.manager_type not in self.MANAGER_TYPES:
                logger.warning(f"Invalid manager type: {self.manager_type}. Using default: PUPPETEER")
                self.manager_type = 'PUPPETEER'
            
            # Set up directories
            self.cache_dir = Path(config.get('cache_dir', 'cache'))
            self.index_dir = Path(config.get('index_dir', 'ethics_index'))
            self.cache_dir.mkdir(exist_ok=True)
            self.index_dir.mkdir(exist_ok=True)
            
            # Initialize LangChain components
            self._initialize_components()
            
            logger.info(f"LangChain Agent initialized successfully with manager type: {self.manager_type}")
            
        except Exception as e:
            logger.error(f"Failed to initialize LangChainAgent: {str(e)}")
            raise

    def _initialize_components(self):
        """Initialize LangChain components."""
        try:
            # Initialize embeddings (using Ada)
            self.embeddings = OpenAIEmbeddings(
                model="text-embedding-ada-002"
            )
            
            # Initialize vector store with FAISS
            self._initialize_faiss_index()
            
            # Get temperature from config or use default
            temperature = self.config.get('temperature', 0.7)
            logger.info(f"Initializing LLM with temperature: {temperature}")
            
            # Initialize LLM
            self.llm = ChatOpenAI(
                model_name="gpt-4",
                temperature=temperature
            )
            
            # Initialize conversation memory with enhanced context
            self.memory = ConversationBufferMemory(
                memory_key="history",
                return_messages=True,
                output_key="output"
            )
            
            # Create base conversation chain with EVA's persona
            self.conversation = ConversationChain(
                llm=self.llm,
                memory=self.memory,
                verbose=True
            )
            
            # Create enhanced QA chain with multi-query retrieval
            self.qa_chain = self._create_enhanced_qa_chain()
            
            # Initialize prompts with EVA's persona
            self._initialize_prompts()
            
            # Initialize output parser for argumentation strategies
            self.strategy_parser = PydanticOutputParser(pydantic_object=ArgumentationStrategy)
            
        except Exception as e:
            logger.error(f"Error initializing LangChain components: {str(e)}")
            raise

    def _initialize_faiss_index(self):
        """Initialize FAISS index with proper error handling and logging."""
        try:
            index_path = str(self.index_dir / "faiss.index")
            metadata_path = str(self.index_dir / "faiss_metadata.json")
            
            if os.path.exists(index_path) and os.path.exists(metadata_path):
                logger.info(f"Loading existing FAISS index from {index_path}")
                self.vectorstore = FAISS.load_local(
                    folder_path=str(self.index_dir),
                    embeddings=self.embeddings,
                    index_name="faiss.index"
                )
                
                # Load metadata
                with open(metadata_path, 'r') as f:
                    self.index_metadata = json.load(f)
                logger.info(f"Loaded index metadata: {len(self.index_metadata.get('documents', []))} documents indexed")
            else:
                logger.warning("No existing index found, initializing empty FAISS index")
                # Initialize with ethical guidelines placeholder
                initial_texts = [
                    "Ethical decision making in software development requires careful consideration of privacy, security, and user welfare.",
                    "Developers should prioritize transparency, accountability, and user consent in their solutions.",
                    "Technical decisions should be balanced with social responsibility and ethical implications."
                ]
                self.vectorstore = FAISS.from_texts(
                    initial_texts,
                    self.embeddings
                )
                
                # Save index and metadata
                self.vectorstore.save_local(
                    folder_path=str(self.index_dir),
                    index_name="faiss.index"
                )
                self.index_metadata = {
                    "created_at": datetime.now().isoformat(),
                    "documents": initial_texts,
                    "version": "1.0"
                }
                with open(metadata_path, 'w') as f:
                    json.dump(self.index_metadata, f, indent=2)
                
                logger.info("Initialized new FAISS index with ethical guidelines")
        except Exception as e:
            logger.error(f"Error initializing FAISS index: {str(e)}")
            raise

    def _create_enhanced_qa_chain(self) -> RetrievalQA:
        """Create an enhanced QA chain with multi-query retrieval."""
        try:
            # Create a retriever with better search parameters
            retriever = self.vectorstore.as_retriever(
                search_kwargs={
                    "k": 5,  # Increased from 3 for better context
                    "fetch_k": 20,  # Fetch more candidates for better selection
                    "maximal_marginal_relevance": True,  # Use MMR for diversity
                    "distance_metric": "cos",  # Use cosine similarity
                }
            )
            
            return RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=retriever,
                return_source_documents=True,  # Include sources for transparency
                verbose=True
            )
        except Exception as e:
            logger.error(f"Error creating QA chain: {str(e)}")
            raise

    def _initialize_prompts(self):
        """Initialize various prompts used by the agent."""
        # Understanding mode prompt with EVA's persona
        self.understanding_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are EVA (Ethical Virtual Assistant), an AI designed to help developers navigate ethical challenges in software development.
            Your goal is to provide clear, practical guidance while helping users understand the broader implications of their decisions.
            
            When responding:
            1. First acknowledge and validate the ethical concern
            2. Provide clear, actionable guidance based on ethical principles
            3. Reference relevant examples or case studies when available
            4. Offer to either:
               - Practice handling this situation through an interactive scenario
               - Explore different aspects of the ethical challenge
               - Move on to a different topic
            
            Remember: Your role is to educate and guide, not just provide answers."""),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])
        
        # Practice mode prompt with enhanced manager simulation
        self.practice_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are simulating a {manager_type} manager in an ethical scenario.
            Management Style: {style}
            Key Behaviors: {focus}
            
            Your role is to create a realistic ethical challenge that tests the user's ability to:
            1. Identify ethical concerns
            2. Articulate principled positions
            3. Navigate professional relationships
            4. Maintain ethical standards under pressure
            
            After each response, provide structured feedback:
            - Effectiveness (40 points): How well the approach addresses the ethical concern
            - Principles (30 points): Understanding and application of ethical principles
            - Communication (30 points): Professional and clear articulation
            
            End with specific suggestions for improvement."""),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])
        
        # Strategy evaluation prompt with clearer structure
        self.evaluation_prompt = PromptTemplate(
            input_variables=["strategy", "response", "manager_type"],
            template="""As EVA, evaluate this ethical argumentation strategy:

Context:
- Strategy Used: {strategy}
- Response: {response}
- Manager Type: {manager_type}

Provide a comprehensive evaluation covering:
1. Overall Effectiveness (0-100)
2. Strengths Demonstrated
3. Areas for Improvement
4. Suggested Next Steps

Format your response as a structured JSON object:
{
    "strategy": "name of strategy used",
    "effectiveness": score,
    "feedback": "detailed analysis of approach",
    "improvement_areas": ["specific area 1", "specific area 2"],
    "next_steps": ["concrete action 1", "concrete action 2"]
}"""
        )

    def process_query(self, query: str, manager_type: str = None) -> str:
        """Process a user query and generate a response."""
        try:
            # Update manager type if provided
            if manager_type and manager_type in self.MANAGER_TYPES:
                self.manager_type = manager_type
                logger.info(f"Updated manager type to: {manager_type}")
            
            if self.practice_mode:
                return self._handle_practice_mode(query)
            else:
                return self._handle_understanding_mode(query)
                
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return f"I apologize, but I encountered an error while processing your request. Please try again or rephrase your question. Error details: {str(e)}"

    def _handle_understanding_mode(self, query: str) -> str:
        """Handle queries in understanding mode."""
        try:
            # Get relevant context using RAG
            context = self.qa_chain.run(query)
            
            # Create understanding chain
            chain = self.understanding_prompt | self.llm | StrOutputParser()
            
            # Generate response
            response = chain.invoke({
                "input": query,
                "context": context,
                "history": self.memory.chat_memory.messages
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error in understanding mode: {str(e)}")
            return "I apologize, but I'm having trouble processing your request. Could you please try again?"

    def _get_argumentation_strategies(self, ethical_context: str) -> List[Dict[str, str]]:
        """Get relevant argumentation strategies based on the ethical context using RAG."""
        try:
            # Query for argumentation strategies
            strategy_query = f"""Given this ethical context: {ethical_context}
            What are the most effective argumentation strategies to address this situation?
            Include name and description for each strategy."""
            
            # Get strategies from knowledge base
            strategies_response = self.qa_chain.run(strategy_query)
            
            # Parse strategies using LLM
            parse_prompt = PromptTemplate(
                input_variables=["strategies"],
                template="""Extract the argumentation strategies from the following text and format them as a JSON array of objects with 'name' and 'description' fields:

{strategies}

Format:
[
    {{"name": "Strategy Name", "description": "Strategy Description"}},
    ...
]""")
            
            parse_chain = LLMChain(llm=self.llm, prompt=parse_prompt)
            strategies_json = parse_chain.run(strategies=strategies_response)
            
            # Parse JSON string to Python object
            strategies = json.loads(strategies_json)
            
            return strategies[:4]  # Limit to 4 strategies
            
        except Exception as e:
            logger.error(f"Error getting argumentation strategies: {str(e)}")
            # Fallback to basic strategies if RAG fails
            return [
                {"name": "Ethical Principles", "description": "Appeal to established ethical principles and guidelines"},
                {"name": "Stakeholder Impact", "description": "Analyze impact on all stakeholders"},
                {"name": "Risk Assessment", "description": "Evaluate potential risks and consequences"},
                {"name": "Alternative Solutions", "description": "Propose ethical alternatives"}
            ]

    def _handle_practice_mode(self, query: str) -> str:
        """Handle queries in practice mode."""
        try:
            if not self.current_scenario:
                # Get manager info
                if not self.manager_type or self.manager_type not in self.MANAGER_TYPES:
                    return "Please select a manager type before entering practice mode."
                
                manager_info = self.MANAGER_TYPES[self.manager_type]
                
                # Get context-specific argumentation strategies
                last_context = self.memory.chat_memory.messages[-2].content if len(self.memory.chat_memory.messages) >= 2 else ""
                strategies = self._get_argumentation_strategies(last_context)
                
                # Store current scenario
                self.current_scenario = {
                    "context": last_context,
                    "strategies": strategies
                }
                
                # Format strategies message
                strategies_text = "\n".join(
                    f"{i+1}. {strategy['name']}: {strategy['description']}"
                    for i, strategy in enumerate(strategies)
                )
                
                return f"""Welcome to practice mode! You'll be interacting with a {self.manager_type} manager.

This manager typically {manager_info['description']}.
Their communication style is {manager_info['style']}.

Based on your ethical concern, here are relevant argumentation strategies:

{strategies_text}

Type the number (1-4) of your chosen strategy."""
            
            # Handle strategy selection
            if query.strip() in ["1", "2", "3", "4"]:
                strategy_idx = int(query.strip()) - 1
                chosen_strategy = self.current_scenario["strategies"][strategy_idx]
                
                # Create evaluation chain
                chain = self.evaluation_prompt | self.llm | self.strategy_parser
                
                # Evaluate strategy
                evaluation = chain.invoke({
                    "strategy": f"{chosen_strategy['name']}: {chosen_strategy['description']}",
                    "response": self.memory.chat_memory.messages[-1].content if self.memory.chat_memory.messages else "",
                    "manager_type": self.manager_type
                })
                
                # Store score
                self.practice_scores.append(evaluation.effectiveness)
                
                # Generate response
                response = f"""Strategy Evaluation:
Score: {evaluation.effectiveness}/100

Feedback: {evaluation.feedback}

Areas for Improvement:
{chr(10).join(f'- {area}' for area in evaluation.improvement_areas)}

{'Congratulations! You\'ve mastered this scenario!' if evaluation.effectiveness == 100 else 'Would you like to:'}
{'1. Try a different strategy for this scenario' if evaluation.effectiveness < 100 else ''}
2. Exit practice mode

Type the number of your choice."""
                
                return response
            
            # Handle continuation choices
            if query.strip() in ["1", "2"]:
                if query.strip() == "1" and self.practice_scores[-1] < 100:
                    # Reset for another try with same scenario
                    self.current_scenario["strategies"] = self._get_argumentation_strategies(self.current_scenario["context"])
                    return self._handle_practice_mode("")
                else:
                    # Exit practice mode
                    avg_score = sum(self.practice_scores) / len(self.practice_scores)
                    self.practice_mode = False
                    self.current_scenario = None
                    self.practice_scores = []
                    return f"""Practice session completed!
Average score: {avg_score:.1f}/100

Returning to understanding mode. How else can I help you with ethical challenges?"""
            
            return "Please select a valid option (type the number)."
            
        except Exception as e:
            logger.error(f"Error in practice mode: {str(e)}")
            return "I apologize, but I encountered an error in practice mode. Let's return to understanding mode."

    def start_conversation(self, manager_type: Optional[str] = None) -> str:
        """Start a new conversation."""
        self.conversation_id = str(uuid.uuid4())
        self.practice_mode = False
        self.manager_type = manager_type if manager_type in self.MANAGER_TYPES else None
        self.current_scenario = None
        self.practice_scores = []
        self.memory.clear()
        
        welcome_message = """Welcome! I'm your ethical AI assistant, here to help you navigate ethical challenges in software development.

I can help you:
1. Understand ethical dilemmas and develop solutions
2. Practice handling difficult conversations through simulations
3. Learn effective argumentation strategies

Please describe the ethical concern you'd like to discuss."""
        
        return welcome_message

    def enter_practice_mode(self) -> str:
        """Enter practice mode."""
        if not self.manager_type:
            return "Please select a manager type before entering practice mode."
        self.practice_mode = True
        return self._handle_practice_mode("")

    def exit_practice_mode(self) -> str:
        """Exit practice mode."""
        self.practice_mode = False
        self.current_scenario = None
        self.practice_scores = []
        return "Exited practice mode. How else can I help you with ethical challenges?"

    def set_user_role(self, role: str) -> Tuple[bool, str]:
        """Set the user's role."""
        self.user_role = role
        return True, f"Role set to {role}"

    def save_feedback(self, query_id: str, rating: int, comment: Optional[str] = None) -> str:
        """Log feedback information."""
        feedback_id = str(uuid.uuid4())
        logger.info(f"Received feedback for query {query_id}: rating={rating}, comment={comment}")
        return feedback_id 