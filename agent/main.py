from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import uvicorn
import os
from dotenv import load_dotenv
import logging
from agents.langchain_agent import LangChainAgent
from datetime import datetime
import uuid
from pathlib import Path

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
    title="Ethical AI Assistant API",
    description="""An interactive AI assistant for ethical decision-making in software development.
    Provides both understanding mode for ethical guidance and practice mode for scenario-based learning.""",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StartConversationRequest(BaseModel):
    """Model for starting a new conversation."""
    userId: str = Field(
        ...,
        description="Unique identifier for the user",
        example="user-123"
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
    createdAt: str = Field(
        ...,
        description="Timestamp of conversation creation",
        example="2024-02-20T12:00:00Z"
    )

class ConversationContentResponseDTO(BaseModel):
    """Model for conversation message content."""
    id: Optional[str] = Field(
        None,
        description="Unique identifier for the message",
        example="123e4567-e89b-12d3-a456-426614174000"
    )
    conversationId: str = Field(
        ...,
        description="Conversation ID this message belongs to",
        example="123e4567-e89b-12d3-a456-426614174000"
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
        description="Timestamp of message creation",
        example="2024-02-20T12:00:00Z"
    )
    inPracticeMode: bool = Field(
        False,
        description="Whether this interaction occurred in practice mode"
    )
    practiceScore: Optional[int] = Field(
        None,
        description="Score for practice mode responses (0-100)",
        ge=0,
        le=100
    )

    class Config:
        json_encoders = {
            uuid.UUID: str
        }

class Query(BaseModel):
    """Model for ethical queries."""
    userQuery: str = Field(
        ...,
        description="The ethical question or scenario to analyze",
        example="What are the ethical implications of using facial recognition?"
    )
    conversationId: str = Field(
        ...,
        description="The conversation identifier",
        example="conv-123-456"
    )

class PracticeModeRequest(BaseModel):
    """Model for entering/exiting practice mode."""
    conversationId: str = Field(
        ...,
        description="The conversation identifier",
        example="conv-123-456"
    )
    enter: bool = Field(
        ...,
        description="True to enter practice mode, False to exit",
        example=True
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
        example="Very helpful guidance!"
    )

class FeedbackResponse(BaseModel):
    """Model for feedback submission response."""
    feedbackId: str = Field(
        ...,
        description="Unique identifier for the feedback",
        example="feedback-123"
    )
    success: bool = Field(
        ...,
        description="Whether the feedback was successfully recorded",
        example=True
    )

# Agent instance
agent = None

def get_agent():
    """Get or create the LangChain agent instance."""
    global agent
    if agent is None:
        config = {
            'cache_dir': 'cache',
            'index_dir': 'ethics_index'
        }
        agent = LangChainAgent(config)
    return agent

@app.get("/",
    response_model=Dict[str, str],
    tags=["General"],
    summary="Get API information",
    description="Returns basic information about the API"
)
async def root():
    """Get API information."""
    return {
        "name": "Ethical AI Assistant API",
        "version": "2.0.0",
        "status": "active"
    }

@app.post("/start-conversation",
    response_model=ConversationResponseDTO,
    tags=["Conversation"],
    summary="Start a new conversation",
    description="Initializes a new conversation with the ethical AI assistant"
)
async def start_conversation(
    request: StartConversationRequest,
    agent: LangChainAgent = Depends(get_agent)
) -> ConversationResponseDTO:
    """Start a new conversation."""
    try:
        welcome_message = agent.start_conversation()
        conversation_id = agent.conversation_id
        
        return ConversationResponseDTO(
            conversationId=conversation_id,
            userId=request.userId,
            createdAt=datetime.utcnow().isoformat()
        )
    except Exception as e:
        logger.error(f"Error starting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-response",
    response_model=ConversationContentResponseDTO,
    tags=["Conversation"],
    summary="Process ethical query",
    description="Processes an ethical query and returns guidance"
)
async def generate_response(
    query: Query,
    agent: LangChainAgent = Depends(get_agent)
) -> ConversationContentResponseDTO:
    """Generate a response to an ethical query."""
    try:
        # Process the query
        response = agent.process_query(query.userQuery)
        
        # Create response DTO
        return ConversationContentResponseDTO(
            id=str(uuid.uuid4()),
            conversationId=query.conversationId,
            userQuery=query.userQuery,
            agentResponse=response,
            createdAt=datetime.utcnow().isoformat(),
            inPracticeMode=agent.practice_mode,
            practiceScore=agent.practice_scores[-1] if agent.practice_mode and agent.practice_scores else None
        )
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/practice-mode",
    response_model=ConversationContentResponseDTO,
    tags=["Practice"],
    summary="Toggle practice mode",
    description="Enter or exit practice mode for scenario-based learning"
)
async def toggle_practice_mode(
    request: PracticeModeRequest,
    agent: LangChainAgent = Depends(get_agent)
) -> ConversationContentResponseDTO:
    """Toggle practice mode."""
    try:
        if request.enter:
            response = agent.enter_practice_mode()
        else:
            response = agent.exit_practice_mode()
            
        return ConversationContentResponseDTO(
            id=str(uuid.uuid4()),
            conversationId=request.conversationId,
            agentResponse=response,
            createdAt=datetime.utcnow().isoformat(),
            inPracticeMode=agent.practice_mode,
            practiceScore=None
        )
    except Exception as e:
        logger.error(f"Error toggling practice mode: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/feedback",
    response_model=FeedbackResponse,
    tags=["Feedback"],
    summary="Submit feedback",
    description="Submit feedback for a conversation"
)
async def submit_feedback(
    feedback: FeedbackRequest,
    agent: LangChainAgent = Depends(get_agent)
) -> FeedbackResponse:
    """Submit feedback for a conversation."""
    try:
        feedback_id = agent.save_feedback(
            feedback.conversationId,
            feedback.rating,
            feedback.comment
        )
        return FeedbackResponse(feedbackId=feedback_id, success=True)
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
    """Check API health status."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001) 