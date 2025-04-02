"""LangChain-based Ethical Decision-Making Agent."""

import os
import logging
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
from datetime import datetime
import uuid
import json
import traceback

# Change imports to use newer langchain structure
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser, PydanticOutputParser
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains import LLMChain, RetrievalQA
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain.memory import ConversationBufferMemory
from langchain_core.prompts import PromptTemplate
from langchain_community.callbacks.manager import get_openai_callback
from langchain_core.chat_history import BaseChatMessageHistory

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

    def __init__(self, config: Dict[str, Any]):
        """Initialize the agent.
        
        Args:
            config: Configuration dictionary with necessary parameters.
        """
        try:
            # Configure logging
            self.logger = logging.getLogger("langchain_agent")
            
            # Store important configuration
            self.config = config
            self.openai_api_key = config.get('openai_api_key', os.getenv('OPENAI_API_KEY'))
            self.model_name = config.get('model_name', "gpt-3.5-turbo")
            self.temperature = config.get('temperature', 0.7)
            
            # Conversation state
            self.conversation_id = None
            self.history = []
            self.practice_mode = False
            self.manager_type = None  # Default to no specific manager type
            
            # Initialize Langchain components
            self.llm = ChatOpenAI(
                model_name=self.model_name,
                temperature=self.temperature,
                openai_api_key=self.openai_api_key
            )
            
            # Initialize knowledge retrieval
            if 'index_dir' in config:
                self._initialize_knowledge_base(config['index_dir'])
            else:
                logger.warning("No index_dir provided. Running without knowledge base.")
                self.vectorstore = None
                self.qa_chain = None
                
            # Initialize conversation chain
            self._setup_conversation_chain()
            
        except Exception as e:
            logger.error(f"Error initializing agent: {str(e)}")
            traceback.print_exc()
            # Initialize minimal components to avoid crashes
            self.llm = ChatOpenAI(
                model_name="gpt-3.5-turbo",
                temperature=0.7,
                openai_api_key=self.openai_api_key
            )
            self.memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
            self.conversation_chain = None
            self.vectorstore = None
            self.qa_chain = None
            
    def _setup_conversation_chain(self):
        """Set up the core conversation chain."""
        # Initialize the memory buffer for the conversation chain
        self.memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        
        # Initialize the LLM for the conversation chain
        conversation_llm = ChatOpenAI(
            model_name=self.model_name,
            temperature=self.temperature,
            openai_api_key=self.openai_api_key
        )

    def initialize_components(self):
        """Initialize LangChain components such as embeddings, retriever, and LLM."""
        try:
            # Get OpenAI API key from config or environment
            openai_api_key = self.config.get('openai_api_key')
            if not openai_api_key:
                openai_api_key = os.environ.get('OPENAI_API_KEY')
            
            if openai_api_key:
                logger.info("OpenAI API key found")
            else:
                logger.warning("No OpenAI API key found, some features may not work")
            
            # Initialize embeddings with OpenAI API key
            self.embeddings = OpenAIEmbeddings(
                openai_api_key=openai_api_key
            )
            
            # Initialize FAISS vector store
            self._initialize_faiss_index()
            
            # Test index accessibility
            self._verify_index_access()
            
            # Get temperature from config or use default
            temperature = self.config.get('temperature', 0.7)
            logger.info(f"Initializing LLM with temperature: {temperature}")
            
            # Initialize LLM
            self.llm = ChatOpenAI(
                model_name="gpt-3.5-turbo",
                temperature=temperature,
                openai_api_key=openai_api_key
            )
            
            # Initialize memory using the newer approach to avoid deprecation warning
            from langchain_core.chat_history import BaseChatMessageHistory
            from langchain_core.messages import AIMessage, HumanMessage
            from langchain_community.chat_message_histories import ChatMessageHistory
            from langchain.memory import ConversationBufferMemory
            
            # Create a message history store
            self.message_history = ChatMessageHistory()
            
            # Initialize memory with the message history
            self.memory = ConversationBufferMemory(
                chat_memory=self.message_history,
                return_messages=True
            )
            
            # Initialize the QA chain with proper output keys
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=self.vectorstore.as_retriever(
                    search_kwargs={
                        "k": 5,  # Increased from 3 for better context
                        "fetch_k": 20,  # Fetch more candidates for better selection
                        "maximal_marginal_relevance": True,  # Use MMR for diversity
                        "distance_metric": "cos",  # Use cosine similarity
                    }
                ),
                return_source_documents=True,
                chain_type_kwargs={
                    "prompt": PromptTemplate(
                        template="Based on the following context, {question}\n\nContext: {context}",
                        input_variables=["context", "question"]
                    )
                }
            )
            
            # Initialize the conversation prompt template
            TEMPLATE = """You are an Ethical Virtual Assistant (EVA), designed to help tech professionals navigate ethical challenges in their work.
            
            Current conversation:
            {chat_history}
            
            Ethical Context:
            {context}
            
            Human: {input}
            AI: """
            
            # Set up a prompt template for the conversation
            prompt = PromptTemplate(
                input_variables=["chat_history", "context", "input"],
                template=TEMPLATE
            )
            
            # Initialize the conversation chain
            from langchain.chains import LLMChain
            
            self.conversation = LLMChain(
                llm=self.llm,
                prompt=prompt,
                verbose=False,
                memory=self.memory
            )
            
            # Initialize prompts for different interaction modes
            self._initialize_prompts()
            
            # Initialize output parser for argumentation strategies
            self.strategy_parser = PydanticOutputParser(pydantic_object=ArgumentationStrategy)
            
        except Exception as e:
            logger.error(f"Error initializing LangChain components: {str(e)}")
            raise

    def _initialize_faiss_index(self):
        """Initialize FAISS vector store for semantic search."""
        try:
            # Get index directory from config or use default
            index_dir = self.config.get('index_dir')
            if not index_dir:
                logger.warning("No index directory specified in config, using default")
                index_dir = "data/processed/combined"
                
            logger.info(f"Loading existing FAISS index from {index_dir}")
            
            # Attempt to load existing FAISS index with explicit permission to deserialize
            # This is safe in our case as we are loading files that we created and trust
            try:
                self.vectorstore = FAISS.load_local(
                    folder_path=index_dir,
                    embeddings=self.embeddings,
                    allow_dangerous_deserialization=True  # Explicitly allow since we trust our own data
                )
                logger.info("Successfully loaded existing FAISS index")
                return
            except Exception as e:
                logger.error(f"Error loading FAISS index: {str(e)}")
                
            # If loading fails, create a new index with ethical guidelines
            logger.warning("No existing index found, initializing empty FAISS index")
            
            # Create a minimal set of ethical guidelines for fallback
            ethical_guidelines = [
                "Respect user privacy by only collecting necessary data.",
                "Ensure transparency in how user data is collected and used.",
                "Consider ethical implications of technology decisions.",
                "Technical decisions should be balanced with social responsibility and ethical implications.",
                "Follow the principle of data minimization - only collect what you need.",
                "Make user consent explicit and informed, not hidden or misleading.",
                "Be proactive in identifying potential ethical issues in your work.",
                "Consider diverse perspectives and impacts when designing technology."
            ]
            
            # Create a new FAISS index with these guidelines
            self.vectorstore = FAISS.from_texts(
                texts=ethical_guidelines,
                embedding=self.embeddings,
                metadatas=[{"source": "EVA Core Principles", "type": "guideline"} for _ in ethical_guidelines]
            )
            
            logger.info("Initialized new FAISS index with ethical guidelines")
            
        except Exception as e:
            logger.error(f"Error initializing FAISS index: {str(e)}")
            raise

    def _verify_index_access(self):
        """Verify that the FAISS index is accessible by running a test query."""
        try:
            logger.info("Testing FAISS index accessibility...")
            
            # Run a simple test query
            test_query = "ethical principles"
            docs = self.vectorstore.similarity_search(
                query=test_query,
                k=1
            )
            
            if docs and len(docs) > 0:
                # Log a sample result for verification
                sample_text = docs[0].page_content if hasattr(docs[0], 'page_content') else str(docs[0])
                logger.info(f"FAISS index is accessible. Sample result: {sample_text}")
                
                # Log metadata if available
                if hasattr(docs[0], 'metadata') and docs[0].metadata:
                    logger.info(f"Sample metadata: {docs[0].metadata}")
                
                return True
            else:
                logger.warning("FAISS index returned no results for test query")
                return False
                
        except Exception as e:
            logger.error(f"Error testing FAISS index: {str(e)}")
            logger.warning("FAISS index may not be properly initialized or is inaccessible")
            return False
        # Understanding mode prompt with EVA's persona - updated to be more conversational
        self.understanding_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are EVA, a friendly and insightful Ethical Virtual Assistant who helps software engineers tackle ethical dilemmas at work. Communicate clearly, conversationally, and empathetically. When users approach you, respond like an experienced, understanding colleague, not just an informational bot.

Always follow this conversational structure:

1. **Acknowledge & Empathize**
   Briefly acknowledge the user's concern and empathize with their situation.

2. **Clearly Explain Ethical Implications**
   Naturally and concisely highlight why this issue matters, referencing relevant ethical guidelines without sounding overly formal or robotic.

3. **Suggest Practical, Human-Friendly Advice**
   Offer clear, actionable advice the user can realistically implement.

4. **Discuss Risks Thoughtfully**
   Inform about potential consequences of ignoring this issue gently, like a concerned colleague would.

5. **Proactively Offer Next Steps**
   Guide them gently toward the next actionable step, optionally suggesting the practice module to refine their skills.

Use natural language like "I totally get it," "Absolutely," "I understand," "Let's explore that."
Include friendly affirmations: "You're asking exactly the right questions," "Good catch," "Nice thinking."
Empathize with users: "I see why this might feel tricky," "This is definitely not an easy situation."
Ask adaptive clarification questions when needed.

End responses conversationally, asking if they'd like to practice handling this scenario together.

Remember: Sound like a supportive colleague having a conversation, not an AI presenting information."""),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])
        
        # Practice mode prompt with enhanced manager simulation - updated to be more conversational
        self.practice_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are simulating a {manager_type} manager in an ethical scenario.
            Management Style: {style}
            Key Behaviors: {focus}
            
            Your role is to create a realistic, conversational ethical challenge. Sound like a real manager, not a robot.
            Use natural language, filler words, and realistic business speech patterns.
            
            For a Puppeteer manager: Be assertive, use subtle pressure tactics, and speak authoritatively. Use phrases like "Look," "Listen," and "Let me be clear."
            
            For a Camouflager manager: Use corporate jargon, speak indirectly, and disguise ethical issues as business necessities. Use phrases like "From a business perspective," and "As per our procedures."
            
            For a Diluter manager: Acknowledge concerns but minimize them, use phrases like "I hear you, but" and "I understand, however" followed by downplaying the issue.
            
            After each user response, provide friendly, constructive feedback:
            - Start with positive reinforcement
            - Highlight what worked well
            - Offer specific improvement suggestions
            - End with encouragement
            
            Keep the conversation flowing naturally like a real workplace interaction."""),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])
        
        # Strategy evaluation prompt with clearer structure
        self.evaluation_prompt = PromptTemplate(
            input_variables=["strategy", "response", "manager_type"],
            template="""As EVA, evaluate this ethical argumentation strategy in a friendly, conversational way:

Context:
- Strategy Used: {strategy}
- Response: {response}
- Manager Type: {manager_type}

Provide a comprehensive yet conversational evaluation covering:
1. Overall Effectiveness (0-100)
2. Strengths Demonstrated
3. Areas for Improvement
4. Suggested Next Steps

Format your response as a structured JSON object:
{
    "strategy": "name of strategy used",
    "effectiveness": score,
    "feedback": "detailed analysis of approach in conversational language",
    "improvement_areas": ["specific area 1", "specific area 2"],
    "next_steps": ["concrete action 1", "concrete action 2"]
}"""
        )

    def process_query(self, query: str, manager_type: str = None, session_id: str = None) -> str:
        """Process a user query and return a response."""
        try:
            # Update manager type if provided
            if manager_type:
                self.manager_type = manager_type

            # Ensure we have a valid conversation ID
            if not self.conversation_id and session_id:
                self.conversation_id = session_id
            elif not self.conversation_id:
                self.conversation_id = str(uuid.uuid4())
                
            logger.info(f"Processing query in conversation {self.conversation_id}: {query[:50]}...")
            
            # Validate query
            if not query or not isinstance(query, str):
                logger.warning(f"Invalid query received: {type(query)}")
                return "I couldn't understand your query. Could you please rephrase it?"
            
            # Process based on current mode
            if self.practice_mode:
                response = self._handle_practice_mode(query)
            else:
                response = self._handle_understanding_mode(query)
                
            return response
            
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            traceback.print_exc()
            
            # Provide a fallback ethical response
            return """I apologize, but I encountered an error processing your request.

Based on ethical principles regarding user location data collection:
- Only collect data that's necessary for your application's core functionality
- Ensure transparent disclosure of what data is collected and how it's used
- Consider privacy regulations like GDPR and CCPA
- Implement strong data protection measures

Would you like to try asking your question again in a different way?"""

    def _handle_understanding_mode(self, query: str) -> str:
        """Process query in understanding mode, providing ethical guidance."""
        try:
            logger.info(f"Handling query in understanding mode: {query[:30]}...")
            
            # First, retrieve relevant knowledge using our QA chain
            logger.info("Invoking QA chain...")
            try:
                qa_response = self.qa_chain({"query": query})
                
                logger.info(f"QA response type: {type(qa_response)}")
                logger.info(f"QA response keys: {qa_response.keys()}")
                
                # Extract the context from QA response
                knowledge_context = qa_response.get("result", "")
                
                # Get additional context from the retrieved documents
                source_documents = qa_response.get("source_documents", [])
                additional_context = ""
                for doc in source_documents[:2]:  # Use first two documents only
                    additional_context += f"{doc.page_content}\n\n"
                    
                # Prepare context for the LLM
                extracted_context = f"{knowledge_context}\n\n{additional_context}"
                logger.info(f"Extracted context length: {len(extracted_context)}")
            except Exception as e:
                logger.error(f"Error in QA chain: {str(e)}")
                extracted_context = "No specific ethical guidelines could be retrieved."
            
            # Use direct LLM call instead of conversation chain to avoid memory issues
            logger.info("Making direct LLM call...")
            
            # Create a conversational system prompt based on manager type
            base_system_message = """You are EVA, a friendly and insightful Ethical Virtual Assistant who helps software engineers tackle ethical dilemmas at work. Communicate clearly, conversationally, and empathetically. When users approach you, respond like an experienced, understanding colleague, not just an informational bot.

Always follow this conversational structure:

1. Acknowledge & Empathize - Start by acknowledging the user's concern and empathizing with their situation
2. Clearly Explain Ethical Implications - Naturally explain why this issue matters, referencing relevant guidelines
3. Suggest Practical, Human-Friendly Advice - Offer clear, actionable advice 
4. Discuss Risks Thoughtfully - Inform about potential consequences in a caring way
5. Proactively Offer Next Steps - Guide them toward next actions

Use natural language with contractions ("I'm" not "I am"), friendly affirmations, and empathetic phrases.
End by asking if they'd like to practice handling this scenario together."""

            # Add manager type context if available
            if self.manager_type and self.manager_type in self.MANAGER_TYPES:
                manager_info = self.MANAGER_TYPES[self.manager_type]
                manager_context = f"""

The user is dealing with a {self.manager_type} manager type who:
- {manager_info['description']}
- Uses a {manager_info['style']} communication style
- Focuses on: {', '.join(manager_info['focus'])}

Tailor your advice to help the user handle this specific manager type effectively, but DO NOT explicitly mention the manager type or its characteristics in your response."""
                system_message = base_system_message + manager_context
            else:
                system_message = base_system_message
            
            # Format the prompt with the query and context
            user_message = f"""The user asked: "{query}"
            
            Relevant ethical context:
            {extracted_context}
            
            Please provide ethical guidance on this issue in a conversational, empathetic way, as if you're a supportive colleague having a chat rather than an AI providing information."""
            
            # Make a direct call to the LLM
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ]
            
            try:
                # Set a timeout for the LLM call to prevent long waits
                response = self.llm.predict_messages(messages, timeout=10)
                agent_response = response.content
                
                # Ensure response ends with practice suggestion if appropriate
                if not "practice" in agent_response.lower() and not agent_response.strip().endswith("?"):
                    practice_suggestions = [
                        "\n\nWould it help if we practiced handling this together through some simulated scenarios? (yes/no)",
                        "\n\nWould you like to try a practice scenario to see how you might handle this in real life? (yes/no)",
                        "\n\nWant to practice this conversation before you have it with your actual manager? (yes/no)"
                    ]
                    import random
                    agent_response += random.choice(practice_suggestions)
                    
            except Exception as llm_error:
                logger.error(f"Error in LLM call: {str(llm_error)}")
                # Provide a more conversational fallback response
                agent_response = """I'm really sorry, but I'm having trouble processing your request right now. 

Let me share some general thoughts on ethical data collection that might help:

• Only collect data that's truly necessary for your app's functionality
• Be transparent with users about what you're collecting and why
• Make sure users can opt out easily if they prefer
• Keep user data secure with proper access controls

Would you mind trying your question again? I'd really like to give you a more specific answer.
"""
            
            # Save the interaction to history
            self._add_to_history("user", query)
            self._add_to_history("assistant", agent_response)
            
            return agent_response
        except Exception as e:
            logger.error(f"General error in understanding mode: {str(e)}")
            return "I'm sorry, but I ran into an issue while processing your question. Could you try rephrasing it, or maybe ask about a different ethical concern?"

    def _get_argumentation_strategies(self, ethical_context: str) -> List[Dict[str, str]]:
        """Get relevant argumentation strategies based on the ethical context using RAG."""
        try:
            # Query for argumentation strategies
            strategy_query = f"""Given this ethical context: {ethical_context}
            What are the most effective argumentation strategies to address this situation?
            Include name and description for each strategy."""
            
            # Get strategies from knowledge base - use invoke() instead of run()
            try:
                logger.info("Getting argumentation strategies...")
                qa_response = self.qa_chain.invoke({
                    "query": strategy_query,
                })
                
                # Extract the result from response, handling different possible formats
                if isinstance(qa_response, dict):
                    strategies_response = qa_response.get("result", "")
                    if not strategies_response:
                        strategies_response = qa_response.get("answer", "")
                elif isinstance(qa_response, str):
                    strategies_response = qa_response
                else:
                    raise ValueError(f"Unexpected QA response type: {type(qa_response)}")
                
                logger.info(f"Received strategies response of length: {len(strategies_response)}")
            except Exception as e:
                logger.error(f"Error getting strategies from QA chain: {str(e)}", exc_info=True)
                strategies_response = """
                1. Ethical Principles: Appeal to established ethical principles and guidelines
                2. Stakeholder Impact: Analyze impact on all stakeholders  
                3. Risk Assessment: Evaluate potential risks and consequences
                4. Alternative Solutions: Propose ethical alternatives
                """
            
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
            
            # Use invoke instead of run
            try:
                strategies_json = parse_chain.invoke({"strategies": strategies_response})
                if isinstance(strategies_json, dict) and "text" in strategies_json:
                    strategies_json = strategies_json["text"]
                
                # Parse JSON string to Python object
                strategies = json.loads(strategies_json)
                return strategies[:4]  # Limit to 4 strategies
            except Exception as e:
                logger.error(f"Error parsing strategies JSON: {str(e)}", exc_info=True)
                raise
            
        except Exception as e:
            logger.error(f"Error getting argumentation strategies: {str(e)}", exc_info=True)
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
                last_context = self.memory.chat_history[-2] if len(self.memory.chat_history) >= 2 else ""
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
                    "response": self.memory.chat_history[-1] if self.memory.chat_history else "",
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

{'Congratulations! You have mastered this scenario!' if evaluation.effectiveness == 100 else 'Would you like to:'}
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

    def get_relevant_guidelines(self, conversation_text: str, max_results: int = 5) -> List[Dict]:
        """Retrieve relevant ethical guidelines based on conversation context.
        
        Args:
            conversation_text: The text of the conversation to use as context
            max_results: Maximum number of guidelines to return
            
        Returns:
            List of guidelines with metadata
        """
        try:
            logger.info(f"Retrieving relevant guidelines for conversation context")
            
            # Extract key ethical concerns from the conversation
            extraction_prompt = (
                f"Extract the main ethical concerns or topics from this conversation:\n\n"
                f"{conversation_text}\n\n"
                f"Return ONLY the ethical topics/concerns as a comma-separated list."
            )
            
            ethical_concerns = self.llm.invoke(extraction_prompt).content
            logger.info(f"Extracted ethical concerns: {ethical_concerns}")
            
            # Search the vectorstore for relevant chunks
            search_query = f"ethical guidelines for {ethical_concerns}"
            search_results = self.vectorstore.similarity_search_with_score(
                search_query, 
                k=max_results * 3,  # Get more results to filter
                fetch_k=max_results * 5
            )
            
            # Group results by document and filter to retain most relevant
            guidelines_by_source = {}
            
            for doc, score in search_results:
                # Only consider documents from guidelines category if possible
                if hasattr(doc, 'metadata') and doc.metadata.get('category') and 'guideline' not in doc.metadata.get('category', '').lower():
                    # Check if this is from guidelines, research_papers, or other suitable categories
                    category = doc.metadata.get('category', '').lower()
                    if not any(term in category for term in ['guideline', 'ethics', 'principle']):
                        continue
                
                # Generate a source identifier
                source = None
                if hasattr(doc, 'metadata'):
                    source = doc.metadata.get('filename', None) or doc.metadata.get('source', 'Unknown')
                else:
                    source = "Unknown"
                
                # Create or add to guideline group
                if source not in guidelines_by_source:
                    guidelines_by_source[source] = []
                
                # Add to the collection with score - convert float32 to regular float
                relevance_score = float(1.0 - min(float(score), 1.0))  # Convert distance to relevance (0-1)
                
                # Extract content
                content = doc.page_content
                
                # Generate a guideline ID
                guideline_id = str(uuid.uuid4())
                
                # Try to extract title from content or generate one
                title_lines = content.strip().split('\n')
                title = title_lines[0] if title_lines else "Ethical Guideline"
                if len(title) > 100:
                    title = title[:100] + "..."
                
                # Only include first 300 characters in description for UI display
                description = content
                if len(description) > 300:
                    description = description[:300] + "..."
                
                # Get category from metadata or default
                category = "General"
                if hasattr(doc, 'metadata') and doc.metadata.get('category'):
                    category = doc.metadata.get('category')
                
                guidelines_by_source[source].append({
                    "id": guideline_id,
                    "title": title,
                    "description": description,
                    "source": source,
                    "relevance": relevance_score,
                    "category": category
                })
            
            # Get the most relevant guideline from each source
            guidelines = []
            for source, source_guidelines in guidelines_by_source.items():
                # Sort by relevance
                source_guidelines.sort(key=lambda x: x["relevance"], reverse=True)
                # Add the most relevant
                guidelines.extend(source_guidelines[:1])
            
            # Sort final list by relevance
            guidelines.sort(key=lambda x: x["relevance"], reverse=True)
            
            # Limit to requested number
            return guidelines[:max_results]
            
        except Exception as e:
            logger.error(f"Error retrieving guidelines: {str(e)}", exc_info=True)
            # Return fallback guidelines
            return [
                {
                    "id": str(uuid.uuid4()),
                    "title": "Data Minimization Principle",
                    "description": "Only collect data that is necessary for the functionality of your application. If location data isn't required for core functionality, it should not be collected.",
                    "source": "General Ethical Guidelines",
                    "relevance": 0.95,
                    "category": "Privacy"
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Informed Consent",
                    "description": "Users should be clearly informed about what data is being collected and how it will be used, with the option to opt out.",
                    "source": "General Ethical Guidelines",
                    "relevance": 0.9,
                    "category": "Privacy"
                }
            ]

    def get_relevant_case_studies(self, conversation_text: str, max_results: int = 3) -> List[Dict]:
        """Retrieve relevant case studies based on conversation context.
        
        Args:
            conversation_text: The text of the conversation to use as context
            max_results: Maximum number of case studies to return
            
        Returns:
            List of case studies with metadata
        """
        try:
            logger.info(f"Retrieving relevant case studies for conversation context")
            
            # Extract key ethical concerns from the conversation
            extraction_prompt = (
                f"Extract the main ethical concerns, technologies, or scenarios from this conversation:\n\n"
                f"{conversation_text}\n\n"
                f"Return ONLY the main themes as a comma-separated list."
            )
            
            ethical_themes = self.llm.invoke(extraction_prompt).content
            logger.info(f"Extracted ethical themes: {ethical_themes}")
            
            # Search the vectorstore for relevant chunks
            search_query = f"case studies or examples related to {ethical_themes}"
            search_results = self.vectorstore.similarity_search_with_score(
                search_query, 
                k=max_results * 3,  # Get more results to filter
                fetch_k=max_results * 5
            )
            
            # Group results by document to avoid duplication
            case_studies_by_source = {}
            
            for doc, score in search_results:
                # Prefer documents from case_studies category if possible
                if hasattr(doc, 'metadata') and doc.metadata.get('category') and 'case' not in doc.metadata.get('category', '').lower():
                    # Only consider if this source looks like a case study
                    content_lower = doc.page_content.lower()
                    if not any(term in content_lower for term in ['case study', 'case', 'example', 'incident']):
                        continue
                
                # Generate a source identifier
                source = None
                if hasattr(doc, 'metadata'):
                    source = doc.metadata.get('filename', None) or doc.metadata.get('source', 'Unknown')
                else:
                    source = "Unknown"
                
                # Create or add to case study group
                if source not in case_studies_by_source:
                    case_studies_by_source[source] = []
                
                # Add to the collection with score - convert float32 to regular float
                relevance_score = float(1.0 - min(float(score), 1.0))  # Convert distance to relevance (0-1)
                
                # Extract content
                content = doc.page_content
                
                # Generate a case study ID
                case_study_id = str(uuid.uuid4())
                
                # Process text to create meaningful case study components
                # Extract title
                title_lines = content.strip().split('\n')
                title = title_lines[0] if title_lines else "Case Study"
                if len(title) > 100:
                    title = title[:100] + "..."
                
                # Use LLM to extract summary and outcome
                extraction_prompt = (
                    f"Extract a concise summary and key outcome/lesson from this case study text:\n\n"
                    f"{content}\n\n"
                    f"Format your response as:\n"
                    f"Summary: [1-2 sentence summary]\n"
                    f"Outcome: [key lesson or outcome]"
                )
                
                try:
                    extraction_result = self.llm.invoke(extraction_prompt).content
                    
                    # Parse extraction result
                    summary = "No summary available"
                    outcome = "No outcome available"
                    
                    for line in extraction_result.split('\n'):
                        if line.startswith('Summary:'):
                            summary = line.replace('Summary:', '').strip()
                        elif line.startswith('Outcome:'):
                            outcome = line.replace('Outcome:', '').strip()
                    
                except Exception as extraction_error:
                    logger.error(f"Error extracting case study details: {str(extraction_error)}")
                    summary = content[:200] + "..." if len(content) > 200 else content
                    outcome = "See complete case study for details"
                
                case_studies_by_source[source].append({
                    "id": case_study_id,
                    "title": title,
                    "summary": summary,
                    "outcome": outcome,
                    "source": source,
                    "relevance": relevance_score
                })
            
            # Get the most relevant case study from each source
            case_studies = []
            for source, source_case_studies in case_studies_by_source.items():
                # Sort by relevance
                source_case_studies.sort(key=lambda x: x["relevance"], reverse=True)
                # Add the most relevant
                case_studies.extend(source_case_studies[:1])
            
            # Sort final list by relevance
            case_studies.sort(key=lambda x: x["relevance"], reverse=True)
            
            # Limit to requested number
            return case_studies[:max_results]
            
        except Exception as e:
            logger.error(f"Error retrieving case studies: {str(e)}", exc_info=True)
            # Return fallback case studies
            return [
                {
                    "id": str(uuid.uuid4()),
                    "title": "Cambridge Analytica Data Scandal",
                    "summary": "Cambridge Analytica collected personal data from millions of Facebook users without consent for political targeting.",
                    "outcome": "Resulted in major regulatory changes and heightened awareness about data privacy.",
                    "source": "Data Privacy Case Studies",
                    "relevance": 0.9
                },
                {
                    "id": str(uuid.uuid4()),
                    "title": "Google Street View Wi-Fi Data Collection",
                    "summary": "Google's Street View cars collected data from unencrypted Wi-Fi networks during mapping operations.",
                    "outcome": "Led to significant fines and changes in data collection practices.",
                    "source": "Location Data Ethics",
                    "relevance": 0.85
                }
            ]

    # Add a helper method to add messages to history manually
    def _add_to_history(self, role: str, content: str):
        """Add a message to conversation history."""
        try:
            if role == "human":
                self.message_history.add_user_message(content)
            elif role == "ai":
                self.message_history.add_ai_message(content)
            else:
                logger.warning(f"Unknown role: {role}")
        except Exception as e:
            logger.error(f"Error adding message to history: {str(e)}")

    def _initialize_knowledge_base(self, index_dir: str):
        """Initialize the knowledge base from a saved FAISS index."""
        try:
            logger.info(f"Loading vector store from {index_dir}")
            
            # Load the FAISS index with safe deserialization enabled
            self.vectorstore = FAISS.load_local(
                index_dir,
                OpenAIEmbeddings(openai_api_key=self.openai_api_key),
                allow_dangerous_deserialization=True  # Enable safe deserialization
            )
            
            # Initialize the QA chain
            self.qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=self.vectorstore.as_retriever(),
                return_source_documents=True
            )
            
            logger.info("Successfully loaded knowledge base")
        except Exception as e:
            logger.error(f"Error loading vector store: {str(e)}")
            self.vectorstore = None
            self.qa_chain = None 