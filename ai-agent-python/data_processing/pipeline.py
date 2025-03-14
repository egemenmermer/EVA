import os
import logging
from pathlib import Path
from typing import Dict, List, Optional
import json
from tqdm import tqdm
import numpy as np

from data_processing.pdf_processor import PDFProcessor
from data_processing.chunking import TextChunker
from embeddings.embedding_model import EmbeddingModel
from embeddings.index import FAISSIndex

logger = logging.getLogger(__name__)

class DataPipeline:
    """Pipeline for processing and indexing ethical documents."""
    
    def __init__(self, config: Dict):
        """Initialize pipeline with configuration."""
        self.config = config
        self.data_dir = Path(config.get('data_dir', 'data'))
        self.raw_dir = self.data_dir / 'raw'
        self.processed_dir = self.data_dir / 'processed'
        self.index_dir = Path(config.get('index_dir', 'ethics_index'))
        self.cache_dir = Path(config.get('cache_dir', 'cache'))
        
        # Ensure directories exist
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.index_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize components
        self.pdf_processor = PDFProcessor(
            raw_dir=str(self.raw_dir),
            processed_dir=str(self.processed_dir)
        )
        self.chunker = TextChunker(
            chunk_size=config.get('chunk_size', 512),
            overlap=config.get('overlap', 50)
        )
        self.embedding_model = EmbeddingModel(
            cache_dir=str(self.cache_dir)
        )
        self.index = FAISSIndex(
            dimension=self.embedding_model.dimension
        )
        
    def process_documents(self) -> Dict[str, List[Dict]]:
        """Process all documents through the pipeline."""
        try:
            logger.info("Starting document processing pipeline...")
            
            # Step 1: Extract text from PDFs
            logger.info("Extracting text from PDFs...")
            documents = self.pdf_processor.process_all_documents()
            
            if not documents["guidelines"] and not documents["case_studies"]:
                logger.error("No documents were processed!")
                raise ValueError("No documents found in data/raw directory")
            
            logger.info(f"Processed {len(documents['guidelines'])} guidelines and {len(documents['case_studies'])} case studies")
            
            # Step 2: Chunk documents with progress tracking
            logger.info("Chunking documents...")
            print("\nChunking documents (this may take a few minutes)...")
            chunked_documents = self._chunk_documents(documents)
            
            total_chunks = len(chunked_documents["guidelines"]) + len(chunked_documents["case_studies"])
            logger.info(f"Created {total_chunks} chunks")
            print(f"Created {total_chunks} chunks from documents")
            
            if total_chunks == 0:
                raise ValueError("No chunks were created from the documents")
            
            # Step 3: Create embeddings with progress tracking
            logger.info("Creating embeddings...")
            print("\nCreating embeddings (this may take several minutes)...")
            embeddings = self._create_embeddings(chunked_documents)
            
            # Step 4: Build search index
            logger.info("Building search index...")
            print("\nBuilding search index...")
            self._build_index(chunked_documents, embeddings)
            
            # Step 5: Save processed data
            logger.info("Saving processed data...")
            self._save_processed_data(chunked_documents)
            
            print("\nProcessing complete!")
            return chunked_documents
            
        except Exception as e:
            logger.error(f"Error in document processing pipeline: {str(e)}")
            raise
            
    def _chunk_documents(self, documents: Dict[str, List[Dict]]) -> Dict[str, List[Dict]]:
        """Chunk all documents."""
        chunked = {
            "guidelines": [],
            "case_studies": []
        }
        
        # Process guidelines
        for doc in tqdm(documents["guidelines"], desc="Chunking guidelines"):
            chunks = self.chunker.chunk_text(
                text=doc["text"],
                metadata={
                    "source": doc["source"],
                    "type": "guideline",
                    "path": doc.get("path", "")
                }
            )
            chunked["guidelines"].extend(chunks)
            
        # Process case studies
        for doc in tqdm(documents["case_studies"], desc="Chunking case studies"):
            chunks = self.chunker.chunk_text(
                text=doc["text"],
                metadata={
                    "source": doc["source"],
                    "type": "case_study",
                    "path": doc.get("path", "")
                }
            )
            chunked["case_studies"].extend(chunks)
            
        return chunked
        
    def _create_embeddings(self, documents: Dict[str, List[Dict]]) -> Dict[str, List]:
        """Create embeddings for all document chunks."""
        all_chunks = []
        all_chunks.extend(documents["guidelines"])
        all_chunks.extend(documents["case_studies"])
        
        logger.info(f"Processing {len(all_chunks)} chunks...")
        
        # Create embeddings
        texts = []
        processed_chunks = []
        for chunk in tqdm(all_chunks, desc="Preparing chunks"):
            if isinstance(chunk.get('text'), str):
                texts.append(chunk['text'])
                processed_chunks.append(chunk)
            elif isinstance(chunk.get('metadata'), dict):
                # Handle chunks from TextChunker
                chunk_text = chunk['text']
                chunk['text'] = chunk_text  # Move text to top level
                chunk.update(chunk['metadata'])  # Move metadata to top level
                del chunk['metadata']  # Remove metadata field
                texts.append(chunk_text)
                processed_chunks.append(chunk)
        
        # Process in batches of 100
        batch_size = 100
        all_embeddings = []
        
        for i in tqdm(range(0, len(texts), batch_size), desc="Creating embeddings"):
            batch_texts = texts[i:i + batch_size]
            batch_embeddings = self.embedding_model.encode(batch_texts)
            if isinstance(batch_embeddings, list):
                batch_embeddings = np.array(batch_embeddings)
            all_embeddings.append(batch_embeddings)
            
        # Concatenate all embeddings
        final_embeddings = np.concatenate(all_embeddings) if len(all_embeddings) > 1 else all_embeddings[0]
        
        return {
            "embeddings": final_embeddings,  # This will be a numpy array
            "chunk_ids": list(range(len(processed_chunks)))
        }
        
    def _build_index(self, documents: Dict[str, List[Dict]], embeddings: Dict[str, List]):
        """Build search index from embeddings."""
        # Combine all documents
        all_chunks = []
        all_chunks.extend(documents["guidelines"])
        all_chunks.extend(documents["case_studies"])
        
        # Add to index
        self.index.add_documents(
            documents=all_chunks,
            embeddings=embeddings["embeddings"]
        )
        
        # Save index and documents to ethics_index directory
        self.index.save(self.index_dir / "faiss.index")
        
        # Save documents separately for the index
        with open(self.index_dir / "documents.json", 'w', encoding='utf-8') as f:
            json.dump(all_chunks, f, ensure_ascii=False, indent=2)
        
    def _save_processed_data(self, documents: Dict[str, List[Dict]]):
        """Save processed documents and metadata."""
        # Save chunked documents
        docs_path = self.processed_dir / "documents.json"
        with open(docs_path, 'w', encoding='utf-8') as f:
            json.dump(documents, f, ensure_ascii=False, indent=2)
            
        # Save processing metadata
        meta_path = self.processed_dir / "metadata.json"
        metadata = {
            "num_guidelines": len(documents["guidelines"]),
            "num_case_studies": len(documents["case_studies"]),
            "chunk_size": self.config.get("chunk_size", 512),
            "overlap": self.config.get("overlap", 50),
            "embedding_dimension": self.embedding_model.dimension
        }
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
            
    def load_processed_data(self) -> Optional[Dict[str, List[Dict]]]:
        """Load processed documents if they exist."""
        try:
            docs_path = self.processed_dir / "documents.json"
            if not docs_path.exists():
                return None
                
            with open(docs_path, 'r', encoding='utf-8') as f:
                return json.load(f)
                
        except Exception as e:
            logger.error(f"Error loading processed data: {str(e)}")
            return None
            
    def load_search_index(self) -> bool:
        """Load search index if it exists."""
        try:
            index_path = self.index_dir / "faiss.index"
            if not index_path.exists():
                return False
                
            self.index.load(index_path)
            return True
            
        except Exception as e:
            logger.error(f"Error loading search index: {str(e)}")
            return False 