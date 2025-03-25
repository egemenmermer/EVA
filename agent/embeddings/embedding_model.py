from langchain_openai import OpenAIEmbeddings
import numpy as np
import logging
import os
from typing import List, Dict
from tqdm import tqdm

logger = logging.getLogger(__name__)

class EmbeddingModel:
    """Handle text embeddings using OpenAI Ada."""
    
    def __init__(self, model_name: str = "text-embedding-ada-002", cache_dir: str = None):
        """Initialize the embedding model."""
        try:
            # Create cache directory if needed
            if cache_dir:
                os.makedirs(cache_dir, exist_ok=True)
            
            # Initialize OpenAI embeddings
            self.model = OpenAIEmbeddings(
                model=model_name,
                cache_folder=cache_dir if cache_dir else None
            )
            
            logger.info(f"Initialized OpenAI embedding model: {model_name}")
            
        except Exception as e:
            logger.error(f"Error initializing embedding model: {str(e)}")
            raise

    @property
    def dimension(self) -> int:
        """Get the embedding dimension of the model."""
        return 1536  # Ada-002 embedding dimension

    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """Generate embeddings for a list of texts."""
        try:
            # Process in batches
            all_embeddings = []
            for i in tqdm(range(0, len(texts), batch_size), desc="Processing batches"):
                batch_texts = texts[i:i + batch_size]
                
                # Generate embeddings for batch
                embeddings = self.model.embed_documents(batch_texts)
                all_embeddings.extend(embeddings)
            
            # Convert to numpy array
            return np.array(all_embeddings)
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise

    def encode_documents(self, documents: List[Dict]) -> np.ndarray:
        """Generate embeddings for a list of documents."""
        try:
            texts = [doc['text'] for doc in documents]
            return self.encode(texts)
        except Exception as e:
            logger.error(f"Error encoding documents: {str(e)}")
            raise

    def encode_query(self, query: str) -> np.ndarray:
        """Generate embedding for a query string."""
        try:
            embedding = self.model.embed_query(query)
            return np.array(embedding)
        except Exception as e:
            logger.error(f"Error encoding query: {str(e)}")
            raise 