import os
import sys
from pathlib import Path
import pytest
import numpy as np
from unittest.mock import Mock, patch

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from embeddings.embedding_model import EmbeddingModel
from embeddings.index import FAISSIndex
from retriever.hybrid_retriever import HybridRetriever
from retriever.cross_encoder import ReRanker

@pytest.fixture
def sample_documents():
    """Return sample documents for testing."""
    return [
        {
            "text": "AI systems should be transparent and explainable",
            "source": "ethics_guide.pdf",
            "type": "guideline"
        },
        {
            "text": "Privacy must be protected in all AI applications",
            "source": "privacy_guide.pdf",
            "type": "guideline"
        },
        {
            "text": "Case study: facial recognition system raised privacy concerns",
            "source": "case_study.pdf",
            "type": "case_study"
        }
    ]

@pytest.fixture
def mock_embeddings():
    """Return mock embeddings for testing."""
    return np.random.rand(3, 384).astype(np.float32)  # 384 is typical embedding dimension

def test_embedding_model_initialization():
    """Test embedding model initialization."""
    model = EmbeddingModel(cache_dir="test_cache")
    assert model.dimension > 0
    assert hasattr(model, 'model')
    assert hasattr(model, 'tokenizer')

@patch('embeddings.embedding_model.AutoModel')
@patch('embeddings.embedding_model.AutoTokenizer')
def test_embedding_model_encode(mock_tokenizer, mock_model, sample_documents):
    """Test document encoding."""
    # Setup mock
    mock_model_instance = Mock()
    mock_model_instance.return_value = torch.rand(1, 384)
    mock_model.from_pretrained.return_value = mock_model_instance
    
    model = EmbeddingModel(cache_dir="test_cache")
    
    # Test document encoding
    embeddings = model.encode_documents(sample_documents)
    assert len(embeddings) == len(sample_documents)
    assert embeddings.shape[1] == model.dimension
    
    # Test query encoding
    query_embedding = model.encode_query("Test query")
    assert len(query_embedding) == model.dimension

def test_faiss_index(mock_embeddings, sample_documents, test_cache_dir):
    """Test FAISS index operations."""
    index = FAISSIndex(dimension=mock_embeddings.shape[1])
    
    # Test adding documents
    index.add_documents(sample_documents, mock_embeddings)
    assert len(index.documents) == len(sample_documents)
    
    # Test searching
    query_vector = np.random.rand(mock_embeddings.shape[1]).astype(np.float32)
    results = index.search(query_vector, k=2)
    assert len(results) == 2
    
    # Test save and load
    save_path = test_cache_dir / "test_index.faiss"
    index.save(save_path)
    assert save_path.exists()
    
    new_index = FAISSIndex(dimension=mock_embeddings.shape[1])
    new_index.load(save_path)
    assert len(new_index.documents) == len(index.documents)

@pytest.mark.integration
def test_hybrid_retriever(sample_documents):
    """Test hybrid retriever."""
    embedding_model = EmbeddingModel(cache_dir="test_cache")
    retriever = HybridRetriever(embedding_model)
    
    # Index documents
    retriever.index_documents(sample_documents)
    
    # Test search
    query = "privacy concerns in AI"
    results = retriever.hybrid_search(query, top_k=2)
    
    assert len(results) <= 2
    for result in results:
        assert "text" in result
        assert "source" in result
        assert "type" in result
        assert "score" in result

@pytest.mark.integration
def test_cross_encoder(sample_documents):
    """Test cross encoder re-ranking."""
    reranker = ReRanker(cache_dir="test_cache")
    
    # Create sample results
    results = [
        {"text": doc["text"], "score": 0.5}
        for doc in sample_documents
    ]
    
    # Test re-ranking
    query = "privacy in AI"
    reranked = reranker.rerank(query, results)
    
    assert len(reranked) == len(results)
    assert all("score" in r for r in reranked)
    
    # Verify scores are different (reranking happened)
    original_scores = [r["score"] for r in results]
    new_scores = [r["score"] for r in reranked]
    assert original_scores != new_scores

@pytest.mark.slow
def test_end_to_end_retrieval(sample_documents):
    """Test complete retrieval pipeline."""
    # Initialize components
    embedding_model = EmbeddingModel(cache_dir="test_cache")
    retriever = HybridRetriever(embedding_model)
    reranker = ReRanker(cache_dir="test_cache")
    
    # Index documents
    retriever.index_documents(sample_documents)
    
    # Perform search and reranking
    query = "ethical considerations in AI"
    initial_results = retriever.hybrid_search(query, top_k=3)
    final_results = reranker.rerank(query, initial_results)
    
    # Verify results
    assert len(final_results) <= 3
    assert all(isinstance(r["score"], float) for r in final_results)
    assert all(r["text"] in [d["text"] for d in sample_documents] for r in final_results)

if __name__ == "__main__":
    pytest.main([__file__]) 