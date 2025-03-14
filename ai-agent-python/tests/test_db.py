import os
import sys
from pathlib import Path
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from database.db_connector import DatabaseConnector, Base, Conversation, Feedback

@pytest.fixture(scope="function")
def db_connector(test_db_url):
    """Create a test database connector."""
    # Create engine and tables
    engine = create_engine(test_db_url)
    Base.metadata.create_all(engine)
    
    # Create connector with test engine
    connector = DatabaseConnector()
    connector.engine = engine
    connector.session = sessionmaker(bind=engine)()
    
    yield connector
    
    # Cleanup
    Base.metadata.drop_all(engine)

def test_save_conversation(db_connector):
    """Test saving conversation to database."""
    # Test data
    conversation_id = "test-conv-1"
    role = "software_engineer"
    query = "What are the ethical implications of AI?"
    response = "Here are the ethical considerations..."
    context = [{"source": "test.pdf", "text": "Test context"}]
    
    # Save conversation
    query_id = db_connector.save_conversation(
        conversation_id=conversation_id,
        role=role,
        query=query,
        response=response,
        context=context
    )
    
    # Verify saved data
    conversation = db_connector.session.query(Conversation).filter_by(id=query_id).first()
    assert conversation is not None
    assert conversation.conversation_id == conversation_id
    assert conversation.role == role
    assert conversation.query == query
    assert conversation.response == response
    assert conversation.context == context

def test_get_conversation_history(db_connector):
    """Test retrieving conversation history."""
    # Save multiple conversations
    conversation_id = "test-conv-2"
    for i in range(3):
        db_connector.save_conversation(
            conversation_id=conversation_id,
            role="software_engineer",
            query=f"Query {i}",
            response=f"Response {i}"
        )
    
    # Get history
    history = db_connector.get_conversation_history(conversation_id)
    
    # Verify history
    assert len(history) == 3
    for i, conv in enumerate(reversed(history)):
        assert conv['query'] == f"Query {i}"
        assert conv['response'] == f"Response {i}"

def test_save_feedback(db_connector):
    """Test saving feedback."""
    # Create conversation first
    conversation_id = "test-conv-3"
    query_id = db_connector.save_conversation(
        conversation_id=conversation_id,
        role="software_engineer",
        query="Test query",
        response="Test response"
    )
    
    # Save feedback
    feedback_id = db_connector.save_feedback(
        conversation_id=conversation_id,
        query_id=query_id,
        rating=5,
        comment="Very helpful"
    )
    
    # Verify feedback
    feedback = db_connector.session.query(Feedback).filter_by(id=feedback_id).first()
    assert feedback is not None
    assert feedback.conversation_id == conversation_id
    assert feedback.query_id == query_id
    assert feedback.rating == 5
    assert feedback.comment == "Very helpful"

def test_error_handling(db_connector):
    """Test database error handling."""
    # Test invalid conversation save
    with pytest.raises(Exception):
        db_connector.save_conversation(
            conversation_id=None,
            role=None,
            query=None,
            response=None
        )
    
    # Test invalid feedback save
    with pytest.raises(Exception):
        db_connector.save_feedback(
            conversation_id=None,
            query_id=None,
            rating=None
        )
    
    # Test getting history for non-existent conversation
    history = db_connector.get_conversation_history("non-existent-id")
    assert history == []

@pytest.mark.integration
def test_database_connection(test_db_url):
    """Test database connection."""
    engine = create_engine(test_db_url)
    try:
        # Test connection
        with engine.connect() as conn:
            result = conn.execute("SELECT 1")
            assert list(result)[0][0] == 1
    except Exception as e:
        pytest.fail(f"Database connection failed: {str(e)}")

if __name__ == "__main__":
    pytest.main([__file__]) 