import os
import logging
from pathlib import Path
from typing import Dict, List, Optional
import PyPDF2
from tqdm import tqdm

logger = logging.getLogger(__name__)

class PDFProcessor:
    """Handle PDF document processing and text extraction."""
    
    def __init__(self, raw_dir: str = "data/raw", processed_dir: str = "data/processed"):
        """Initialize PDF processor."""
        self.raw_dir = Path(raw_dir)
        self.processed_dir = Path(processed_dir)
        self.guidelines_dir = self.raw_dir / "guidelines"
        self.case_studies_dir = self.raw_dir / "case_studies"
        
        # Ensure processed directory exists
        os.makedirs(self.processed_dir, exist_ok=True)
        
    def process_all_documents(self) -> Dict[str, List[Dict]]:
        """Process all PDF documents in raw directories."""
        try:
            # Process guidelines
            logger.info("Processing guidelines...")
            guidelines = self._process_directory(self.guidelines_dir, "guideline")
            
            # Process case studies
            logger.info("Processing case studies...")
            case_studies = self._process_directory(self.case_studies_dir, "case_study")
            
            # Combine results
            all_documents = {
                "guidelines": guidelines,
                "case_studies": case_studies
            }
            
            # Save processed documents
            self._save_processed_documents(all_documents)
            
            return all_documents
            
        except Exception as e:
            logger.error(f"Error processing documents: {str(e)}")
            return {"guidelines": [], "case_studies": []}
    
    def _process_directory(self, directory: Path, doc_type: str) -> List[Dict]:
        """Process all PDF files in a directory."""
        documents = []
        if not directory.exists():
            logger.warning(f"Directory not found: {directory}")
            return documents
            
        pdf_files = list(directory.glob("*.pdf"))
        logger.info(f"Found {len(pdf_files)} PDF files in {directory}")
        print(f"\nProcessing {len(pdf_files)} {doc_type} files from {directory}")
        
        for pdf_file in tqdm(pdf_files, desc=f"Processing {doc_type}s"):
            try:
                logger.info(f"Processing file: {pdf_file}")
                text = self._extract_text_from_pdf(pdf_file)
                if text:
                    logger.info(f"Successfully extracted {len(text.split())} words from {pdf_file}")
                    documents.append({
                        "text": text,
                        "source": pdf_file.name,
                        "type": doc_type,
                        "path": str(pdf_file.relative_to(self.raw_dir))
                    })
                else:
                    logger.warning(f"No text extracted from {pdf_file}")
            except Exception as e:
                logger.error(f"Error processing {pdf_file}: {str(e)}")
                
        logger.info(f"Successfully processed {len(documents)} out of {len(pdf_files)} files")
        return documents
    
    def _extract_text_from_pdf(self, pdf_path: Path) -> Optional[str]:
        """Extract text from a PDF file."""
        try:
            text_content = []
            with open(pdf_path, 'rb') as file:
                # Create PDF reader object
                pdf_reader = PyPDF2.PdfReader(file)
                
                # Extract text from each page
                for page in pdf_reader.pages:
                    text = page.extract_text()
                    if text:
                        text_content.append(text.strip())
                        
            # Join all text with newlines
            return "\n".join(text_content)
            
        except Exception as e:
            logger.error(f"Error extracting text from {pdf_path}: {str(e)}")
            return None
            
    def _save_processed_documents(self, documents: Dict[str, List[Dict]]) -> None:
        """Save processed documents to JSON file."""
        try:
            import json
            output_file = self.processed_dir / "documents.json"
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(documents, f, ensure_ascii=False, indent=2)
                
            logger.info(f"Saved processed documents to {output_file}")
            
        except Exception as e:
            logger.error(f"Error saving processed documents: {str(e)}")
            
    def process_single_pdf(self, pdf_path: str) -> Optional[Dict]:
        """Process a single PDF file."""
        try:
            pdf_path = Path(pdf_path)
            if not pdf_path.exists():
                logger.error(f"PDF file not found: {pdf_path}")
                return None
                
            text = self._extract_text_from_pdf(pdf_path)
            if text:
                return {
                    "text": text,
                    "source": pdf_path.name,
                    "type": "document",
                    "path": str(pdf_path)
                }
            return None
            
        except Exception as e:
            logger.error(f"Error processing single PDF {pdf_path}: {str(e)}")
            return None 