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
import uuid

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

# Enable CORS with more permissive settings for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"]  # Expose all headers
)

# Request/Response Models
class StartConversationRequest(BaseModel):
    """Model for starting a new conversation."""
    managerType: str = Field(
        ...,
        description="Type of manager (PUPPETEER, DILUTER, CAMOUFLAGER)",
        example="PUPPETEER"
    )

class ConversationResponseDTO(BaseModel):
    """Model for conversation response."""
    conversationId: str = Field(
        ...,
        description="Unique identifier for the conversation",
        example="conv-123-456"
    )
    userId: str = Field(
        ...,
        description="ID of the user who owns this conversation",
        example="user-123"
    )
    managerType: str = Field(
        ...,
        description="Type of manager used for this conversation",
        example="PUPPETEER"
    )
    createdAt: str = Field(
        ...,
        description="ISO timestamp when the conversation was created",
        example="2023-06-01T12:00:00Z"
    )

class ConversationContentResponseDTO(BaseModel):
    """Model for conversation message content."""
    id: str = Field(
        ...,
        description="Unique identifier for the message",
        example="msg-123-456"
    )
    conversationId: str = Field(
        ...,
        description="Conversation ID this message belongs to",
        example="conv-123-456"
    )
    userQuery: Optional[str] = Field(
        None,
        description="The user's question",
        example="What are the ethical implications of using facial recognition?"
    )
    agentResponse: Optional[str] = Field(
        None,
        description="The agent's response",
        example="Based on ethical guidelines..."
    )
    createdAt: str = Field(
        ...,
        description="ISO timestamp when the message was created",
        example="2023-06-01T12:05:00Z"
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

# Storage for in-memory conversations (for demo purposes)
mock_conversations = {}
mock_messages = {}

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

@app.get("/conversations",
    response_model=List[ConversationResponseDTO],
    tags=["Conversation"],
    summary="Get all conversations",
    description="Retrieves all conversations for the current user"
)
async def get_conversations():
    """Get all conversations."""
    try:
        # Return mock conversations for demo
        return list(mock_conversations.values())
    except Exception as e:
        logger.error(f"Error fetching conversations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/start-conversation",
    response_model=ConversationResponseDTO,
    tags=["Conversation"],
    summary="Start a new conversation",
    description="Initializes a new conversation with the specified manager type"
)
async def start_conversation(
    request: StartConversationRequest,
    agent: EthicalAgent = Depends(get_agent)
) -> ConversationResponseDTO:
    """Initialize a new conversation with the specified manager type."""
    try:
        # Initialize conversation
        agent.start_conversation()
        agent.manager_type = request.managerType
        
        # Create a new conversation ID
        conversation_id = f"conv-{uuid.uuid4()}"
        
        # Create conversation record
        conversation = ConversationResponseDTO(
            conversationId=conversation_id,
            userId="user-mock", # Mock user ID
            managerType=request.managerType,
            createdAt=datetime.now().isoformat()
        )
        
        # Store in mock database
        mock_conversations[conversation_id] = conversation
        mock_messages[conversation_id] = []
        
        return conversation
    except Exception as e:
        logger.error(f"Error starting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations/{conversation_id}/messages",
    response_model=List[ConversationContentResponseDTO],
    tags=["Conversation"],
    summary="Get conversation messages",
    description="Retrieves all messages for a specific conversation"
)
async def get_conversation_messages(conversation_id: str):
    """Get all messages for a conversation."""
    try:
        if conversation_id not in mock_messages:
            return []
        return mock_messages[conversation_id]
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-response",
    response_model=ConversationResponseDTO,
    tags=["Conversation"],
    summary="Process ethical query",
    description="Processes an ethical query and returns guidance"
)
async def generate_response(
    query: Query,
    agent: EthicalAgent = Depends(get_agent)
) -> ConversationResponseDTO:
    """Generate an ethical response based on the query."""
    try:
        # Check if conversation exists
        if query.conversationId not in mock_conversations:
            raise HTTPException(status_code=404, detail="Conversation not found")
            
        # Process the query
        response_text = agent.process_query(
            query=query.userQuery,
            manager_type=mock_conversations[query.conversationId].managerType
        )
        
        # Create message record
        message_id = f"msg-{uuid.uuid4()}"
        message = ConversationContentResponseDTO(
            id=message_id,
            conversationId=query.conversationId,
            userQuery=query.userQuery,
            agentResponse=response_text,
            createdAt=datetime.now().isoformat()
        )
        
        # Store in mock database
        mock_messages[query.conversationId].append(message)
        
        # Return the updated conversation
        return mock_conversations[query.conversationId]
    except Exception as e:
        logger.error(f"Error in generate_response: {str(e)}")
        return ConversationResponseDTO(
            conversationId=query.conversationId,
            userId="user-mock",
            managerType=mock_conversations.get(query.conversationId, {}).get("managerType", "UNKNOWN"),
            createdAt=datetime.now().isoformat()
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
        feedback_id = f"feedback-{uuid.uuid4()}"
        
        # In a real implementation, you would save the feedback to a database
        
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