import os
import sys
from pathlib import Path
import pytest
from typing import Dict

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

@pytest.fixture(scope="session")
def test_data_dir(tmp_path_factory) -> Path:
    """Create and return a temporary directory for test data."""
    return tmp_path_factory.mktemp("test_data")

@pytest.fixture(scope="session")
def test_cache_dir(tmp_path_factory) -> Path:
    """Create and return a temporary directory for test cache."""
    return tmp_path_factory.mktemp("test_cache")

@pytest.fixture(scope="session")
def test_config(test_cache_dir) -> Dict:
    """Return test configuration."""
    return {
        'model_name': 'meta-llama/Llama-2-8b-chat-hf',
        'api_token': 'test_token',
        'cache_dir': str(test_cache_dir)
    }

@pytest.fixture(scope="session")
def test_db_url() -> str:
    """Return test database URL."""
    return "sqlite:///:memory:"

@pytest.fixture(scope="session")
def sample_pdf_content() -> bytes:
    """Return sample PDF content for testing."""
    return b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<< /Length 68 >>\nstream\nBT\n/F1 12 Tf\n70 700 Td\n(This is a test PDF document for unit testing.) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000254 00000 n\n0000000332 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n452\n%%EOF"

@pytest.fixture
def sample_pdf_file(test_data_dir, sample_pdf_content) -> Path:
    """Create a sample PDF file for testing."""
    pdf_path = test_data_dir / "test.pdf"
    pdf_path.write_bytes(sample_pdf_content)
    return pdf_path

@pytest.fixture
def mock_ethical_context() -> Dict:
    """Return mock ethical context for testing."""
    return {
        'guidelines': [{
            'text': 'Test ethical guideline',
            'source': 'test_guideline.pdf',
            'type': 'guideline'
        }],
        'case_studies': [{
            'text': 'Test case study',
            'source': 'test_case.pdf',
            'type': 'case_study'
        }]
    }

def pytest_configure(config):
    """Configure pytest."""
    # Add custom markers
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow to run"
    )

def pytest_collection_modifyitems(config, items):
    """Modify test items in collection."""
    if config.getoption("--runslow"):
        return
    skip_slow = pytest.mark.skip(reason="need --runslow option to run")
    for item in items:
        if "slow" in item.keywords:
            item.add_marker(skip_slow) 