#!/usr/bin/env python3
import os
import logging
from pathlib import Path
from data_processing.pdf_processor import PDFProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Process PDFs from guidelines and case studies directories."""
    try:
        # Initialize PDF processor
        processor = PDFProcessor(
            raw_dir="data/raw",
            processed_dir="data/processed"
        )
        
        # Process all documents
        print("\nStarting document processing...")
        results = processor.process_all_documents()
        
        # Print summary
        print("\nProcessing Summary:")
        print(f"Guidelines processed: {len(results['guidelines'])}")
        print(f"Case studies processed: {len(results['case_studies'])}")
        print("\nProcessed documents saved to: data/processed/documents.json")
        
    except Exception as e:
        logger.error(f"Error processing documents: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 