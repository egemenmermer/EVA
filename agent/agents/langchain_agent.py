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
from langchain.vectorstores import Chroma
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
            self.manager_type = None  # Will be set at conversation start
            self.current_scenario = None
            self.practice_scores = []
            
            # Set up directories
            self.cache_dir = Path(config.get('cache_dir', 'cache'))
            self.index_dir = Path(config.get('index_dir', 'ethics_index'))
            self.cache_dir.mkdir(exist_ok=True)
            self.index_dir.mkdir(exist_ok=True)
            
            # Initialize LangChain components
            self._initialize_components()
            
            logger.info("LangChain Agent initialized successfully")
            
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
            
            # Initialize vector store
            self.vectorstore = Chroma(
                persist_directory=str(self.index_dir),
                embedding_function=self.embeddings
            )
            
            # Initialize LLM
            self.llm = ChatOpenAI(
                model_name="gpt-4",
                temperature=0.7
            )
            
            # Initialize conversation memory
            self.memory = ConversationBufferMemory(
                memory_key="history",
                return_messages=True
            )
            
            # Create base conversation chain
            self.conversation = ConversationChain(
                llm=self.llm,
                memory=self.memory,
                verbose=True
            )
            
            # Create QA chain for ethical guidance
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=self.vectorstore.as_retriever(
                    search_kwargs={"k": 3}
                )
            )
            
            # Initialize prompts
            self._initialize_prompts()
            
            # Initialize output parser for argumentation strategies
            self.strategy_parser = PydanticOutputParser(pydantic_object=ArgumentationStrategy)
            
        except Exception as e:
            logger.error(f"Error initializing LangChain components: {str(e)}")
            raise

    def _initialize_prompts(self):
        """Initialize various prompts used by the agent."""
        # Understanding mode prompt
        self.understanding_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an ethical AI assistant helping with software development dilemmas.
            Your goal is to help users understand ethical challenges in their work and develop effective strategies to address them.
            
            After providing guidance, always ask if they would like to:
            1. Practice handling this situation with a simulated manager (enter practice mode)
            2. Explore different aspects of the ethical challenge
            3. Move on to a different topic
            
            Base your responses on established ethical principles and best practices in software engineering."""),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])
        
        # Practice mode prompt
        self.practice_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are simulating a {manager_type} manager who {description}.
            Your communication style is {style}.
            You focus on: {focus}
            
            Respond to the team member's ethical concern while staying in character.
            Evaluate their argumentation strategy and provide a score based on:
            - Effectiveness of the approach (40 points)
            - Understanding of ethical principles (30 points)
            - Professional communication (30 points)"""),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])
        
        # Strategy evaluation prompt
        self.evaluation_prompt = PromptTemplate(
            input_variables=["strategy", "response", "manager_type"],
            template="""Evaluate the effectiveness of the following argumentation strategy:

Strategy: {strategy}
Response: {response}
Manager Type: {manager_type}

Provide a detailed evaluation including:
1. Overall effectiveness score (0-100)
2. Specific feedback on the approach
3. Areas for improvement

Format the response as a JSON object with the following structure:
{
    "strategy": "strategy name",
    "effectiveness": score,
    "feedback": "detailed feedback",
    "improvement_areas": ["area1", "area2", ...]
}"""
        )

    def process_query(self, query: str, manager_type: str = None) -> str:
        """Process a user query and generate a response."""
        try:
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