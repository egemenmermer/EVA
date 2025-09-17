import os
import json
from typing import List, Dict
import logging
from pathlib import Path
from data_processing.pdf_processor import PDFProcessor

logger = logging.getLogger(__name__)

class DataLoader:
    """Load and process ethical guidelines and case studies."""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.pdf_processor = PDFProcessor(
            raw_dir=str(self.data_dir / "raw"),
            processed_dir=str(self.data_dir / "processed")
        )
        
    def load_guidelines(self) -> List[Dict]:
        """Load ethical guidelines."""
        try:
            # Check if processed documents exist
            processed_file = self.data_dir / "processed" / "documents.json"
            if processed_file.exists():
                with open(processed_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get("guidelines", [])
            
            # If not processed, process all documents
            logger.info("Processing documents...")
            all_documents = self.pdf_processor.process_all_documents()
            return all_documents.get("guidelines", [])
            
        except Exception as e:
            logger.error(f"Error loading guidelines: {str(e)}")
            return []
            
    def load_case_studies(self) -> List[Dict]:
        """Load case studies."""
        try:
            # Check if processed documents exist
            processed_file = self.data_dir / "processed" / "documents.json"
            if processed_file.exists():
                with open(processed_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get("case_studies", [])
            
            # If not processed, process all documents
            logger.info("Processing documents...")
            all_documents = self.pdf_processor.process_all_documents()
            return all_documents.get("case_studies", [])
            
        except Exception as e:
            logger.error(f"Error loading case studies: {str(e)}")
            return []
            
    def load_all_documents(self) -> Dict[str, List[Dict]]:
        """Load all documents."""
        try:
            # Check if processed documents exist
            processed_file = self.data_dir / "processed" / "documents.json"
            if processed_file.exists():
                with open(processed_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            
            # If not processed, process all documents
            logger.info("Processing documents...")
            return self.pdf_processor.process_all_documents()
            
        except Exception as e:
            logger.error(f"Error loading all documents: {str(e)}")
            return {"guidelines": [], "case_studies": []} 