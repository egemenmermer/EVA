from sqlalchemy import create_engine, Column, String, DateTime, Integer, JSON, Text, ForeignKey
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
import logging
from typing import Dict, List, Optional
from pathlib import Path
from datetime import datetime
import uuid
import json

logger = logging.getLogger(__name__)

# Create SQLAlchemy base class
Base = declarative_base()

class Conversation(Base):
    """Model for storing conversations."""
    __tablename__ = 'conversations'

    id = Column(String, primary_key=True)
    conversation_id = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    role = Column(String, nullable=False)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    context = Column(JSON)
    created_at = Column(DateTime, server_default='now()')

class Feedback(Base):
    """Model for storing user feedback."""
    __tablename__ = 'feedback'

    id = Column(String, primary_key=True)
    conversation_id = Column(String, nullable=False)
    query_id = Column(String, ForeignKey('conversations.id'), nullable=False)
    rating = Column(Integer)
    comment = Column(Text)
    created_at = Column(DateTime, server_default='now()')

class DatabaseConnector:
    """Handle PostgreSQL database operations."""
    
    def __init__(self):
        """Initialize database connection."""
        try:
            # Create database URL
            db_url = (
                f"postgresql://{os.getenv('POSTGRES_USER')}:"
                f"{os.getenv('POSTGRES_PASSWORD')}@"
                f"{os.getenv('POSTGRES_HOST')}:"
                f"{os.getenv('POSTGRES_PORT')}/"
                f"{os.getenv('POSTGRES_DB')}"
                f"?sslmode={os.getenv('POSTGRES_SSL_MODE', 'require')}"
                f"&options=endpoint%3Dep-square-dust-a5ayana1"
            )
            
            # Create engine and session
            self.engine = create_engine(db_url, connect_args={'sslmode': 'require'})
            Session = sessionmaker(bind=self.engine)
            self.session = Session()
            
            # Create tables
            Base.metadata.create_all(self.engine)
            
            logger.info("Database connection initialized successfully")
            
        except Exception as e:
            logger.error(f"Error connecting to database: {str(e)}")
            raise
            
    def save_conversation(self, 
                         conversation_id: str,
                         role: str,
                         query: str,
                         response: str,
                         context: Optional[List[Dict]] = None) -> str:
        """Save a conversation entry."""
        try:
            query_id = str(uuid.uuid4())
            
            # Create new conversation entry
            conversation = Conversation(
                id=query_id,
                conversation_id=conversation_id,
                timestamp=datetime.now(),
                role=role,
                query=query,
                response=response,
                context=context
            )
            
            # Add and commit
            self.session.add(conversation)
            self.session.commit()
            
            return query_id
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error saving conversation: {str(e)}")
            raise
            
    def get_conversation_history(self, 
                               conversation_id: str,
                               limit: int = 10) -> List[Dict]:
        """Get conversation history for a given conversation ID."""
        try:
            # Query conversations
            conversations = (
                self.session.query(Conversation)
                .filter(Conversation.conversation_id == conversation_id)
                .order_by(Conversation.timestamp.desc())
                .limit(limit)
                .all()
            )
            
            # Convert to dictionary format
            history = []
            for conv in conversations:
                history.append({
                    'id': conv.id,
                    'timestamp': conv.timestamp.isoformat(),
                    'role': conv.role,
                    'query': conv.query,
                    'response': conv.response,
                    'context': conv.context
                })
            
            return history
        except Exception as e:
            logger.error(f"Error getting conversation history: {str(e)}")
            return []
            
    def save_feedback(self,
                     conversation_id: str,
                     query_id: str,
                     rating: int,
                     comment: Optional[str] = None) -> str:
        """Save user feedback for a response."""
        try:
            feedback_id = str(uuid.uuid4())
            
            # Create new feedback entry
            feedback = Feedback(
                id=feedback_id,
                conversation_id=conversation_id,
                query_id=query_id,
                rating=rating,
                comment=comment
            )
            
            # Add and commit
            self.session.add(feedback)
            self.session.commit()
            
            return feedback_id
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"Error saving feedback: {str(e)}")
            raise 