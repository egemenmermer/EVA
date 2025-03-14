from typing import List, Dict, Optional
import numpy as np
from rank_bm25 import BM25Okapi
import logging
from embeddings.embedding_model import EmbeddingModel
from embeddings.index import FAISSIndex
import os
import json
import faiss
from tqdm import tqdm
import torch
import gc

logger = logging.getLogger(__name__)

class HybridRetriever:
    """Hybrid search combining dense and sparse retrieval."""
    
    def __init__(self, embedding_model: EmbeddingModel, cache_dir: Optional[str] = None):
        """Initialize retriever with embedding model."""
        self.embedding_model = embedding_model
        self.cache_dir = cache_dir
        if cache_dir:
            # Create cache directory and subdirectories
            os.makedirs(cache_dir, exist_ok=True)
            os.makedirs(os.path.join(cache_dir, "retriever"), exist_ok=True)
            logger.info(f"Cache directory: {cache_dir}")
            logger.info(f"Retriever cache: {os.path.join(cache_dir, 'retriever')}")
        self.documents = []
        self.index = None

    def _get_cache_paths(self):
        """Get paths for cached files."""
        if not self.cache_dir:
            return None, None
            
        # Use simple flat structure for DAS-6
        emb_path = os.path.join(self.cache_dir, "retriever", "embeddings.npy")
        docs_path = os.path.join(self.cache_dir, "retriever", "documents.json")
        logger.info(f"Cache paths - Embeddings: {emb_path}, Documents: {docs_path}")
        return emb_path, docs_path

    def _load_cached_embeddings(self) -> Optional[np.ndarray]:
        """Load cached embeddings if they exist."""
        emb_path, docs_path = self._get_cache_paths()
        if not emb_path or not os.path.exists(emb_path) or not os.path.exists(docs_path):
            logger.info(f"Cache files not found - Embeddings exists: {os.path.exists(emb_path)}, Documents exists: {os.path.exists(docs_path)}")
            return None
            
        try:
            # Load and verify cached data
            logger.info("Loading cached documents...")
            with open(docs_path, 'r') as f:
                cached_docs = json.load(f)
                
            # Compare document counts first for quick mismatch detection
            if len(cached_docs) != len(self.documents):
                logger.info(f"Document count mismatch - Cache: {len(cached_docs)}, Current: {len(self.documents)}")
                return None
                
            # Full comparison only if counts match
            if cached_docs != self.documents:
                logger.info("Cached documents don't match current documents")
                return None
                
            logger.info("Loading cached embeddings...")
            embeddings = np.load(emb_path)
            logger.info(f"Successfully loaded cached embeddings with shape {embeddings.shape}")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error loading cached embeddings: {str(e)}")
            return None

    def _save_embeddings_cache(self, embeddings: np.ndarray):
        """Save embeddings and documents to cache."""
        emb_path, docs_path = self._get_cache_paths()
        if not emb_path:
            logger.warning("No cache directory specified, skipping cache save")
            return
            
        try:
            logger.info(f"Saving embeddings to {emb_path}")
            np.save(emb_path, embeddings)
            
            logger.info(f"Saving documents to {docs_path}")
            with open(docs_path, 'w') as f:
                json.dump(self.documents, f)
                
            logger.info("Successfully saved embeddings cache")
            
        except Exception as e:
            logger.error(f"Error saving embeddings cache: {str(e)}")
            # Try to clean up failed cache files
            try:
                if os.path.exists(emb_path):
                    os.remove(emb_path)
                if os.path.exists(docs_path):
                    os.remove(docs_path)
            except:
                pass

    def index_documents(self, documents: List[Dict], batch_size: int = 32, 
                       force_reindex: bool = False, progress_callback = None):
        """Index documents with progress tracking."""
        try:
            self.documents = documents
            texts = [doc['text'] for doc in documents]
            total_processed = 0
            embeddings_list = []
            
            # Process in batches
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                batch_embeddings = self.embedding_model.encode(batch)
                embeddings_list.append(batch_embeddings)
                
                # Update progress
                batch_size_actual = len(batch)
                total_processed += batch_size_actual
                if progress_callback:
                    progress_callback(batch_size_actual)
                
                # Cleanup
                gc.collect()
            
            # Combine embeddings
            embeddings = np.concatenate(embeddings_list)
            
            # Create and populate FAISS index
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatL2(dimension)
            self.index.add(embeddings.astype('float32'))
            
            return True
            
        except Exception as e:
            logger.error(f"Error indexing documents: {str(e)}")
            return False

    def _get_free_disk_space(self, path: str) -> Optional[int]:
        """Get free disk space in bytes."""
        try:
            if os.path.exists(path):
                stats = os.statvfs(path)
                return stats.f_frsize * stats.f_bavail
            return None
        except:
            return None

    def _cleanup_temp_files(self):
        """Clean up temporary embedding files."""
        try:
            if self.cache_dir:
                for file in os.listdir(self.cache_dir):
                    if file.startswith("temp_embeddings_") and file.endswith(".npy"):
                        try:
                            os.remove(os.path.join(self.cache_dir, file))
                        except:
                            pass
        except:
            pass

    def hybrid_search(self, query: str, top_k: int = 5) -> List[Dict]:
        """Perform hybrid search."""
        try:
            if not self.index or not self.documents:
                logger.warning("No index available for search")
                return []
                
            # Get query embedding
            query_embedding = self.embedding_model.encode([query])[0].reshape(1, -1).astype('float32')
            
            # Search index
            distances, indices = self.index.search(query_embedding, top_k)
            
            # Get results
            results = []
            for idx, distance in zip(indices[0], distances[0]):
                if idx < len(self.documents):  # Safety check
                    doc = self.documents[idx].copy()
                    doc['score'] = float(1 / (1 + distance))  # Convert distance to similarity score
                    results.append(doc)
            
            return results
            
        except Exception as e:
            logger.error(f"Error in hybrid search: {str(e)}")
            return []

    def save_index(self, index_path: str, docs_path: str) -> None:
        """Save index and documents to disk."""
        try:
            if self.index is None:
                raise ValueError("No index to save")
                
            # Save FAISS index
            faiss.write_index(self.index, index_path)
            
            # Save documents
            with open(docs_path, 'w', encoding='utf-8') as f:
                json.dump(self.documents, f, ensure_ascii=False, indent=2)
                
            logger.info(f"Saved index to {index_path} and documents to {docs_path}")
            
        except Exception as e:
            logger.error(f"Error saving index: {str(e)}")
            raise

    def load_index(self, index_path: str, docs_path: str) -> None:
        """Load index and documents from disk."""
        try:
            # Load FAISS index
            self.index = faiss.read_index(index_path)
            
            # Load documents
            with open(docs_path, 'r', encoding='utf-8') as f:
                self.documents = json.load(f)
                
            logger.info(f"Loaded index from {index_path} with {len(self.documents)} documents")
            
        except Exception as e:
            logger.error(f"Error loading index: {str(e)}")
            raise 