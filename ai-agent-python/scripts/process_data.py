#!/usr/bin/env python3
import os
import sys
import logging
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

from data_processing.pipeline import DataPipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/data_processing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Process ethical documents through the data pipeline"
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default="data",
        help="Directory containing raw and processed data"
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
        default="ethics_index",
        help="Directory for storing FAISS index and related files"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=512,
        help="Size of text chunks"
    )
    parser.add_argument(
        "--overlap",
        type=int,
        default=50,
        help="Overlap between chunks"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force reprocessing even if processed data exists"
    )
    return parser.parse_args()

def main():
    """Run the data processing pipeline."""
    try:
        # Load environment variables
        load_dotenv()
        
        # Parse arguments
        args = parse_args()
        
        # Create pipeline configuration
        config = {
            "data_dir": args.data_dir,
            "cache_dir": args.cache_dir,
            "index_dir": args.index_dir,
            "chunk_size": args.chunk_size,
            "overlap": args.overlap
        }
        
        # Initialize pipeline
        pipeline = DataPipeline(config)
        
        # Check if processed data exists
        if not args.force and pipeline.load_processed_data() is not None:
            logger.info("Processed data already exists. Use --force to reprocess.")
            return
            
        # Process documents
        logger.info("Starting document processing...")
        documents = pipeline.process_documents()
        
        # Log processing results
        logger.info(
            f"Processing complete. "
            f"Processed {len(documents['guidelines'])} guidelines and "
            f"{len(documents['case_studies'])} case studies."
        )
        
    except Exception as e:
        logger.error(f"Error processing documents: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 