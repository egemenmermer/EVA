from sentence_transformers import SentenceTransformer
import torch
import logging
import os
import numpy as np
from tqdm import tqdm

logger = logging.getLogger(__name__)

class EmbeddingModel:
    """Handle text embeddings using sentence transformers."""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", cache_dir: str = None):
        """Initialize the embedding model."""
        try:
            # Create cache directory if needed
            if cache_dir:
                os.makedirs(cache_dir, exist_ok=True)
            
            # Initialize the model
            self.model = SentenceTransformer(model_name, cache_folder=cache_dir)
            
            # Keep on CPU for now - we'll manage CUDA explicitly during encoding
            self.model = self.model.cpu()
            logger.info(f"Initialized embedding model: {model_name}")
            
        except Exception as e:
            logger.error(f"Error initializing embedding model: {str(e)}")
            raise

    @property
    def dimension(self) -> int:
        """Get the embedding dimension of the model."""
        return self.model.get_sentence_embedding_dimension()

    def encode(self, texts: list, batch_size: int = 32) -> np.ndarray:
        """Generate embeddings for a list of texts."""
        try:
            # Move model to GPU if available
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            self.model = self.model.to(device)
            logger.info(f"Using device: {device}")

            # Process in batches
            all_embeddings = []
            for i in tqdm(range(0, len(texts), batch_size), desc="Processing batches"):
                batch_texts = texts[i:i + batch_size]
                
                # Generate embeddings for batch
                with torch.no_grad():  # Disable gradient computation
                    embeddings = self.model.encode(
                        batch_texts,
                        convert_to_tensor=True,
                        show_progress_bar=False
                    )
                    
                    # Move to CPU and convert to numpy
                    embeddings = embeddings.cpu().numpy()
                    all_embeddings.append(embeddings)
                
                # Clear GPU cache periodically
                if device.type == 'cuda' and (i + 1) % (batch_size * 10) == 0:
                    torch.cuda.empty_cache()
            
            # Move model back to CPU to free GPU memory
            self.model = self.model.cpu()
            if device.type == 'cuda':
                torch.cuda.empty_cache()
            
            # Combine all batches
            return np.concatenate(all_embeddings, axis=0)
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise

    def encode_documents(self, documents: list) -> np.ndarray:
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
            return self.encode([query])[0]
        except Exception as e:
            logger.error(f"Error encoding query: {str(e)}")
            raise 