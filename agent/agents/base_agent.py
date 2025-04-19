"""Base agent class defining the interface for all agents."""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple
import os
from langchain.chat_models import ChatOpenAI

class BaseAgent(ABC):
    """Abstract base class for all agents."""
    
    def __init__(self, config: Dict):
        """Initialize the base agent.
        
        Args:
            config (Dict): Configuration dictionary containing model and environment settings
        """
        self.config = config
        self.conversation_id = None
        self.user_role = None
        
    @abstractmethod
    def process_query(self, query: str, **kwargs) -> str:
        """Process a user query.
        
        Args:
            query (str): The user's query
            **kwargs: Additional parameters for processing
            
        Returns:
            str: Response to the query
        """
        pass
        
    def start_conversation(self) -> str:
        """Start a new conversation.
        
        Returns:
            str: Welcome message
        """
        return "Welcome to the Ethical Decision-Making Assistant. How can I help you today?"
        
    def set_user_role(self, role: str) -> Tuple[bool, str]:
        """Set the user's role.
        
        Args:
            role (str): The role to set
            
        Returns:
            Tuple[bool, str]: Success status and message
        """
        self.user_role = role
        return True, f"Role set to {role}"
        
    def save_feedback(self, query_id: str, rating: int, comment: Optional[str] = None) -> str:
        """Log feedback information (implementation optional in subclasses).
        
        Args:
            query_id (str): ID of the query to give feedback on
            rating (int): Numerical rating
            comment (Optional[str]): Optional feedback comment
            
        Returns:
            str: Feedback ID
        """
        return "feedback-not-implemented"

    def initialize_components(self):
        """Initialize LangChain components."""
        try:
            # Extract and validate configuration
            openai_api_key = self.config.get('openai_api_key', os.getenv("OPENAI_API_KEY"))
            if not openai_api_key:
                raise ValueError("OpenAI API key is required")
            
            temperature = self.config.get('temperature', 0.7)
            
            # Initialize LLM
            self.llm = ChatOpenAI(
                model_name="gpt-4o-mini",
                temperature=temperature,
                openai_api_key=openai_api_key
            )
        except Exception as e:
            print(f"Error initializing components: {str(e)}")
            raise 