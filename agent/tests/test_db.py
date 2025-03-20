"""
Tests for the database connector module.
"""

import os
import sys
import unittest
import uuid
from datetime import datetime
from unittest.mock import patch

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db_connector import DatabaseConnector, metadata, conversations, conversation_contents, feedback_table

class TestDatabaseConnector(unittest.TestCase):
    """Test cases for the DatabaseConnector class."""
    
    @patch.dict(os.environ, {
        'POSTGRES_USER': 'postgres',
        'POSTGRES_PASSWORD': 'Asdqweres123321',
        'POSTGRES_DB': 'ethical-agent',
        'POSTGRES_HOST': 'localhost',
        'POSTGRES_PORT': '5432',
        'POSTGRES_SSL_MODE': 'disable'
    })
    def setUp(self):
        """Set up test fixtures."""
        self.db = DatabaseConnector()
        self.test_id = uuid.uuid4()
        self.user_id = uuid.uuid4()
        
    def tearDown(self):
        """Clean up after tests."""
        # Delete test data
        try:
            self.db.engine.execute(
                feedback_table.delete().where(feedback_table.c.conversation_id == self.test_id)
            )
            self.db.engine.execute(
                conversation_contents.delete().where(conversation_contents.c.conversation_id == self.test_id)
            )
            self.db.engine.execute(
                conversations.delete().where(conversations.c.id == self.test_id)
            )
        except Exception as e:
            print(f"Error in tearDown: {e}")
    
    def test_save_conversation(self):
        """Test saving a conversation."""
        # Test data
        conversation_id = str(self.test_id)
        user_id = str(self.user_id)
        query = "Test query"
        response = "Test response"
        
        # Save conversation
        message_id = self.db.save_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            role="DILUTER",
            query=query,
            response=response
        )
        
        # Verify message was saved
        self.assertIsNotNone(message_id)
        
        # Query to verify
        result = self.db.engine.execute(
            conversation_contents.select().where(conversation_contents.c.conversation_id == self.test_id)
        ).fetchone()
        
        # Assert values match
        self.assertIsNotNone(result)
        self.assertEqual(result['user_query'], query)
        self.assertEqual(result['agent_response'], response)
    
    def test_get_conversation_history(self):
        """Test getting conversation history."""
        # Insert test conversation
        conversation_id = str(self.test_id)
        user_id = str(self.user_id)
        
        # Save multiple messages
        self.db.save_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            role="DILUTER",
            query="Query 1",
            response="Response 1"
        )
        
        self.db.save_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            role="DILUTER",
            query="Query 2",
            response="Response 2"
        )
        
        # Get history
        history = self.db.get_conversation_history(conversation_id)
        
        # Verify length and contents
        self.assertEqual(len(history), 2)
        
        # Check contents of messages (order may vary due to db)
        queries = [msg['userQuery'] for msg in history]
        responses = [msg['agentResponse'] for msg in history]
        
        self.assertIn("Query 1", queries)
        self.assertIn("Query 2", queries)
        self.assertIn("Response 1", responses)
        self.assertIn("Response 2", responses)
    
    def test_save_feedback(self):
        """Test saving feedback."""
        # Insert test conversation first
        conversation_id = str(self.test_id)
        user_id = str(self.user_id)
        
        self.db.save_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
            role="DILUTER",
            query="Feedback test query",
            response="Feedback test response"
        )
        
        # Save feedback
        rating = 5
        feedback_text = "Great advice!"
        feedback_id = self.db.save_feedback(
            conversation_id=conversation_id,
            rating=rating,
            feedback=feedback_text
        )
        
        # Verify feedback was saved
        self.assertIsNotNone(feedback_id)
        
        # Query to verify
        result = self.db.engine.execute(
            feedback_table.select().where(feedback_table.c.conversation_id == self.test_id)
        ).fetchone()
        
        # Assert values match
        self.assertIsNotNone(result)
        self.assertEqual(result['rating'], rating)
        self.assertEqual(result['user_feedback'], feedback_text)

if __name__ == '__main__':
    unittest.main() 