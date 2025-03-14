#!/usr/bin/env python3
import os
import sys
import logging
from pathlib import Path
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_documents_file(docs_path: str) -> bool:
    """Check if documents.json is valid and has the expected structure."""
    try:
        print(f"\nChecking {docs_path}...")
        
        if not os.path.exists(docs_path):
            print("❌ documents.json not found!")
            return False
            
        # Try to load and validate JSON
        with open(docs_path, 'r', encoding='utf-8') as f:
            documents = json.load(f)
            
        # Check if it's a list
        if not isinstance(documents, list):
            print("❌ Error: documents.json is not a list")
            return False
            
        # Check document count
        doc_count = len(documents)
        print(f"Found {doc_count} documents")
        
        # Verify structure of first document
        if doc_count > 0:
            first_doc = documents[0]
            if not isinstance(first_doc, dict):
                print("❌ Error: Documents are not in dictionary format")
                return False
            
            # Check required fields
            required_fields = ['text']  # Add other required fields if needed
            missing_fields = [field for field in required_fields if field not in first_doc]
            
            if missing_fields:
                print(f"❌ Error: Missing required fields: {', '.join(missing_fields)}")
                return False
            
            print("✅ Document structure is valid")
            
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON format - {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Error checking documents: {str(e)}")
        return False

def main():
    """Check the integrity of documents.json."""
    print("Documents Check Tool")
    print("=" * 40)
    
    docs_path = "data/processed/documents.json"
    
    if check_documents_file(docs_path):
        print("\n✅ documents.json is valid!")
        return 0
    else:
        print("\n❌ documents.json check failed")
        if os.path.exists("data/processed/documents.json.original"):
            print("\nTip: You have a backup at documents.json.original")
            print("You can restore it with:")
            print("cp data/processed/documents.json.original data/processed/documents.json")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 