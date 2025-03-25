from langchain_openai import OpenAIEmbeddings
import logging
from typing import List, Dict
import os
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

class ReRanker:
    """Re-rank retrieval results using OpenAI embeddings for semantic similarity."""
    
    def __init__(self, model_name: str = "text-embedding-ada-002",
                 cache_dir: str = None):
        """Initialize re-ranker model."""
        try:
            if cache_dir:
                os.makedirs(cache_dir, exist_ok=True)
                
            self.model = OpenAIEmbeddings(
                model=model_name,
                cache_folder=cache_dir if cache_dir else None
            )
            logger.info(f"Initialized OpenAI re-ranker model: {model_name}")
            
        except Exception as e:
            logger.error(f"Error initializing re-ranker: {str(e)}")
            raise

    def rerank(self, query: str, results: List[Dict], top_k: int = 5) -> List[Dict]:
        """Re-rank results using semantic similarity scores from OpenAI embeddings."""
        try:
            # Skip reranking if only a few results
            if len(results) <= top_k:
                return results
            
            # Get embeddings for query and results
            query_embedding = np.array(self.model.embed_query(query))
            result_texts = [result['text'] for result in results]
            result_embeddings = np.array(self.model.embed_documents(result_texts))
            
            # Calculate similarity scores
            scores = cosine_similarity(
                query_embedding.reshape(1, -1),
                result_embeddings
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