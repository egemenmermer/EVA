#!/usr/bin/env python3
import os
import sys
import logging
from pathlib import Path
import PyPDF2
import json
import datetime
import re
from typing import List, Dict, Any

# Add project root to Python path
project_root = str(Path(__file__).parent.parent)
sys.path.append(project_root)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/knowledge_base.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import LangChain components
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Define paths
DATA_RAW_DIR = Path(project_root) / "data" / "raw"
DATA_PROCESSED_DIR = Path(project_root) / "data" / "processed"
CATEGORIES = ["research_papers", "guidelines", "case_studies", "industry_reports"]

# Create processed directory if it doesn't exist
DATA_PROCESSED_DIR.mkdir(exist_ok=True, parents=True)

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
    logger.warning("No OpenAI API key found. FAISS index creation will likely fail.")

def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract text from a PDF file."""
    logger.info(f"Processing PDF: {pdf_path}")
    text = ""
    
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            num_pages = len(reader.pages)
            
            logger.info(f"PDF has {num_pages} pages")
            
            for page_num in range(num_pages):
                page = reader.pages[page_num]
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
        
        logger.info(f"Successfully extracted {len(text)} characters")
        return text
    except Exception as e:
        logger.error(f"Error extracting text from {pdf_path}: {str(e)}")
        return ""

def process_category(category: str) -> List[Dict[str, Any]]:
    """Process all PDFs in a category folder."""
    category_dir = DATA_RAW_DIR / category
    if not category_dir.exists():
        logger.warning(f"Category directory does not exist: {category_dir}")
        return []
    
    documents = []
    pdf_files = list(category_dir.glob("*.pdf"))
    logger.info(f"Found {len(pdf_files)} PDF files in category: {category}")
    
    for pdf_path in pdf_files:
        text = extract_text_from_pdf(pdf_path)
        if text:
            documents.append({
                "content": text,
                "source": str(pdf_path.name),
                "category": category,
                "metadata": {
                    "filename": pdf_path.name,
                    "category": category,
                    "processed_date": datetime.datetime.now().isoformat()
                }
            })
    
    logger.info(f"Processed {len(documents)} documents in category: {category}")
    return documents

def create_chunks(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Split documents into chunks for better retrieval."""
    logger.info(f"Creating chunks from {len(documents)} documents")
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    
    chunks = []
    for doc in documents:
        doc_chunks = text_splitter.split_text(doc["content"])
        logger.info(f"Split document '{doc['source']}' into {len(doc_chunks)} chunks")
        
        for i, chunk in enumerate(doc_chunks):
            chunks.append({
                "content": chunk,
                "source": doc["source"],
                "category": doc["category"],
                "chunk_id": i,
                "metadata": {
                    **doc["metadata"],
                    "chunk_id": i,
                    "total_chunks": len(doc_chunks)
                }
            })
    
    logger.info(f"Created a total of {len(chunks)} chunks")
    return chunks

def create_faiss_index(chunks: List[Dict[str, Any]], category: str):
    """Create a FAISS index for a category."""
    logger.info(f"Creating FAISS index for category: {category}")
    
    try:
        # Extract texts and metadatas for FAISS
        texts = [chunk["content"] for chunk in chunks]
        metadatas = [chunk["metadata"] for chunk in chunks]
        
        # Initialize embeddings with API key
        embeddings = OpenAIEmbeddings(api_key=openai_api_key)
        
        # Create FAISS index
        index_dir = DATA_PROCESSED_DIR / category
        index_dir.mkdir(exist_ok=True)
        
        vectorstore = FAISS.from_texts(
            texts=texts,
            embedding=embeddings,
            metadatas=metadatas
        )
        
        # Save the index
        vectorstore.save_local(str(index_dir))
        
        # Save metadata about the index
        index_metadata = {
            "category": category,
            "document_count": len(set(chunk["source"] for chunk in chunks)),
            "chunk_count": len(chunks),
            "created_at": datetime.datetime.now().isoformat(),
            "documents": list(set(chunk["source"] for chunk in chunks))
        }
        
        with open(index_dir / "metadata.json", "w") as f:
            json.dump(index_metadata, f, indent=2)
        
        logger.info(f"Successfully created FAISS index for {category} with {len(chunks)} chunks")
        return True
    except Exception as e:
        logger.error(f"Error creating FAISS index for {category}: {str(e)}")
        return False

def create_combined_index(all_chunks: List[Dict[str, Any]]):
    """Create a combined FAISS index with all categories."""
    logger.info(f"Creating combined FAISS index with {len(all_chunks)} chunks")
    
    try:
        # Extract texts and metadatas for FAISS
        texts = [chunk["content"] for chunk in all_chunks]
        metadatas = [chunk["metadata"] for chunk in all_chunks]
        
        # Initialize embeddings with API key
        embeddings = OpenAIEmbeddings(api_key=openai_api_key)
        
        # Create FAISS index
        index_dir = DATA_PROCESSED_DIR / "combined"
        index_dir.mkdir(exist_ok=True)
        
        vectorstore = FAISS.from_texts(
            texts=texts,
            embedding=embeddings,
            metadatas=metadatas
        )
        
        # Save the index
        vectorstore.save_local(str(index_dir))
        
        # Save metadata about the index
        index_metadata = {
            "category": "combined",
            "document_count": len(set(chunk["source"] for chunk in all_chunks)),
            "chunk_count": len(all_chunks),
            "created_at": datetime.datetime.now().isoformat(),
            "categories": list(set(chunk["category"] for chunk in all_chunks)),
            "documents": list(set(chunk["source"] for chunk in all_chunks))
        }
        
        with open(index_dir / "metadata.json", "w") as f:
            json.dump(index_metadata, f, indent=2)
        
        logger.info(f"Successfully created combined FAISS index with {len(all_chunks)} chunks")
        return True
    except Exception as e:
        logger.error(f"Error creating combined FAISS index: {str(e)}")
        return False

def main():
    """Process all categories and create FAISS indexes."""
    logger.info("Starting knowledge base processing")
    
    all_chunks = []
    
    for category in CATEGORIES:
        logger.info(f"Processing category: {category}")
        
        # Process PDFs in the category
        documents = process_category(category)
        if not documents:
            logger.warning(f"No documents found in category: {category}")
            continue
        
        # Create chunks from the documents
        chunks = create_chunks(documents)
        all_chunks.extend(chunks)
        
        # Create FAISS index for the category
        success = create_faiss_index(chunks, category)
        if success:
            logger.info(f"Successfully created index for {category}")
        else:
            logger.error(f"Failed to create index for {category}")
    
    # Create a combined index with all chunks
    create_combined_index(all_chunks)
    
    logger.info("Knowledge base processing completed")

if __name__ == "__main__":
    main() 