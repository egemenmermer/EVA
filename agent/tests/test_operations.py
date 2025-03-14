import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from dotenv import load_dotenv
from database.db_connector import DatabaseConnector
from datetime import datetime

load_dotenv()

def test_database_operations():
    try:
        # Initialize database connector
        db = DatabaseConnector()
        
        # Test conversation saving
        test_conversation_id = f"test-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        query_id = db.save_conversation(
            conversation_id=test_conversation_id,
            role="software_engineer",
            query="What are the ethical considerations for using facial recognition?",
            response="Based on ethical guidelines...",
            context=[{
                "source": "ieee_ethics.pdf",
                "text": "Privacy and consent are fundamental..."
            }]
        )
        print(f"Successfully saved conversation with ID: {query_id}")
        
        # Test retrieving conversation history
        history = db.get_conversation_history(test_conversation_id)
        print(f"Retrieved conversation history: {history}")
        
        # Test feedback saving
        feedback_id = db.save_feedback(
            conversation_id=test_conversation_id,
            query_id=query_id,
            rating=5,
            comment="Very helpful response"
        )
        print(f"Successfully saved feedback with ID: {feedback_id}")
        
    except Exception as e:
        print(f"Error during database operations: {str(e)}")

if __name__ == "__main__":
    test_database_operations() 