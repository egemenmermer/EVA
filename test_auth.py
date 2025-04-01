#!/usr/bin/env python3
"""
Test script to verify authentication flow between frontend, agent, and backend.
"""

import requests
import json
import time
import uuid

# Configuration
BACKEND_URL = "http://localhost:8443"
AGENT_URL = "http://localhost:5001"
EMAIL = "egemenmermer@gmail.com"
PASSWORD = "12345678"
TEST_QUERY = "Does AI require ethical oversight?"

def print_section(title):
    """Print a section header."""
    print("\n" + "="*80)
    print(f" {title} ".center(80, "="))
    print("="*80 + "\n")

def test_backend_health():
    """Test the backend health endpoint."""
    print_section("Testing Backend Health")
    
    try:
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=5)
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def test_agent_health():
    """Test the agent health endpoint."""
    print_section("Testing Agent Health")
    
    try:
        response = requests.get(f"{AGENT_URL}/api/health", timeout=5)
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def get_auth_token():
    """Get an authentication token from the backend."""
    print_section("Obtaining Auth Token")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/v1/auth/login", 
            json={"email": EMAIL, "password": PASSWORD},
            timeout=5
        )
        print(f"Status code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error response: {response.text}")
            return None
        
        data = response.json()
        token = data.get("accessToken")
        
        if token:
            # Format token for display (redacted)
            token_display = token[:12] + "..." + token[-5:] if len(token) > 17 else token
            print(f"Token received: {token_display}")
            print(f"Token length: {len(token)}")
            
            # Check token format
            if not token.startswith("Bearer "):
                formatted_token = f"Bearer {token}"
                print(f"Adding 'Bearer ' prefix")
                token = formatted_token
            
            return token
        else:
            print("No token received in response")
            return None
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def test_agent_message(token, conversation_id=None):
    """Test sending a message to the agent."""
    print_section("Testing Agent Message")
    
    if not token:
        print("No token available, skipping test")
        return False, None
    
    try:
        # Generate a proper UUID for this test if none is provided
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
            print(f"Generated conversation ID: {conversation_id}")
        else:
            print(f"Using provided conversation ID: {conversation_id}")
        
        # Send message to agent
        headers = {
            "Content-Type": "application/json",
            "Authorization": token,
            "Accept": "application/json"
        }
        
        payload = {
            "conversationId": conversation_id,
            "userQuery": TEST_QUERY
        }
        
        print("Sending request to agent...")
        print(f"Headers: {json.dumps({'Content-Type': headers['Content-Type'], 'Accept': headers['Accept'], 'Authorization': headers['Authorization'][:20] + '...'}, indent=2)}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        start_time = time.time()
        response = requests.post(
            f"{AGENT_URL}/api/v1/conversation/message",
            json=payload,
            headers=headers,
            timeout=30  # Longer timeout for AI processing
        )
        end_time = time.time()
        
        print(f"Status code: {response.status_code}")
        print(f"Response time: {end_time - start_time:.2f} seconds")
        
        if response.status_code != 200:
            print(f"Error response: {response.text}")
            return False, None
        
        # Parse response
        data = response.json()
        
        # Check if we got messages
        if "messages" in data:
            messages = data["messages"]
            print(f"Received {len(messages)} messages")
            
            # Check for warning
            if "warning" in data and data["warning"]:
                print(f"Warning: {data['warning']}")
            
            # Print the assistant's response
            for msg in messages:
                if msg.get("role") == "assistant":
                    content = msg.get("content", "")
                    print(f"\nAssistant response: {content[:150]}..." if len(content) > 150 else content)
                    return True, conversation_id
        else:
            print("No messages in response")
            return False, None
    except Exception as e:
        print(f"Error: {str(e)}")
        return False, None
        
def verify_backend_message(token, conversation_id):
    """Verify that messages were saved to the backend."""
    print_section("Verifying Backend Messages")
    
    if not token:
        print("No token available, skipping test")
        return False
    
    try:
        print(f"Checking messages for conversation: {conversation_id}")
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": token,
            "Accept": "application/json"
        }
        
        response = requests.get(
            f"{BACKEND_URL}/api/v1/conversation/message/{conversation_id}",
            headers=headers,
            timeout=5
        )
        
        print(f"Status code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error response: {response.text}")
            return False
        
        data = response.json()
        
        if isinstance(data, list):
            print(f"Found {len(data)} messages in backend")
            
            # Print summary of messages
            for i, msg in enumerate(data):
                if "userQuery" in msg:
                    print(f"Message {i+1}: User query: {msg['userQuery']}")
                if "agentResponse" in msg:
                    response_preview = msg['agentResponse'][:50] + "..." if len(msg['agentResponse']) > 50 else msg['agentResponse']
                    print(f"Message {i+1}: Agent response: {response_preview}")
            
            return len(data) > 0
        else:
            print("Unexpected response format from backend")
            print(f"Response: {data}")
            return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def create_conversation(token):
    """Create a conversation in the backend."""
    print_section("Creating Conversation")
    
    if not token:
        print("No token available, skipping test")
        return None
    
    try:
        # Create a conversation in the backend
        headers = {
            "Content-Type": "application/json",
            "Authorization": token,
            "Accept": "application/json"
        }
        
        payload = {
            "title": "Test Conversation",
            "managerType": "PUPPETEER"
        }
        
        print("Sending create conversation request...")
        response = requests.post(
            f"{BACKEND_URL}/api/v1/conversation",
            json=payload,
            headers=headers,
            timeout=5
        )
        
        print(f"Status code: {response.status_code}")
        
        if response.status_code != 201 and response.status_code != 200:
            print(f"Error response: {response.text}")
            return None
        
        data = response.json()
        conversation_id = data.get("conversationId")
        
        if conversation_id:
            print(f"Created conversation with ID: {conversation_id}")
            return conversation_id
        else:
            print("No conversation ID received in response")
            return None
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def main():
    """Run the full test suite."""
    print_section("Starting Authentication Test")
    
    # Test backend health
    if not test_backend_health():
        print("Backend health check failed, aborting")
        return
    
    # Test agent health
    if not test_agent_health():
        print("Agent health check failed, aborting")
        return
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        print("Failed to get authentication token, aborting")
        return
    
    # Create a conversation in the backend
    conversation_id = create_conversation(token)
    if not conversation_id:
        print("Failed to create conversation, using a random UUID instead")
        conversation_id = str(uuid.uuid4())
    
    # Test agent message with the created conversation ID
    success, _ = test_agent_message(token, conversation_id)
    if not success:
        print("Failed to send message to agent")
    else:
        # Wait for the message to be saved in the backend
        print("\nWaiting 5 seconds for message to be saved to backend...")
        time.sleep(5)
        
        # Verify backend messages
        if not verify_backend_message(token, conversation_id):
            print("Failed to verify messages in backend")
        else:
            print("\nFull authentication flow test completed successfully!")

if __name__ == "__main__":
    main() 