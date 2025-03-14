#!/usr/bin/env python3
import os
import sys
import logging
from pathlib import Path
import json
from tqdm import tqdm
import torch
import gc
import numpy as np

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from embeddings.embedding_model import EmbeddingModel
from retriever.hybrid_retriever import HybridRetriever

# Configure minimal logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

def build_index_in_batches(documents, batch_size=2):
    """Build index in tiny batches to minimize memory usage."""
    try:
        print("\nInitializing models...")
        embedding_model = EmbeddingModel(cache_dir="cache")
        retriever = HybridRetriever(
            embedding_model=embedding_model,
            cache_dir="cache"
        )
        
        # Process in very small batches
        print(f"\nProcessing {len(documents)} documents in batches of {batch_size}...")
        
        for i in tqdm(range(0, len(documents), batch_size)):
            batch = documents[i:i + batch_size]
            
            # Index batch
            success = retriever.index_documents(
                documents=batch,
                batch_size=1,  # Process one at a time within batch
                force_reindex=(i == 0)  # Only force on first batch
            )
            
            if not success:
                print(f"\n❌ Error indexing batch {i//batch_size + 1}")
                continue
                
            # Force cleanup
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        
        return retriever
        
    except Exception as e:
        logger.error(f"Error building index: {str(e)}")
        return None

def main():
    """Build search index with minimal memory usage."""
    try:
        print("\nLow Memory Index Builder")
        print("=" * 40)
        
        # Check for documents
        docs_path = "data/processed/documents.json"
        if not os.path.exists(docs_path):
            print("❌ Error: documents.json not found!")
            return 1
        
        # Load documents
        print("\nLoading documents...")
        with open(docs_path, 'r') as f:
            documents = json.load(f)
        
        print(f"Loaded {len(documents)} documents")
        
        # Build index
        retriever = build_index_in_batches(documents, batch_size=2)
        if not retriever:
            print("\n❌ Error building index")
            return 1
        
        # Save index
        print("\nSaving index...")
        index_path = "data/processed/faiss.index"
        retriever.save_index(index_path, docs_path)
        
        print("\n✅ Index built successfully!")
        return 0
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 