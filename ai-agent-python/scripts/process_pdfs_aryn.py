#!/usr/bin/env python3
import os
import sys
import logging
from pathlib import Path
from tqdm import tqdm
import json
import gc

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

# Configure minimal logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

def process_pdf_with_aryn(pdf_path: str, output_dir: str) -> dict:
    """Process a single PDF using Aryn SDK."""
    try:
        from aryn_sdk.partition import partition_file
        
        print(f"\nProcessing: {pdf_path}")
        
        # Process PDF with minimal memory settings
        with open(pdf_path, "rb") as f:
            data = partition_file(
                f,
                extract_table_structure=False,  # Disable table extraction to save memory
                use_ocr=False,                  # Disable OCR to save memory
                extract_images=False,           # Disable image extraction to save memory
                threshold=0.35
            )
        
        # Extract text from elements
        text = ""
        for element in data.get('elements', []):
            if element.get('type') == 'text':
                text += element.get('text', '') + "\n"
        
        # Create document metadata
        doc = {
            "text": text.strip(),
            "source": os.path.basename(pdf_path),
            "type": "guideline" if "guidelines" in pdf_path else "case_study",
            "path": pdf_path
        }
        
        return doc
        
    except Exception as e:
        logger.error(f"Error processing {pdf_path}: {str(e)}")
        return None

def main():
    """Process PDFs using Aryn SDK with minimal memory usage."""
    try:
        print("\nLow Memory PDF Processor (Aryn SDK)")
        print("=" * 40)
        
        # Create necessary directories
        os.makedirs("data/processed", exist_ok=True)
        
        # Process guidelines
        print("\nProcessing guidelines...")
        guidelines = []
        guidelines_dir = "data/raw/guidelines"
        for pdf_file in tqdm(os.listdir(guidelines_dir)):
            if pdf_file.endswith('.pdf'):
                pdf_path = os.path.join(guidelines_dir, pdf_file)
                doc = process_pdf_with_aryn(pdf_path, "data/processed")
                if doc:
                    guidelines.append(doc)
                gc.collect()  # Force garbage collection after each file
        
        # Process case studies
        print("\nProcessing case studies...")
        case_studies = []
        case_studies_dir = "data/raw/case_studies"
        for pdf_file in tqdm(os.listdir(case_studies_dir)):
            if pdf_file.endswith('.pdf'):
                pdf_path = os.path.join(case_studies_dir, pdf_file)
                doc = process_pdf_with_aryn(pdf_path, "data/processed")
                if doc:
                    case_studies.append(doc)
                gc.collect()  # Force garbage collection after each file
        
        # Combine all documents
        all_documents = guidelines + case_studies
        
        # Save processed documents
        print("\nSaving processed data...")
        output_path = "data/processed/documents.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(all_documents, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ Processing complete!")
        print(f"Processed {len(guidelines)} guidelines and {len(case_studies)} case studies")
        print(f"Total documents: {len(all_documents)}")
        print(f"Output saved to: {output_path}")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 