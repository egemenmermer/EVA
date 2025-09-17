import logging
from typing import List, Dict, Optional
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

class TextChunker:
    """Handle text chunking for document processing."""
    
    def __init__(self, chunk_size: int = 512, overlap: int = 50):
        """Initialize text chunker."""
        self.chunk_size = chunk_size
        self.overlap = overlap
        # Compile regex patterns once
        self.sentence_pattern = re.compile(r'[.!?]+\s+')

    def chunk_text(self, text: str, metadata: Optional[Dict] = None) -> List[Dict]:
        """Split text into overlapping chunks."""
        try:
            # Fast sentence splitting using regex
            sentences = [s.strip() for s in self.sentence_pattern.split(text) if s.strip()]
            
            # Pre-calculate sentence lengths
            sentence_lengths = [len(s.split()) for s in sentences]
            
            chunks = []
            current_chunk = []
            current_length = 0
            
            for i, (sentence, length) in enumerate(zip(sentences, sentence_lengths)):
                if current_length + length > self.chunk_size:
                    # Save current chunk if it exists
                    if current_chunk:
                        chunks.append({
                            "text": " ".join(current_chunk),
                            "metadata": metadata or {}
                        })
                    
                    # Start new chunk with overlap
                    overlap_point = max(0, len(current_chunk) - self.overlap)
                    current_chunk = current_chunk[overlap_point:] + [sentence]
                    current_length = sum(len(s.split()) for s in current_chunk)
                else:
                    current_chunk.append(sentence)
                    current_length += length
            
            # Add final chunk
            if current_chunk:
                chunks.append({
                    "text": " ".join(current_chunk),
                    "metadata": metadata or {}
                })
            
            return chunks
            
        except Exception as e:
            logger.error(f"Error chunking text: {str(e)}")
            return [{"text": text, "metadata": metadata or {}}]

def process_document(doc: Dict, chunk_size: int = 512, overlap: int = 50) -> List[Dict]:
    """Process a single document into chunks.
    
    Args:
        doc (Dict): Document to process with 'text' field
        chunk_size (int): Size of each chunk
        overlap (int): Overlap between chunks
        
    Returns:
        List[Dict]: List of chunks with text and metadata
    """
    try:
        if not isinstance(doc, dict) or 'text' not in doc:
            logger.error("Invalid document format")
            return []
            
        chunker = TextChunker(chunk_size, overlap)
        return chunker.chunk_text(
            text=doc['text'],
            metadata={
                'source': doc.get('source', 'unknown'),
                'type': doc.get('type', 'document'),
                'path': doc.get('path', '')
            }
        )
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        return []

def chunk_documents(docs: List[Dict], chunk_size: int = 512, overlap: int = 50, max_workers: int = 4) -> List[Dict]:
    """Process multiple documents in parallel."""
    try:
        all_chunks = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all documents for processing
            future_to_doc = {
                executor.submit(process_document, doc, chunk_size, overlap): doc
                for doc in docs
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_doc):
                try:
                    chunks = future.result()
                    all_chunks.extend(chunks)
                except Exception as e:
                    doc = future_to_doc[future]
                    logger.error(f"Error processing document {doc.get('source', 'unknown')}: {str(e)}")
        
        return all_chunks
        
    except Exception as e:
        logger.error(f"Error in chunk_documents: {str(e)}")
        return [] 