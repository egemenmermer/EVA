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

# Request/Response Models
class StartConversationRequest(BaseModel):
    """Model for starting a new conversation."""
    managerType: str = Field(
        ...,
        description="Type of manager (PUPPETEER, DILUTER, CAMOUFLAGER)",
        example="PUPPETEER"
    )

class StartConversationResponse(BaseModel):
    """Model for conversation initialization response."""
    conversationId: str = Field(
        ...,
        description="Unique identifier for the conversation",
        example="conv-123-456"
    )
    message: str = Field(
        ...,
        description="Welcome message",
        example="Welcome to the Ethical AI Assistant..."
    )
    success: bool = Field(
        default=True,
        description="Whether the conversation was successfully initialized"
    )

class Query(BaseModel):
    """Model for ethical queries."""
    userQuery: str = Field(
        ...,
        description="The ethical question or scenario to analyze",
        example="What are the ethical implications of using facial recognition?"
    )
    conversationId: str = Field(
        ...,
        description="The conversation identifier from start_conversation",
        example="conv-123-456"
    )

class ConversationResponse(BaseModel):
    """Model for API responses."""
    response: str = Field(
        ...,
        description="The ethical guidance response",
        example="Based on ethical guidelines..."
    )
    conversationId: str = Field(
        ...,
        description="The conversation identifier",
        example="conv-123-456"
    )
    success: bool = Field(
        default=True,
        description="Whether the response was successfully generated"
    )

class FeedbackRequest(BaseModel):
    """Model for feedback submission."""
    conversationId: str = Field(
        ...,
        description="The conversation identifier",
        example="conv-123-456"
    )
    rating: int = Field(
        ...,
        description="Rating from 1-5",
        ge=1,
        le=5
    )
    comment: Optional[str] = Field(
        None,
        description="Optional feedback comment",
        example="The response was helpful but could be more specific"
    )

class FeedbackResponse(BaseModel):
    """Model for feedback submission response."""
    feedbackId: str = Field(
        ...,
        description="Unique identifier for the feedback",
        example="feedback-123"
    )
    success: bool = Field(
        default=True,
        description="Whether the feedback was successfully recorded"
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

@app.post("/start-conversation",
    response_model=StartConversationResponse,
    tags=["Conversation"],
    summary="Start a new conversation",
    description="Initializes a new conversation with the specified manager type"
)
async def start_conversation(
    request: StartConversationRequest,
    agent: EthicalAgent = Depends(get_agent)
) -> StartConversationResponse:
    """Initialize a new conversation with the specified manager type."""
    try:
        # Initialize conversation and set manager type
        welcome_message = agent.start_conversation()
        agent.manager_type = request.managerType
        
        return StartConversationResponse(
            conversationId=agent.conversation_id,
            message=welcome_message,
            success=True
        )
    except Exception as e:
        logger.error(f"Error starting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-response",
    response_model=ConversationResponse,
    tags=["Conversation"],
    summary="Process ethical query",
    description="Processes an ethical query and returns guidance"
)
async def generate_response(
    query: Query,
    agent: EthicalAgent = Depends(get_agent)
) -> ConversationResponse:
    """Generate an ethical response based on the query."""
    try:
        # Process the query
        response = agent.process_query(
            query=query.userQuery,
            manager_type=agent.manager_type  # Use the manager type set during conversation start
        )
        
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

@app.post("/feedback",
    response_model=FeedbackResponse,
    tags=["Feedback"],
    summary="Submit feedback",
    description="Submit feedback for a conversation"
)
async def submit_feedback(
    feedback: FeedbackRequest,
    agent: EthicalAgent = Depends(get_agent)
) -> FeedbackResponse:
    """Submit feedback for a conversation."""
    try:
        feedback_id = agent.save_feedback(
            query_id=feedback.conversationId,
            rating=feedback.rating,
            comment=feedback.comment
        )
        
        return FeedbackResponse(
            feedbackId=feedback_id,
            success=True
        )
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 