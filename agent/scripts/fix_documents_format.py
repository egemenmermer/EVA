#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

def fix_document_format():
    """Convert the nested document structure to a flat array format."""
    try:
        print("\nDocument Format Converter")
        print("=" * 40)
        
        # Check if documents.json exists
        docs_path = "data/processed/documents.json"
        if not os.path.exists(docs_path):
            print(f"❌ Error: {docs_path} not found!")
            return False
        
        # Create backup
        backup_path = f"{docs_path}.backup"
        print(f"Creating backup at {backup_path}")
        Path(docs_path).rename(backup_path)
        
        # Load the document
        print("Loading document...")
        with open(backup_path, 'r', encoding='utf-8') as f:
            doc_data = json.load(f)
        
        # Check if it's already in the right format (flat array)
        if isinstance(doc_data, list):
            print("Document is already in the correct format (flat array).")
            # Restore the backup since we don't need to change anything
            Path(backup_path).rename(docs_path)
            return True
        
        # Convert to flat array
        print("Converting to flat array format...")
        flat_docs = []
        
        # Add guidelines
        if "guidelines" in doc_data and isinstance(doc_data["guidelines"], list):
            print(f"Processing {len(doc_data['guidelines'])} guidelines...")
            flat_docs.extend(doc_data["guidelines"])
        
        # Add case studies
        if "case_studies" in doc_data and isinstance(doc_data["case_studies"], list):
            print(f"Processing {len(doc_data['case_studies'])} case studies...")
            flat_docs.extend(doc_data["case_studies"])
        
        # Save the converted document
        print(f"Saving {len(flat_docs)} documents to {docs_path}...")
        with open(docs_path, 'w', encoding='utf-8') as f:
            json.dump(flat_docs, f, ensure_ascii=False, indent=2)
        
        print("\n✅ Document format conversion complete!")
        print(f"Original file backed up at: {backup_path}")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        # Try to restore backup if something went wrong
        if os.path.exists(backup_path) and not os.path.exists(docs_path):
            print("Restoring backup...")
            Path(backup_path).rename(docs_path)
        return False

if __name__ == "__main__":
    success = fix_document_format()
    sys.exit(0 if success else 1) 