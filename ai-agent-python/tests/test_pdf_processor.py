import os
import sys
from pathlib import Path
import pytest
import json

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from data_processing.pdf_processor import PDFProcessor

def test_pdf_processor_initialization():
    """Test PDF processor initialization."""
    processor = PDFProcessor()
    assert processor.raw_dir == Path("data/raw")
    assert processor.processed_dir == Path("data/processed")
    assert processor.guidelines_dir == Path("data/raw/guidelines")
    assert processor.case_studies_dir == Path("data/raw/case_studies")

def test_process_all_documents():
    """Test processing all documents."""
    processor = PDFProcessor()
    results = processor.process_all_documents()
    
    # Check if results contain both categories
    assert "guidelines" in results
    assert "case_studies" in results
    
    # Check if documents were processed
    assert len(results["guidelines"]) > 0
    assert len(results["case_studies"]) > 0
    
    # Check if output file was created
    output_file = Path("data/processed/documents.json")
    assert output_file.exists()
    
    # Verify JSON structure
    with open(output_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        assert "guidelines" in data
        assert "case_studies" in data
        
        # Check document structure
        for doc in data["guidelines"]:
            assert "text" in doc
            assert "source" in doc
            assert "type" in doc
            assert "path" in doc
            assert doc["type"] == "guideline"
            
        for doc in data["case_studies"]:
            assert "text" in doc
            assert "source" in doc
            assert "type" in doc
            assert "path" in doc
            assert doc["type"] == "case_study"

def test_process_single_pdf():
    """Test processing a single PDF file."""
    processor = PDFProcessor()
    
    # Test with an existing PDF
    test_pdf = Path("data/raw/guidelines/ieee-code-of-ethics.pdf")
    if test_pdf.exists():
        result = processor.process_single_pdf(str(test_pdf))
        assert result is not None
        assert "text" in result
        assert "source" in result
        assert result["source"] == "ieee-code-of-ethics.pdf"
        assert len(result["text"]) > 0
    
    # Test with non-existent PDF
    result = processor.process_single_pdf("non_existent.pdf")
    assert result is None

def test_error_handling():
    """Test error handling for invalid inputs."""
    processor = PDFProcessor()
    
    # Test with invalid directory
    processor.raw_dir = Path("invalid_directory")
    results = processor.process_all_documents()
    assert results["guidelines"] == []
    assert results["case_studies"] == []
    
    # Test with invalid PDF file
    result = processor.process_single_pdf("invalid.pdf")
    assert result is None

if __name__ == "__main__":
    pytest.main([__file__]) 