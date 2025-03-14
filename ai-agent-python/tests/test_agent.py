import os
import sys
from pathlib import Path
import pytest
from unittest.mock import Mock, patch
import json

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from agents.ethical_agent import EthicalAgent

@pytest.fixture
def mock_config():
    """Fixture for test configuration."""
    return {
        'model_name': 'meta-llama/Llama-2-8b-chat-hf',
        'api_token': 'test_token',
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
    agent = EthicalAgent(mock_config)
    assert agent.config == mock_config
    assert agent.cache_dir == mock_config['cache_dir']
    assert agent.user_role is None
    assert agent.conversation_id is not None

def test_start_conversation():
    """Test conversation start."""
    agent = EthicalAgent({'api_token': 'test'})
    welcome_msg = agent.start_conversation()
    
    # Check if welcome message contains role information
    assert "Welcome" in welcome_msg
    assert "role" in welcome_msg.lower()
    
    # Check if all roles are mentioned
    for role in agent.VALID_ROLES.keys():
        assert role.replace('_', ' ').title() in welcome_msg

@pytest.mark.parametrize("role,expected", [
    ("software_engineer", True),
    ("project_manager", True),
    ("invalid_role", False),
    ("", False)
])
def test_set_user_role(role, expected):
    """Test setting user roles."""
    agent = EthicalAgent({'api_token': 'test'})
    success, message = agent.set_user_role(role)
    
    assert success == expected
    if success:
        assert agent.user_role == role
        assert "focus on" in message.lower()
        for focus_area in agent.VALID_ROLES[role]['focus']:
            assert focus_area in message
    else:
        assert "don't recognize that role" in message.lower()

@patch('agents.ethical_agent.HybridRetriever')
@patch('agents.ethical_agent.LlamaModel')
def test_process_query(mock_llama, mock_retriever, mock_config, mock_context):
    """Test query processing."""
    # Setup mocks
    mock_retriever_instance = Mock()
    mock_retriever_instance.hybrid_search.return_value = mock_context
    mock_retriever.return_value = mock_retriever_instance
    
    mock_llama_instance = Mock()
    mock_llama_instance.generate_ethical_response.return_value = "Test response"
    mock_llama.return_value = mock_llama_instance
    
    # Create agent and set role
    agent = EthicalAgent(mock_config)
    agent.set_user_role("software_engineer")
    
    # Test query processing
    query = "What are the ethical implications of using facial recognition?"
    response = agent.process_query(query)
    
    # Verify response
    assert response == "Test response"
    
    # Verify retriever was called
    mock_retriever_instance.hybrid_search.assert_called_once_with(query)
    
    # Verify model was called with correct parameters
    mock_llama_instance.generate_ethical_response.assert_called_once_with(
        query=query,
        context=mock_context,
        role=agent.user_role,
        focus_areas=agent.user_context['focus']
    )

def test_process_query_no_role():
    """Test query processing without setting role."""
    agent = EthicalAgent({'api_token': 'test'})
    response = agent.process_query("Test query")
    assert "tell me your role first" in response.lower()

@patch('agents.ethical_agent.DatabaseConnector')
def test_save_conversation(mock_db, mock_config, mock_context):
    """Test conversation saving."""
    # Setup mock
    mock_db_instance = Mock()
    mock_db.return_value = mock_db_instance
    
    # Create agent and process query
    agent = EthicalAgent(mock_config)
    agent.set_user_role("software_engineer")
    agent.process_query("Test query")
    
    # Verify database calls
    mock_db_instance.save_conversation.assert_called_once()
    call_args = mock_db_instance.save_conversation.call_args[1]
    assert call_args['conversation_id'] == agent.conversation_id
    assert call_args['role'] == agent.user_role

def test_error_handling(mock_config):
    """Test error handling in agent."""
    agent = EthicalAgent(mock_config)
    
    # Test with invalid role
    success, message = agent.set_user_role("invalid_role")
    assert not success
    assert "don't recognize that role" in message.lower()
    
    # Test with empty query
    response = agent.process_query("")
    assert "unable to provide guidance" in response.lower()

if __name__ == "__main__":
    pytest.main([__file__]) 