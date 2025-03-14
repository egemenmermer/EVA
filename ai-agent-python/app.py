from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List
import uvicorn
import os
import logging
from agents.ethical_agent import EthicalAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app with detailed documentation
app = FastAPI(
    title="Ethical Decision-Making API",
    description="""
    An AI-powered API for providing ethical guidance in software development.
    
    This API helps software professionals navigate ethical challenges by:
    - Analyzing queries against ethical guidelines and case studies
    - Providing role-specific ethical guidance
    - Maintaining conversation context
    - Supporting feedback collection
    
    For detailed documentation on deployment and usage, see our [Documentation](docs/README.md).
    """,
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
    text: str = Field(
        ...,
        description="The ethical question or scenario to analyze",
        example="What are the ethical implications of using facial recognition?"
    )
    conversation_id: Optional[str] = Field(
        None,
        description="Unique identifier for the conversation",
        example="conv-123-456"
    )

class RoleRequest(BaseModel):
    """Model for role selection."""
    role: str = Field(
        ...,
        description="The professional role of the user",
        example="software_engineer"
    )

class ConversationResponse(BaseModel):
    """Model for API responses."""
    response: str = Field(
        ...,
        description="The ethical guidance response",
        example="Based on ethical guidelines..."
    )
    role: Optional[str] = Field(
        None,
        description="The user's professional role",
        example="software_engineer"
    )
    conversation_id: Optional[str] = Field(
        None,
        description="The conversation identifier",
        example="conv-123-456"
    )
    context: Optional[List[Dict]] = Field(
        None,
        description="Relevant ethical guidelines and case studies used",
        example=[{"source": "acm_ethics.pdf", "text": "Privacy must be protected..."}]
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
    """Dependency for getting the ethical agent instance."""
    try:
        config = {
            'model_name': 'meta-llama/Llama-2-8b-chat-hf',
            'api_token': os.environ.get('HUGGINGFACE_TOKEN'),
            'cache_dir': "/var/scratch/xuv668/model_cache"
        }
        agent = EthicalAgent(config)
        logger.info("Ethical Agent initialized successfully")
        return agent
    except Exception as e:
        logger.error(f"Error initializing agent: {str(e)}")
        raise HTTPException(status_code=500, detail="Error initializing ethical agent")

@app.get("/",
    response_model=Dict[str, str],
    tags=["General"],
    summary="Get API information",
    description="Returns basic information about the API"
)
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Ethical Decision-Making API",
        "version": "1.0.0",
        "description": "Provides ethical guidance for software professionals"
    }

@app.get("/roles",
    response_model=Dict[str, str],
    tags=["Roles"],
    summary="Get available roles",
    description="Returns a list of available professional roles and their descriptions"
)
async def get_roles(agent: EthicalAgent = Depends(get_agent)):
    """Get available roles and their descriptions."""
    return {
        role: details["description"]
        for role, details in agent.VALID_ROLES.items()
    }

@app.post("/start",
    response_model=Dict[str, str],
    tags=["Conversation"],
    summary="Start a conversation",
    description="Starts a new conversation and returns a welcome message with role information"
)
async def start_conversation(agent: EthicalAgent = Depends(get_agent)):
    """Start a new conversation and get role information."""
    try:
        welcome_message = agent.start_conversation()
        return {
            "message": welcome_message,
            "conversation_id": agent.conversation_id
        }
    except Exception as e:
        logger.error(f"Error starting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail="Error starting conversation")

@app.post("/set-role",
    response_model=Dict[str, str],
    tags=["Roles"],
    summary="Set user role",
    description="Sets the user's professional role for tailored ethical guidance"
)
async def set_role(
    request: RoleRequest,
    agent: EthicalAgent = Depends(get_agent)
) -> Dict[str, str]:
    """Set the user's role."""
    try:
        success, message = agent.set_user_role(request.role)
        if not success:
            raise HTTPException(status_code=400, detail=message)
        return {"message": message}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting role: {str(e)}")
        raise HTTPException(status_code=500, detail="Error setting role")

@app.post("/query",
    response_model=ConversationResponse,
    tags=["Conversation"],
    summary="Process ethical query",
    description="Processes an ethical query and returns guidance based on the user's role"
)
async def process_query(
    query: Query,
    agent: EthicalAgent = Depends(get_agent)
) -> ConversationResponse:
    """Process an ethical query."""
    try:
        # Update conversation ID if provided
        if query.conversation_id:
            agent.conversation_id = query.conversation_id
            
        # Process query
        response = agent.process_query(query.text)
        
        return ConversationResponse(
            response=response,
            role=agent.user_role,
            conversation_id=agent.conversation_id
        )
        
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing query")

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
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    # Run the API server
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 