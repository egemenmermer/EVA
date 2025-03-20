#!/usr/bin/env python3
import os
import sys
import logging
import argparse
from pathlib import Path
from dotenv import load_dotenv
import shutil

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from agents.ethical_agent import EthicalAgent

# Create logs directory if it doesn't exist
Path("logs").mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)



def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Run the Ethical Decision-Making Assistant"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="meta-llama/Llama-2-7b-chat-hf",
        help="Model name for the LLM"
    )
    parser.add_argument(
        "--cache-dir",
        type=str,
        default="cache",
        help="Directory for caching models and embeddings"
    )
    parser.add_argument(
        "--index-dir",
        type=str,
        default="data/processed",
        help="Directory containing the processed documents and index"
    )
    return parser.parse_args()

def check_system_resources():
    """Check if system has enough resources."""
    try:
        # Check disk space
        cache_dir = "cache"
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir)
            
        total, used, free = shutil.disk_usage(cache_dir)
        free_gb = free / (1024**3)
        
        if free_gb < 10:  # Need at least 10GB free
            print(f"\n⚠️  Warning: Low disk space ({free_gb:.1f}GB free)")
            print("The indexing process requires approximately 10GB of free space.")
            response = input("Do you want to continue anyway? (y/n): ")
            if response.lower() != 'y':
                sys.exit(1)
                
        # Check RAM
        import psutil
        ram_gb = psutil.virtual_memory().available / (1024**3)
        if ram_gb < 4:  # Need at least 4GB free RAM
            print(f"\n⚠️  Warning: Low memory ({ram_gb:.1f}GB available)")
            print("The process may be slow or fail due to limited memory.")
            response = input("Do you want to continue anyway? (y/n): ")
            if response.lower() != 'y':
                sys.exit(1)
                
    except Exception as e:
        logger.warning(f"Could not check system resources: {e}")

def main():
    """Run the ethical agent in interactive mode."""
    try:
        # Check system resources first
        check_system_resources()
        
        # Load environment variables
        load_dotenv()
        
        # Parse command line arguments
        args = parse_args()
        
        # Optimize for M1 Mac
        os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"  # Enable MPS fallback
        
        # Set memory-efficient defaults for M1
        config = {
            'model_name': args.model,
            'api_token': os.getenv('HUGGINGFACE_TOKEN'),
            'cache_dir': 'cache',
            'batch_size': 16,  # Smaller batch size for M1
            'memory_efficient': True,
            'index_dir': args.index_dir,
            'documents_path': os.path.join(args.index_dir, 'documents.json'),
            'index_path': os.path.join(args.index_dir, 'faiss.index')
        }
        
        # Print startup information
        print("\nEthical Decision-Making Assistant")
        print("=" * 40)
        print("I'm here to help you navigate ethical challenges in your work.")
        print("Please share your ethical concern or question, and I'll guide you through it.")
        
        print("\nInitializing assistant...")
        agent = EthicalAgent(config)
        
        # Start conversation
        agent.handle_conversation()
        
    except Exception as e:
        logger.error(f"Error in main: {str(e)}")
        print("\nAn error occurred. Please check the logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main() 