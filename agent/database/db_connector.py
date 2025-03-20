from sqlalchemy import create_engine, Table, Column, String, DateTime, Integer, Text, ForeignKey, MetaData
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import UUID
import os
import logging
from typing import Dict, List, Optional
from datetime import datetime
import uuid
import json

logger = logging.getLogger(__name__)

# Create SQLAlchemy metadata
metadata = MetaData()

# Define tables directly instead of using declarative models
conversations = Table(
    'conversations', 
    metadata,
    Column('id', UUID(as_uuid=True), primary_key=True),
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.id')),
    Column('manager_type', String),
    Column('created_at', DateTime),
    Column('updated_at', DateTime)
)

conversation_contents = Table(
    'conversation_contents',
    metadata,
    Column('id', UUID(as_uuid=True), primary_key=True),
    Column('conversation_id', UUID(as_uuid=True), ForeignKey('conversations.id')),
    Column('user_query', Text),
    Column('agent_response', Text),
    Column('created_at', DateTime)
)

feedback_table = Table(
    'feedback',
    metadata,
    Column('id', UUID(as_uuid=True), primary_key=True),
    Column('conversation_id', UUID(as_uuid=True), ForeignKey('conversations.id')),
    Column('rating', Integer),
    Column('user_feedback', Text),
    Column('submitted_at', DateTime)
)

class DatabaseConnector:
    """Handle PostgreSQL database operations."""
    
    def __init__(self):
        """Initialize database connection."""
        try:
            # Get SSL mode from environment
            ssl_mode = os.getenv('POSTGRES_SSL_MODE', 'disable')
            
            # Create database URL
            db_url = (
                f"postgresql://{os.getenv('POSTGRES_USER')}:"
                f"{os.getenv('POSTGRES_PASSWORD')}@"
                f"{os.getenv('POSTGRES_HOST')}:"
                f"{os.getenv('POSTGRES_PORT')}/"
                f"{os.getenv('POSTGRES_DB')}"
                f"?sslmode={ssl_mode}"
            )
            
            # Create connection arguments based on SSL mode
            connect_args = {}
            if ssl_mode != 'disable':
                connect_args['sslmode'] = ssl_mode
            
            # Create engine with explicit UUID casting
            self.engine = create_engine(
                db_url, 
                connect_args=connect_args
            )
            
            # Create session
            Session = sessionmaker(bind=self.engine)
            self.session = Session()
            
            logger.info("Database connection initialized successfully")
            
        except Exception as e:
            logger.error(f"Error connecting to database: {str(e)}")
            raise
            
    def save_conversation(self, 
                         conversation_id: str,
                         user_id: str,
                         role: str,
                         query: str,
                         response: str,
                         context: Optional[List[Dict]] = None) -> str:
        """Save a conversation entry."""
        try:
            # Convert string IDs to UUID objects
            conv_uuid = uuid.UUID(conversation_id) if conversation_id else uuid.uuid4()
            user_uuid = uuid.UUID(user_id) if user_id else None
            message_id = uuid.uuid4()
            
            # Check if conversation exists
            result = self.engine.execute(
                conversations.select().where(conversations.c.id == conv_uuid)
            ).fetchone()
            
            # Create conversation if it doesn't exist
            if not result:
                # Insert the conversation
                self.engine.execute(
                    conversations.insert().values(
                        id=conv_uuid,
                        user_id=user_uuid,
                        manager_type=role.upper() if role else "DILUTER",
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                )
                
            # Insert message entry
            self.engine.execute(
                conversation_contents.insert().values(
                    id=message_id,
                    conversation_id=conv_uuid,
                    user_query=query,
                    agent_response=response,
                    created_at=datetime.now()
                )
            )
            
            return str(message_id)
            
        except Exception as e:
            logger.error(f"Error saving conversation: {str(e)}")
            raise
            
    def get_conversation_history(self, 
                               conversation_id: str,
                               limit: int = 10) -> List[Dict]:
        """Get conversation history for a given conversation ID."""
        try:
            # Convert string ID to UUID
            conv_uuid = uuid.UUID(conversation_id)
            
            # Query conversation contents
            result = self.engine.execute(
                conversation_contents.select()
                .where(conversation_contents.c.conversation_id == conv_uuid)
                .order_by(conversation_contents.c.created_at.desc())
                .limit(limit)
            ).fetchall()
            
            # Convert to dictionary format
            history = []
            for row in result:
                history.append({
                    'id': str(row['id']),
                    'conversationId': str(row['conversation_id']),
                    'userQuery': row['user_query'],
                    'agentResponse': row['agent_response'],
                    'createdAt': row['created_at'].isoformat() if row['created_at'] else None
                })
            
            return history
        except Exception as e:
            logger.error(f"Error getting conversation history: {str(e)}")
            return []
            
    def save_feedback(self,
                     conversation_id: str,
                     rating: int,
                     feedback: Optional[str] = None) -> str:
        """Save user feedback for a response."""
        try:
            # Convert string ID to UUID
            conv_uuid = uuid.UUID(conversation_id)
            feedback_id = uuid.uuid4()
            
            # Insert feedback entry
            self.engine.execute(
                feedback_table.insert().values(
                    id=feedback_id,
                    conversation_id=conv_uuid,
                    rating=rating,
                    user_feedback=feedback,
                    submitted_at=datetime.now()
                )
            )
            
            return str(feedback_id)
            
        except Exception as e:
            logger.error(f"Error saving feedback: {str(e)}")
            raise 