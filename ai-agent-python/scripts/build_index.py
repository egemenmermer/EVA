#!/usr/bin/env python3
import os
import sys
import logging
from pathlib import Path
import json
from tqdm import tqdm
import torch
import gc

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from embeddings.embedding_model import EmbeddingModel
from retriever.hybrid_retriever import HybridRetriever

# Configure logging to be less verbose
logging.basicConfig(
    level=logging.WARNING,  # Change to WARNING to reduce noise
    format='%(message)s'
)
logger = logging.getLogger(__name__)

def build_index():
    """Build FAISS index from documents.json."""
    try:
        print("\nFAISS Index Builder")
        print("=" * 40)
        
        # Check for documents.json
        docs_path = "data/processed/documents.json"
        if not os.path.exists(docs_path):
            print("❌ Error: documents.json not found!")
            return False
            
        # Load documents
        print("\nLoading documents...")
        with open(docs_path, 'r') as f:
            documents = json.load(f)
        doc_count = len(documents)
        print(f"Loaded {doc_count} documents")
        
        # Initialize models with M1 optimizations
        print("\nInitializing models...")
        embedding_model = EmbeddingModel(cache_dir="cache")
        
        # Enable MPS if available
        if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            print("Using MPS (Metal Performance Shaders) for M1 acceleration")
            os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
        
        retriever = HybridRetriever(
            embedding_model=embedding_model,
            cache_dir="cache"
        )
        
        # Calculate optimal batch size based on document count
        batch_size = min(8, doc_count)  # Start with small batches
        chunks = (doc_count + batch_size - 1) // batch_size
        
        print(f"\nProcessing in {chunks} chunks of {batch_size} documents each...")
        
        # Build index with progress monitoring
        with tqdm(total=doc_count, desc="Building index") as pbar:
            success = retriever.index_documents(
                documents=documents,
                batch_size=batch_size,
                force_reindex=True,
                progress_callback=lambda x: pbar.update(x)
            )
            
            if not success:
                print("\n❌ Error during indexing")
                return False
        
        # Save index
        print("\nSaving index...")
        index_path = "data/processed/faiss.index"
        retriever.save_index(index_path, docs_path)
        
        # Verify index
        print("\nVerifying index...")
        test_query = "What are the ethical implications of using facial recognition?"
        results = retriever.hybrid_search(test_query, top_k=1)
        
        if results:
            print("\n✅ Index built and verified successfully!")
            print(f"Index contains {doc_count} documents")
            print(f"Test query returned {len(results)} results")
            print(f"\nSample result score: {results[0]['score']:.3f}")
            return True
        else:
            print("\n❌ Index verification failed!")
            return False
            
    except KeyboardInterrupt:
        print("\n\nInterrupted by user. Cleaning up...")
        return False
    except Exception as e:
        print(f"\n❌ Error building index: {str(e)}")
        return False
    finally:
        # Cleanup
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()

def main():
    """Main function."""
    try:
        success = build_index()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\nExiting...")
        return 1

if __name__ == "__main__":
    sys.exit(main())