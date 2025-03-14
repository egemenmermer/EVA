#!/usr/bin/env python3
import os
from dotenv import load_dotenv
import requests

def check_token():
    """Check if Hugging Face token is valid."""
    print("\nChecking Hugging Face Token")
    print("=" * 40)
    
    # Load token from .env
    load_dotenv()
    token = os.getenv('HUGGINGFACE_TOKEN')
    
    if not token:
        print("❌ No HUGGINGFACE_TOKEN found in .env file")
        print("\nPlease add your token to .env file:")
        print('HUGGINGFACE_TOKEN="your_token_here"')
        return False
    
    # Test token
    headers = {"Authorization": f"Bearer {token}"}
    api_url = "https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b-chat-hf"
    
    try:
        response = requests.get(api_url, headers=headers)
        if response.status_code == 200:
            print("✅ Token is valid")
            return True
        elif response.status_code == 401:
            print("❌ Invalid token")
            return False
        else:
            print(f"❌ Error checking token: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    check_token()