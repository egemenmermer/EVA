"""Base agent class defining the interface for all agents."""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple

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
    def start_conversation(self) -> str:
        """Start a new conversation.
        
        Returns:
            str: Welcome message
        """
        pass
        
    @abstractmethod
    def set_user_role(self, role: str) -> Tuple[bool, str]:
        """Set the user's role.
        
        Args:
            role (str): The role to set
            
        Returns:
            Tuple[bool, str]: Success status and message
        """
        pass
        
    @abstractmethod
    def process_query(self, query: str) -> str:
        """Process a user query.
        
        Args:
            query (str): The user's query
            
        Returns:
            str: Response to the query
        """
        pass
        
    @abstractmethod
    def save_feedback(self, query_id: str, rating: int, comment: Optional[str] = None) -> str:
        """Save feedback for a response.
        
        Args:
            query_id (str): ID of the query to give feedback on
            rating (int): Numerical rating
            comment (Optional[str]): Optional feedback comment
            
        Returns:
            str: Feedback ID
        """
        pass 