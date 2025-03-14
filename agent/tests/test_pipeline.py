import os
import sys
from pathlib import Path
import pytest
import json
import shutil
from unittest.mock import Mock, patch

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from data_processing.pipeline import DataPipeline

@pytest.fixture
def pipeline_config(test_data_dir, test_cache_dir):
    """Create test pipeline configuration."""
    return {
        "data_dir": str(test_data_dir),
        "cache_dir": str(test_cache_dir),
        "chunk_size": 256,
        "overlap": 25
    }

@pytest.fixture
def setup_test_data(test_data_dir, sample_pdf_content):
    """Set up test data directory structure."""
    # Create directory structure
    raw_dir = test_data_dir / "raw"
    guidelines_dir = raw_dir / "guidelines"
    case_studies_dir = raw_dir / "case_studies"
    processed_dir = test_data_dir / "processed"
    
    guidelines_dir.mkdir(parents=True)
    case_studies_dir.mkdir(parents=True)
    processed_dir.mkdir(parents=True)
    
    # Create test PDFs
    (guidelines_dir / "test_guideline.pdf").write_bytes(sample_pdf_content)
    (case_studies_dir / "test_case.pdf").write_bytes(sample_pdf_content)
    
    yield test_data_dir
    
    # Cleanup
    shutil.rmtree(test_data_dir)

def test_pipeline_initialization(pipeline_config):
    """Test pipeline initialization."""
    pipeline = DataPipeline(pipeline_config)
    
    assert pipeline.config == pipeline_config
    assert pipeline.data_dir == Path(pipeline_config["data_dir"])
    assert pipeline.cache_dir == Path(pipeline_config["cache_dir"])
    assert pipeline.processed_dir.exists()
    assert pipeline.cache_dir.exists()

@pytest.mark.integration
def test_document_processing(pipeline_config, setup_test_data):
    """Test full document processing pipeline."""
    pipeline = DataPipeline(pipeline_config)
    
    # Process documents
    documents = pipeline.process_documents()
    
    # Check results
    assert "guidelines" in documents
    assert "case_studies" in documents
    assert len(documents["guidelines"]) > 0
    assert len(documents["case_studies"]) > 0
    
    # Check processed files
    processed_dir = Path(pipeline_config["data_dir"]) / "processed"
    assert (processed_dir / "documents.json").exists()
    assert (processed_dir / "embeddings.faiss").exists()
    assert (processed_dir / "metadata.json").exists()
    
    # Check metadata
    with open(processed_dir / "metadata.json", 'r') as f:
        metadata = json.load(f)
        assert metadata["chunk_size"] == pipeline_config["chunk_size"]
        assert metadata["overlap"] == pipeline_config["overlap"]

def test_load_processed_data(pipeline_config, setup_test_data):
    """Test loading processed data."""
    pipeline = DataPipeline(pipeline_config)
    
    # Initially, no processed data should exist
    assert pipeline.load_processed_data() is None
    
    # Process documents
    original_docs = pipeline.process_documents()
    
    # Load processed data
    loaded_docs = pipeline.load_processed_data()
    assert loaded_docs is not None
    assert loaded_docs == original_docs

def test_load_search_index(pipeline_config, setup_test_data):
    """Test loading search index."""
    pipeline = DataPipeline(pipeline_config)
    
    # Initially, no index should exist
    assert not pipeline.load_search_index()
    
    # Process documents (creates index)
    pipeline.process_documents()
    
    # Load index
    assert pipeline.load_search_index()

@patch('data_processing.pipeline.PDFProcessor')
@patch('data_processing.pipeline.TextChunker')
@patch('data_processing.pipeline.EmbeddingModel')
def test_pipeline_components(mock_embedding_model, mock_chunker, mock_pdf_processor, pipeline_config):
    """Test pipeline component interactions."""
    # Setup mocks
    mock_pdf_processor.return_value.process_all_documents.return_value = {
        "guidelines": [{"text": "test guideline", "source": "test.pdf"}],
        "case_studies": [{"text": "test case", "source": "test.pdf"}]
    }
    
    mock_chunker.return_value.chunk_text.return_value = [
        {"text": "chunk 1", "metadata": {}},
        {"text": "chunk 2", "metadata": {}}
    ]
    
    mock_embedding_model.return_value.encode_documents.return_value = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6]
    ]
    
    # Run pipeline
    pipeline = DataPipeline(pipeline_config)
    documents = pipeline.process_documents()
    
    # Verify component interactions
    mock_pdf_processor.return_value.process_all_documents.assert_called_once()
    assert mock_chunker.return_value.chunk_text.call_count > 0
    mock_embedding_model.return_value.encode_documents.assert_called_once()

def test_error_handling(pipeline_config):
    """Test pipeline error handling."""
    pipeline = DataPipeline(pipeline_config)
    
    # Test with non-existent directories
    with pytest.raises(Exception):
        pipeline.process_documents()
    
    # Test with invalid processed data
    processed_dir = Path(pipeline_config["data_dir"]) / "processed"
    processed_dir.mkdir(parents=True)
    (processed_dir / "documents.json").write_text("invalid json")
    
    assert pipeline.load_processed_data() is None

if __name__ == "__main__":
    pytest.main([__file__]) 