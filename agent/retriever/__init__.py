"""
Retriever package for semantic search and document retrieval.
"""

from retriever.hybrid_retriever import HybridRetriever
from retriever.cross_encoder import ReRanker

# Add memory-optimized variants
try:
    from retriever.lightweight_retriever import LightweightRetriever
    __all__ = ['HybridRetriever', 'ReRanker', 'LightweightRetriever']
except ImportError:
    __all__ = ['HybridRetriever', 'ReRanker']

# Configure memory settings
import os
import torch

def configure_for_device():
    """Configure retriever based on available hardware"""
    if torch.backends.mps.is_available():
        os.environ["RETRIEVER_DEVICE"] = "mps"  # Apple Silicon
    elif torch.cuda.is_available():
        os.environ["RETRIEVER_DEVICE"] = "cuda"
    else:
        os.environ["RETRIEVER_DEVICE"] = "cpu"

