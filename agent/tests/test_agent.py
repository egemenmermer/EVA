import os
import sys
from pathlib import Path
import pytest
from unittest.mock import Mock, patch
import json

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from agents.langchain_agent import LangChainAgent

@pytest.fixture
def mock_config():
    """Fixture for test configuration."""
    return {
        'model_name': 'gpt-4',
        'openai_api_key': 'test_token',
        'cache_dir': 'test_cache'
    }

@pytest.fixture
def mock_context():
    """Fixture for test context."""
    return [{
        'text': 'Test ethical guideline',
        'source': 'test_guideline.pdf',
        'type': 'guideline'
    }]

def test_agent_initialization(mock_config):
    """Test agent initialization."""
    agent = LangChainAgent(mock_config)
    assert agent.config == mock_config
    assert agent.cache_dir == mock_config['cache_dir']
    assert agent.user_role is None
    assert agent.conversation_id is not None

def test_start_conversation():
    """Test conversation start."""
    agent = LangChainAgent({'openai_api_key': 'test'})
    welcome_msg = agent.start_conversation()
    
    # Check if welcome message contains expected content
    assert "Welcome" in welcome_msg
    assert "ethical" in welcome_msg.lower()
    assert "help you" in welcome_msg

@pytest.mark.parametrize("role,expected", [
    ("software_engineer", True),
    ("project_manager", True),
    ("invalid_role", False),
    ("", False)
])
def test_set_user_role(role, expected):
    """Test setting user roles."""
    agent = LangChainAgent({'openai_api_key': 'test'})
    success, message = agent.set_user_role(role)
    
    assert success == expected
    if success:
        assert agent.user_role == role
    else:
        assert "Role set to" not in message

@patch('agents.langchain_agent.OpenAIEmbeddings')
@patch('agents.langchain_agent.ChatOpenAI')
def test_process_query(mock_chat, mock_embeddings, mock_config, mock_context):
    """Test query processing."""
    # Setup mocks
    mock_chat_instance = Mock()
    mock_chat_instance.predict.return_value = "Test response"
    mock_chat.return_value = mock_chat_instance
    
    mock_embeddings_instance = Mock()
    mock_embeddings.return_value = mock_embeddings_instance
    
    # Create agent and set role
    agent = LangChainAgent(mock_config)
    agent.set_user_role("software_engineer")
    
    # Test query processing
    query = "What are the ethical implications of using facial recognition?"
    response = agent.process_query(query)
    
    # Verify response
    assert isinstance(response, str)
    assert len(response) > 0

def test_process_query_no_role():
    """Test query processing without setting role."""
    agent = LangChainAgent({'openai_api_key': 'test'})
    response = agent.process_query("Test query")
    assert isinstance(response, str)
    assert len(response) > 0

def test_error_handling(mock_config):
    """Test error handling in agent."""
    agent = LangChainAgent(mock_config)
    
    # Test with invalid role
    success, message = agent.set_user_role("invalid_role")
    assert not success
    
    # Test with empty query
    response = agent.process_query("")
    assert isinstance(response, str)
    assert len(response) > 0

if __name__ == "__main__":
    pytest.main([__file__]) 