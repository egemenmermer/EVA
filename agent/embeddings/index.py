import faiss
import numpy as np
import json
from pathlib import Path
import logging
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)

class FAISSIndex:
    """Manage FAISS index for document embeddings."""
    
    def __init__(self, dimension: int):
        """Initialize FAISS index."""
        self.dimension = dimension
        self.index = faiss.IndexFlatL2(dimension)
        self.documents = []

    def add_documents(self, documents: List[Dict], embeddings: np.ndarray):
        """Add documents and their embeddings to the index."""
        try:
            self.documents.extend(documents)
            self.index.add(embeddings)
            logger.info(f"Added {len(documents)} documents to index")
            
        except Exception as e:
            logger.error(f"Error adding documents to index: {str(e)}")
            raise

    def search(self, query_embedding: np.ndarray, k: int = 5) -> List[Dict]:
        """Search for similar documents using query embedding."""
        try:
            # Ensure query embedding is 2D
            if query_embedding.ndim == 1:
                query_embedding = query_embedding.reshape(1, -1)
            
            # Search index
            distances, indices = self.index.search(query_embedding, k)
            
            # Format results
            results = []
            for idx, distance in zip(indices[0], distances[0]):
                if idx < len(self.documents):
                    doc = self.documents[idx]
                    results.append({
                        'text': doc['text'],
                        'source': doc['source'],
                        'type': doc['type'],
                        'score': float(1.0 / (1.0 + distance))  # Convert distance to similarity score
                    })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching index: {str(e)}")
            return []

    def save(self, save_dir: str):
        """Save index and documents to disk."""
        save_path = Path(save_dir)
        save_path.mkdir(parents=True, exist_ok=True)
        
        try:
            # Save FAISS index
            faiss.write_index(self.index, str(save_path / "embeddings.faiss"))
            
            # Save documents
            with open(save_path / "documents.json", 'w') as f:
                json.dump(self.documents, f)
                
            logger.info(f"Saved index and documents to {save_dir}")
            
        except Exception as e:
            logger.error(f"Error saving index: {str(e)}")
            raise

    def load(self, load_dir: str):
        """Load index and documents from disk."""
        load_path = Path(load_dir)
        
        try:
            # Load FAISS index
            self.index = faiss.read_index(str(load_path / "embeddings.faiss"))
            
            # Load documents
            with open(load_path / "documents.json", 'r') as f:
                self.documents = json.load(f)
                
            logger.info(f"Loaded index and {len(self.documents)} documents from {load_dir}")
            
        except Exception as e:
            logger.error(f"Error loading index: {str(e)}")
            raise 