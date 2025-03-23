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
    
    ARGUMENTATION_STRATEGIES = {
        "DIRECT": "Directly address ethical concerns with clear evidence and principles",
        "STAKEHOLDER": "Focus on impact to various stakeholders and their interests",
        "CONSEQUENCE": "Emphasize long-term consequences and potential risks",
        "ALTERNATIVE": "Propose alternative solutions that maintain ethical standards"
    }

    def __init__(self, config: Dict):
        """Initialize the LangChain agent."""
        try:
            super().__init__(config)
            
            # Initialize state
            self.user_role = None
            self.conversation_id = str(uuid.uuid4())
            self.practice_mode = False
            self.current_manager = None
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
                memory_key="chat_history",
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
            MessagesPlaceholder(variable_name="chat_history"),
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
            MessagesPlaceholder(variable_name="chat_history"),
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
                "chat_history": self.memory.chat_memory.messages
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error in understanding mode: {str(e)}")
            return "I apologize, but I'm having trouble processing your request. Could you please try again?"

    def _handle_practice_mode(self, query: str) -> str:
        """Handle queries in practice mode."""
        try:
            if not self.current_manager:
                # Start practice session
                self.current_manager = self._select_random_manager()
                manager_info = self.MANAGER_TYPES[self.current_manager]
                
                return f"""Welcome to practice mode! You'll be interacting with a {self.current_manager} manager.

This manager typically {manager_info['description']}.
Their communication style is {manager_info['style']}.

Choose your argumentation strategy:
1. DIRECT: {self.ARGUMENTATION_STRATEGIES['DIRECT']}
2. STAKEHOLDER: {self.ARGUMENTATION_STRATEGIES['STAKEHOLDER']}
3. CONSEQUENCE: {self.ARGUMENTATION_STRATEGIES['CONSEQUENCE']}
4. ALTERNATIVE: {self.ARGUMENTATION_STRATEGIES['ALTERNATIVE']}

Type the number (1-4) of your chosen strategy."""
            
            # Handle strategy selection
            if query.strip() in ["1", "2", "3", "4"]:
                strategy_map = {
                    "1": "DIRECT",
                    "2": "STAKEHOLDER",
                    "3": "CONSEQUENCE",
                    "4": "ALTERNATIVE"
                }
                chosen_strategy = strategy_map[query.strip()]
                
                # Create evaluation chain
                chain = self.evaluation_prompt | self.llm | self.strategy_parser
                
                # Evaluate strategy
                evaluation = chain.invoke({
                    "strategy": self.ARGUMENTATION_STRATEGIES[chosen_strategy],
                    "response": self.memory.chat_memory.messages[-1].content if self.memory.chat_memory.messages else "",
                    "manager_type": self.current_manager
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
{'1. Try a different strategy with this manager' if evaluation.effectiveness < 100 else ''}
{'2. Practice with a different manager type' if evaluation.effectiveness == 100 else ''}
3. Exit practice mode

Type the number of your choice."""
                
                return response
            
            # Handle continuation choices
            if query.strip() in ["1", "2", "3"]:
                if query.strip() == "1" and self.practice_scores[-1] < 100:
                    # Reset for another try with same manager
                    return self._handle_practice_mode("")
                elif query.strip() == "2" and self.practice_scores[-1] == 100:
                    # Reset with new manager
                    self.current_manager = None
                    self.practice_scores = []
                    return self._handle_practice_mode("")
                else:
                    # Exit practice mode
                    avg_score = sum(self.practice_scores) / len(self.practice_scores)
                    self.practice_mode = False
                    self.current_manager = None
                    self.practice_scores = []
                    return f"""Practice session completed!
Average score: {avg_score:.1f}/100

Returning to understanding mode. How else can I help you with ethical challenges?"""
            
            return "Please select a valid option (type the number)."
            
        except Exception as e:
            logger.error(f"Error in practice mode: {str(e)}")
            return "I apologize, but I encountered an error in practice mode. Let's return to understanding mode."

    def _select_random_manager(self) -> str:
        """Select a random manager type for practice."""
        import random
        return random.choice(list(self.MANAGER_TYPES.keys()))

    def start_conversation(self) -> str:
        """Start a new conversation."""
        self.conversation_id = str(uuid.uuid4())
        self.practice_mode = False
        self.current_manager = None
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
        self.practice_mode = True
        return self._handle_practice_mode("")

    def exit_practice_mode(self) -> str:
        """Exit practice mode."""
        self.practice_mode = False
        self.current_manager = None
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