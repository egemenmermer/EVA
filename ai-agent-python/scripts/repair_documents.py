#!/usr/bin/env python3
import json
import logging
from pathlib import Path
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def repair_json_file(file_path: str) -> bool:
    """Attempt to repair a corrupted JSON file."""
    try:
        print(f"\nAttempting to repair {file_path}")
        
        # Read the file content up to the error point
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read(71034172)  # Read up to the error char position
        
        # Find the last complete object
        last_complete = content.rfind('}')
        if last_complete == -1:
            print("❌ Could not find a complete JSON object")
            return False
            
        # Trim content to last complete object and add closing bracket
        content = content[:last_complete+1] + ']'
        
        # Try to parse the trimmed content
        try:
            documents = json.loads(content)
            print(f"Successfully parsed {len(documents)} documents")
            
            # Backup original file
            backup_path = file_path + '.broken'
            print(f"Creating backup at {backup_path}")
            Path(file_path).rename(backup_path)
            
            # Save repaired file
            print("Saving repaired file...")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(documents, f, ensure_ascii=False, indent=2)
            
            return True
            
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing JSON: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error processing file: {e}")
        return False

def main():
    """Main repair function."""
    print("JSON Repair Tool")
    print("=" * 40)
    
    # Try original file first
    docs_path = "data/processed/documents.json"
    if not Path(docs_path).exists() and Path(docs_path + '.original').exists():
        print("Using .original file as source")
        docs_path = docs_path + '.original'
    
    if not Path(docs_path).exists():
        print(f"❌ Error: No source file found!")
        return 1
    
    success = repair_json_file(docs_path)
    
    if success:
        print("\n✅ File repaired successfully!")
        # Verify the repaired file
        try:
            with open("data/processed/documents.json", 'r') as f:
                docs = json.load(f)
            print(f"Verified {len(docs)} documents in repaired file")
            return 0
        except:
            print("❌ Verification of repaired file failed")
            return 1
    else:
        print("\n❌ Could not repair file")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 