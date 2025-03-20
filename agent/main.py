from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import uvicorn
import os
from dotenv import load_dotenv
import logging
from agents.ethical_agent import EthicalAgent
from datetime import datetime

# Load environment variables
load_dotenv()

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

# Initialize FastAPI app with detailed documentation
app = FastAPI(
    title="Ethical AI Assistant",
    description="API for ethical decision-making in software development",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models with detailed documentation
class Query(BaseModel):
    """Model for ethical queries."""
    userQuery: str = Field(
        ...,
        description="The ethical question or scenario to analyze",
        example="What are the ethical implications of using facial recognition?"
    )
    managerType: str = Field(
        ...,
        description="Type of manager (PUPPETEER, DILUTER, CAMOUFLAGER)",
        example="PUPPETEER"
    )
    conversationId: Optional[str] = Field(
        None,
        description="The conversation identifier (handled by the backend)",
        example="conv-123-456"
    )

class ConversationResponse(BaseModel):
    """Model for API responses."""
    response: str = Field(
        ...,
        description="The ethical guidance response",
        example="Based on ethical guidelines..."
    )
    conversationId: Optional[str] = Field(
        None,
        description="The conversation identifier (passed through from request)",
        example="conv-123-456"
    )
    success: bool = Field(
        default=True,
        description="Whether the response was successfully generated"
    )

# Dependency for getting the ethical agent
def get_agent():
    """Get or create an EthicalAgent instance."""
    try:
        config = {
            'api_token': os.environ.get('HUGGINGFACE_TOKEN'),
            'cache_dir': 'cache',
            'index_dir': 'data/processed'
        }
        return EthicalAgent(config)
    except Exception as e:
        logger.error(f"Failed to initialize EthicalAgent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/",
    response_model=Dict[str, str],
    tags=["General"],
    summary="Get API information",
    description="Returns basic information about the API"
)
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Ethical AI Assistant",
        "version": "1.0.0",
        "description": "Provides ethical guidance for software professionals"
    }

@app.post("/generate-response",
    response_model=ConversationResponse,
    tags=["Conversation"],
    summary="Process ethical query",
    description="Processes an ethical query and returns guidance based on manager type"
)
async def generate_response(
    query: Query,
    agent: EthicalAgent = Depends(get_agent)
) -> ConversationResponse:
    """Generate an ethical response based on the query and manager type."""
    try:
        # Extract user query
        user_query = query.userQuery
        
        # Log the query details for debugging
        logger.info(f"Processing query: '{user_query[:50]}...' with manager type: {query.managerType}")
        
        # Process the query with the agent
        response = agent.process_query(
            query=user_query,
            manager_type=query.managerType
        )
        
        logger.info(f"Generated response (first 50 chars): '{response[:50]}...'")
        
        # Return the response with the conversation ID passed through
        return ConversationResponse(
            response=response,
            conversationId=query.conversationId,
            success=True
        )
    except Exception as e:
        logger.error(f"Error in generate_response: {str(e)}")
        return ConversationResponse(
            response=f"I apologize, but I'm having difficulty processing your request right now. Error: {str(e)}",
            conversationId=query.conversationId,
            success=False
        )

@app.get("/health",
    response_model=Dict[str, str],
    tags=["Monitoring"],
    summary="Health check",
    description="Check the health status of the API"
)
async def health_check():
    """Check the health status of the API."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    # Run the API server
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 