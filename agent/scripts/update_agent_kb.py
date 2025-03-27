#!/usr/bin/env python3
import os
import sys
import logging
from pathlib import Path
import json
import re
from typing import List, Dict, Any, Optional

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/update_agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import LangChain components
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from agents.langchain_agent import LangChainAgent

# Define paths
DATA_PROCESSED_DIR = Path(project_root) / "data" / "processed"
CATEGORIES = ["research_papers", "guidelines", "case_studies", "industry_reports", "combined"]

# Get OpenAI API key from frontend .env file
def get_openai_api_key():
    """Extract OpenAI API key from the frontend .env file."""
    env_path = Path(project_root).parent / "frontend" / ".env"
    if not env_path.exists():
        logger.warning(f"Frontend .env file not found at: {env_path}")
        return None
    
    try:
        with open(env_path, 'r') as f:
            env_content = f.read()
            
            # Search for OpenAI API key pattern
            match = re.search(r'VITE_OPENAI_API_KEY=([^\s"\']+)', env_content)
            if match:
                api_key = match.group(1).strip()
                logger.info("Successfully retrieved OpenAI API key from frontend .env file")
                return api_key
            else:
                logger.warning("OpenAI API key not found in frontend .env file")
                return None
    except Exception as e:
        logger.error(f"Error reading frontend .env file: {str(e)}")
        return None

# Set OpenAI API key
openai_api_key = get_openai_api_key()
if openai_api_key:
    os.environ["OPENAI_API_KEY"] = openai_api_key
    logger.info("Set OPENAI_API_KEY environment variable")
else:
    logger.warning("No OpenAI API key found. FAISS index loading will likely fail.")

def get_index_metadata(category: str) -> Optional[Dict[str, Any]]:
    """Get metadata for a FAISS index."""
    metadata_path = DATA_PROCESSED_DIR / category / "metadata.json"
    if not metadata_path.exists():
        logger.warning(f"Metadata file does not exist: {metadata_path}")
        return None
    
    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        return metadata
    except Exception as e:
        logger.error(f"Error reading metadata file {metadata_path}: {str(e)}")
        return None

def check_indexes() -> List[str]:
    """Check which indexes are available."""
    available_indexes = []
    
    for category in CATEGORIES:
        index_dir = DATA_PROCESSED_DIR / category
        index_file = index_dir / "index.faiss"
        metadata_file = index_dir / "metadata.json"
        
        if index_dir.exists() and index_file.exists() and metadata_file.exists():
            metadata = get_index_metadata(category)
            if metadata:
                logger.info(f"Found valid index for {category} with {metadata.get('chunk_count', 'unknown')} chunks")
                available_indexes.append(category)
        else:
            logger.warning(f"Index not found or incomplete for category: {category}")
    
    return available_indexes

def load_index(category: str) -> Optional[FAISS]:
    """Load a FAISS index."""
    index_dir = DATA_PROCESSED_DIR / category
    
    try:
        logger.info(f"Loading FAISS index from {index_dir}")
        embeddings = OpenAIEmbeddings(api_key=openai_api_key)
        vectorstore = FAISS.load_local(str(index_dir), embeddings)
        logger.info(f"Successfully loaded FAISS index for {category}")
        return vectorstore
    except Exception as e:
        logger.error(f"Error loading FAISS index for {category}: {str(e)}")
        return None

def create_agent_config(index_category: str = "combined") -> Dict[str, Any]:
    """Create agent configuration with the specified index."""
    config = {
        'cache_dir': 'cache',
        'index_dir': str(DATA_PROCESSED_DIR / index_category),
        'temperature': 0.7,
        'openai_api_key': openai_api_key,
    }
    
    logger.info(f"Created agent config using index: {index_category}")
    return config

def test_agent_query(config: Dict[str, Any], query: str) -> str:
    """Test the agent with a query."""
    logger.info(f"Testing agent with config: {config}")
    
    try:
        agent = LangChainAgent(config)
        logger.info("Agent initialized successfully")
        
        response = agent.process_query(query)
        logger.info(f"Agent response: {response[:100]}...")
        return response
    except Exception as e:
        logger.error(f"Error testing agent: {str(e)}")
        return f"Error: {str(e)}"

def main():
    """Update the agent to use our knowledge base."""
    logger.info("Starting agent knowledge base update")
    
    # Check available indexes
    available_indexes = check_indexes()
    if not available_indexes:
        logger.error("No valid indexes found. Please run process_knowledge_base.py first.")
        return
    
    logger.info(f"Available indexes: {available_indexes}")
    
    # Prefer the combined index if available
    index_category = "combined" if "combined" in available_indexes else available_indexes[0]
    logger.info(f"Using index: {index_category}")
    
    # Create agent config
    config = create_agent_config(index_category)
    
    # Test the agent with a sample query
    test_query = "What are the ethical implications of storing user location data?"
    response = test_agent_query(config, test_query)
    
    # Output the config for use in the main application
    config_path = Path(project_root) / "config" / "agent_config.json"
    config_path.parent.mkdir(exist_ok=True)
    
    try:
        with open(config_path, "w") as f:
            json.dump(config, f, indent=2)
        logger.info(f"Saved agent config to {config_path}")
    except Exception as e:
        logger.error(f"Error saving config to {config_path}: {str(e)}")
    
    logger.info("Agent knowledge base update completed")
    logger.info(f"Sample response: {response[:200]}...")

if __name__ == "__main__":
    main() 