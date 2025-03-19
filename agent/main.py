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
        description="The conversation identifier",
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
        description="The conversation identifier",
        example="conv-123-456"
    )
    context: Optional[List[Dict]] = Field(
        None,
        description="Additional context for the response",
        example=[{"type": "reference", "content": "Ethics guideline section 2.1"}]
    )

class FeedbackRequest(BaseModel):
    """Model for user feedback."""
    rating: int = Field(
        ...,
        description="Feedback rating (1-5)",
        ge=1,
        le=5,
        example=5
    )
    comment: Optional[str] = Field(
        None,
        description="Optional feedback comment",
        example="Very helpful guidance"
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

@app.post("/start",
    response_model=Dict[str, str],
    tags=["Conversation"],
    summary="Start a conversation",
    description="Starts a new conversation and returns a welcome message"
)
async def start_conversation(agent: EthicalAgent = Depends(get_agent)):
    """Start a new conversation."""
    try:
        welcome_message = agent.start_conversation()
        return {"message": welcome_message}
    except Exception as e:
        logger.error(f"Error starting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
        response = agent.process_query(
            query=query.userQuery,
            manager_type=query.managerType
        )
        
        return ConversationResponse(
            response=response,
            conversationId=query.conversationId
        )
    except Exception as e:
        logger.error(f"Error in generate_response: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/feedback/{query_id}",
    response_model=Dict[str, str],
    tags=["Feedback"],
    summary="Submit feedback",
    description="Submit feedback for a specific response"
)
async def submit_feedback(
    query_id: str,
    feedback: FeedbackRequest,
    agent: EthicalAgent = Depends(get_agent)
) -> Dict[str, str]:
    """Submit feedback for a response."""
    try:
        feedback_id = agent.save_feedback(
            query_id=query_id,
            rating=feedback.rating,
            comment=feedback.comment
        )
        return {"message": "Feedback submitted successfully", "feedback_id": feedback_id}
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        raise HTTPException(status_code=500, detail="Error submitting feedback")

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