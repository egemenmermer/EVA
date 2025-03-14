import sqlite3
import logging
import json
from typing import Optional, Dict, Any
import os

logger = logging.getLogger(__name__)

class DatabaseConnector:
    """SQLite database connector for storing conversations and feedback."""
    
    def __init__(self, db_path: str = "data/conversations.db"):
        """Initialize database connection."""
        # Create data directory if it doesn't exist
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self._create_tables()
    
    def _create_tables(self):
        """Create necessary database tables if they don't exist."""
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                query TEXT,
                response TEXT,
                metadata TEXT
            )
        ''')
        
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS feedback (
                conversation_id TEXT,
                feedback TEXT,
                rating INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(conversation_id) REFERENCES conversations(id)
            )
        ''')
        self.conn.commit()
    
    def save_conversation(self, conversation_id: str, query: str, response: str, 
                         metadata: Optional[Dict[str, Any]] = None) -> None:
        """Save a conversation with metadata."""
        try:
            metadata_json = json.dumps(metadata) if metadata else '{}'
            
            self.cursor.execute('''
                INSERT INTO conversations (id, query, response, metadata)
                VALUES (?, ?, ?, ?)
            ''', (conversation_id, query, response, metadata_json))
            
            self.conn.commit()
            logger.info(f"Saved conversation {conversation_id}")
            
        except Exception as e:
            logger.error(f"Error saving conversation: {str(e)}")
            raise
    
    def save_feedback(self, conversation_id: str, feedback: str, rating: int) -> None:
        """Save feedback for a conversation."""
        try:
            self.cursor.execute('''
                INSERT INTO feedback (conversation_id, feedback, rating)
                VALUES (?, ?, ?)
            ''', (conversation_id, feedback, rating))
            
            self.conn.commit()
            logger.info(f"Saved feedback for conversation {conversation_id}")
            
        except Exception as e:
            logger.error(f"Error saving feedback: {str(e)}")
            raise
    
    def close(self):
        """Close database connection."""
        self.conn.close() 