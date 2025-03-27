import faiss
import numpy as np
import logging
from typing import List, Optional, Tuple
import os

logger = logging.getLogger(__name__)

class FAISSIndex:
    def __init__(self, dimension: int = 1536, index_type: str = "L2"):
        """Initialize the FAISS index.
        
        Args:
            dimension: Dimension of the vectors (1536 for OpenAI Ada)
            index_type: Type of index to use ("L2" or "IP" for inner product)
        """
        try:
            if index_type == "L2":
                self.index = faiss.IndexFlatL2(dimension)
            elif index_type == "IP":
                self.index = faiss.IndexFlatIP(dimension)
            else:
                raise ValueError(f"Unsupported index type: {index_type}")
            
            self.dimension = dimension
            logger.info(f"Initialized FAISS index with dimension {dimension}")
            
        except Exception as e:
            logger.error(f"Error initializing FAISS index: {str(e)}")
            raise

    def add(self, vectors: np.ndarray) -> None:
        """Add vectors to the index.
        
        Args:
            vectors: Numpy array of shape (n, dimension)
        """
        try:
            if vectors.shape[1] != self.dimension:
                raise ValueError(f"Vector dimension mismatch. Expected {self.dimension}, got {vectors.shape[1]}")
            
            self.index.add(vectors.astype(np.float32))
            logger.info(f"Added {len(vectors)} vectors to index")
            
        except Exception as e:
            logger.error(f"Error adding vectors to index: {str(e)}")
            raise

    def search(self, query_vector: np.ndarray, k: int = 5) -> Tuple[np.ndarray, np.ndarray]:
        """Search the index for the top k nearest neighbors of the query_vector.
        
        Args:
            query_vector: Query vector of shape (dimension,) or (1, dimension)
            k: Number of nearest neighbors to return
            
        Returns:
            Tuple of (distances, indices)
        """
        try:
            # Ensure query_vector is 2D
            if query_vector.ndim == 1:
                query_vector = query_vector.reshape(1, -1)
            
            if query_vector.shape[1] != self.dimension:
                raise ValueError(f"Query vector dimension mismatch. Expected {self.dimension}, got {query_vector.shape[1]}")
            
            distances, indices = self.index.search(query_vector.astype(np.float32), k)
            return distances, indices
            
        except Exception as e:
            logger.error(f"Error searching index: {str(e)}")
            raise

    def save(self, file_path: str) -> None:
        """Save the index to a file.
        
        Args:
            file_path: Path to save the index
        """
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            faiss.write_index(self.index, file_path)
            logger.info(f"Saved index to {file_path}")
            
        except Exception as e:
            logger.error(f"Error saving index: {str(e)}")
            raise

    def load(self, file_path: str) -> None:
        """Load the index from a file.
        
        Args:
            file_path: Path to load the index from
        """
        try:
            self.index = faiss.read_index(file_path)
            self.dimension = self.index.d
            logger.info(f"Loaded index from {file_path}")
            
        except Exception as e:
            logger.error(f"Error loading index: {str(e)}")
            raise

    @property
    def total_vectors(self) -> int:
        """Get the total number of vectors in the index."""
        return self.index.ntotal 