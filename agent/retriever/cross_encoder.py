from sentence_transformers import SentenceTransformer
import torch
import logging
from typing import List, Dict
import os
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

class ReRanker:
    """Re-rank retrieval results using semantic similarity."""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
                 cache_dir: str = None):
        """Initialize re-ranker model."""
        try:
            if cache_dir:
                os.makedirs(cache_dir, exist_ok=True)
                os.environ['TRANSFORMERS_CACHE'] = cache_dir
                
            self.model = SentenceTransformer(model_name, cache_folder=cache_dir)
            if torch.cuda.is_available():
                self.model.to(torch.device('cuda'))
            logger.info(f"Initialized re-ranker model: {model_name}")
            
        except Exception as e:
            logger.error(f"Error initializing re-ranker: {str(e)}")
            raise

    def rerank(self, query: str, results: List[Dict], top_k: int = 5) -> List[Dict]:
        """Re-rank results using semantic similarity scores."""
        try:
            # Skip reranking if only a few results
            if len(results) <= top_k:
                return results
            
            # Use Apple MPS if available
            device = 'mps' if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available() else 'cpu'
            
            # Get embeddings in smaller batches
            batch_size = 16  # Smaller for M1
            
            # Get embeddings for query and results
            query_embedding = self.model.encode([query], convert_to_tensor=True)
            result_texts = [result['text'] for result in results]
            result_embeddings = self.model.encode(result_texts, convert_to_tensor=True)
            
            # Calculate similarity scores
            scores = cosine_similarity(
                query_embedding.cpu().numpy(),
                result_embeddings.cpu().numpy()
            )[0]
            
            # Add scores to results
            for result, score in zip(results, scores):
                result['score'] = float(score)  # Update the score with similarity score
            
            # Sort by similarity score
            results.sort(key=lambda x: x['score'], reverse=True)
            
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Error in re-ranking: {str(e)}")
            return results[:top_k]  # Return original order if re-ranking fails 