from fastapi import FastAPI, HTTPException, Depends, Header, Request
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
import json
import requests
import traceback

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

# Backend API configuration
BACKEND_BASE_URL = os.getenv("BACKEND_URL", "http://localhost:8443")
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY", "")  # If needed for authentication

# Initialize FastAPI app with detailed documentation
app = FastAPI(
    title="Ethical AI Decision-Making API",
    description="API for ethical decision-making assistance in technology projects",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
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

class GuidelineItem(BaseModel):
    """Model for a relevant ethical guideline."""
    id: str = Field(..., description="Unique identifier for the guideline")
    title: str = Field(..., description="Title of the guideline")
    description: str = Field(..., description="Content of the guideline")
    source: str = Field(..., description="Source document")
    relevance: float = Field(..., description="Relevance score (0-1)")
    category: str = Field(..., description="Category of the guideline")

class CaseStudyItem(BaseModel):
    """Model for a relevant case study."""
    id: str = Field(..., description="Unique identifier for the case study")
    title: str = Field(..., description="Title of the case study")
    summary: str = Field(..., description="Summary of the case study")
    outcome: str = Field(..., description="Outcome or lessons learned")
    source: str = Field(..., description="Source document")
    relevance: float = Field(..., description="Relevance score (0-1)")

class GuidelinesResponse(BaseModel):
    """Model for guidelines response."""
    guidelines: List[GuidelineItem] = Field(..., description="List of relevant ethical guidelines")

class CaseStudiesResponse(BaseModel):
    """Model for case studies response."""
    caseStudies: List[CaseStudyItem] = Field(..., description="List of relevant case studies")

class ConversationContext(BaseModel):
    """Model for conversation context."""
    messages: List[Dict[str, Any]] = Field(
        ..., 
        description="List of conversation messages with role and content"
    )

# Agent instance
agent = None

# Add a dictionary to store conversations and messages in memory
conversation_store = {}
message_store = {}

def get_agent():
    """Get or create the LangChain agent instance."""
    global agent
    if agent is None:
        # Try to load configuration from config file
        config_path = Path('config/agent_config.json')
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                logger.info(f"Loaded agent configuration from {config_path}")
            except Exception as e:
                logger.error(f"Error loading config from {config_path}: {e}")
                # Fallback configuration
                config = {
                    'cache_dir': 'cache',
                    'index_dir': str(Path('data/processed/combined'))
                }
        else:
            logger.warning(f"No configuration file found at {config_path}, using defaults")
            # Default configuration
            config = {
                'cache_dir': 'cache',
                'index_dir': str(Path('data/processed/combined'))
            }
            
        # Add API key to config if available
        if os.getenv('OPENAI_API_KEY'):
            config['openai_api_key'] = os.getenv('OPENAI_API_KEY')
        
        # Verify index directory exists, or find a suitable alternative
        index_dir = Path(config.get('index_dir', ''))
        if not index_dir.exists():
            # Try to find another suitable index directory
            potential_dirs = [
                Path('data/processed/combined'),
                Path('data/processed'),
                Path('data'),
                # Add all category directories
                Path('data/processed/research_papers'),
                Path('data/processed/guidelines'),
                Path('data/processed/case_studies'),
                Path('data/processed/industry_reports')
            ]
            
            for potential_dir in potential_dirs:
                if potential_dir.exists():
                    index_dir = potential_dir
                    logger.info(f"Specified index directory not found, using: {index_dir}")
                    config['index_dir'] = str(index_dir)
                    break
                    
        logger.info(f"Initializing agent with index directory: {config.get('index_dir')}")
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

@app.post("/guidelines/relevant",
    response_model=GuidelinesResponse,
    tags=["Knowledge Base"],
    summary="Get relevant ethical guidelines",
    description="Retrieves ethical guidelines relevant to the current conversation"
)
async def get_relevant_guidelines(
    context: ConversationContext,
    agent: LangChainAgent = Depends(get_agent)
) -> GuidelinesResponse:
    """Get relevant ethical guidelines for the current conversation."""
    try:
        # Extract conversation text for context
        conversation_text = ""
        for message in context.messages:
            role = message.get("role", "")
            content = message.get("content", "")
            if content:
                conversation_text += f"{role}: {content}\n"
        
        # Get relevant guidelines using the agent
        guidelines = agent.get_relevant_guidelines(conversation_text)
        
        return GuidelinesResponse(guidelines=guidelines)
    except Exception as e:
        logger.error(f"Error retrieving guidelines: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/case-studies/relevant",
    response_model=CaseStudiesResponse,
    tags=["Knowledge Base"],
    summary="Get relevant case studies",
    description="Retrieves case studies relevant to the current conversation"
)
async def get_relevant_case_studies(
    context: ConversationContext,
    agent: LangChainAgent = Depends(get_agent)
) -> CaseStudiesResponse:
    """Get relevant case studies for the current conversation."""
    try:
        # Extract conversation text for context
        conversation_text = ""
        for message in context.messages:
            role = message.get("role", "")
            content = message.get("content", "")
            if content:
                conversation_text += f"{role}: {content}\n"
        
        # Get relevant case studies using the agent
        case_studies = agent.get_relevant_case_studies(conversation_text)
        
        return CaseStudiesResponse(caseStudies=case_studies)
    except Exception as e:
        logger.error(f"Error retrieving case studies: {str(e)}")
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

# Frontend compatibility API endpoints
@app.get("/api/v1/conversation",
    tags=["Frontend Compatibility"],
    summary="Get all conversations",
    description="Returns all conversations for the frontend"
)
async def get_conversations(request: Request):
    """Proxy get conversations request to the Java backend"""
    try:
        # Extract the authorization header from the incoming request
        auth_header = request.headers.get("Authorization")
        headers = {
            "Accept": "application/json"
        }
        
        if auth_header:
            headers["Authorization"] = auth_header
        
        # Make a request to the backend API
        response = requests.get(
            f"{BACKEND_BASE_URL}/api/v1/conversation",
            headers=headers
        )
        
        # Check if the request was successful
        if response.status_code == 200:
            conversations = response.json()
            logger.info(f"Retrieved {len(conversations)} conversations from backend")
            return conversations
        else:
            logger.error(f"Backend API error: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        logger.error(f"Error getting conversations: {str(e)}")
        logger.error(traceback.format_exc())
        return []

@app.get("/api/v1/conversation/{conversation_id}/messages",
    tags=["Frontend Compatibility"],
    summary="Get all messages for a conversation",
    description="Returns all messages for a specific conversation"
)
async def get_conversation_messages(conversation_id: str, request: Request):
    """Proxy get conversation messages request to the Java backend"""
    try:
        # Extract the authorization header from the incoming request
        auth_header = request.headers.get("Authorization")
        headers = {
            "Accept": "application/json"
        }
        
        if auth_header:
            headers["Authorization"] = auth_header
            
        # Make a request to the backend API
        response = requests.get(
            f"{BACKEND_BASE_URL}/api/v1/conversation/message/{conversation_id}",
            headers=headers
        )
        
        # Check if the request was successful
        if response.status_code == 200:
            messages = response.json()
            # Transform backend format to frontend expected format if needed
            transformed_messages = []
            for msg in messages:
                transformed_messages.append({
                    "id": msg.get("id", str(uuid.uuid4())),
                    "conversationId": str(conversation_id),
                    "role": "user" if "userQuery" in msg and msg["userQuery"] else "assistant",
                    "content": msg.get("userQuery") if "userQuery" in msg and msg["userQuery"] else msg.get("agentResponse", ""),
                    "createdAt": msg.get("createdAt", datetime.utcnow().isoformat())
                })
                # For each user message, also add the assistant's response
                if "userQuery" in msg and msg["userQuery"] and "agentResponse" in msg and msg["agentResponse"]:
                    transformed_messages.append({
                        "id": str(uuid.uuid4()),
                        "conversationId": str(conversation_id),
                        "role": "assistant",
                        "content": msg.get("agentResponse", ""),
                        "createdAt": msg.get("createdAt", datetime.utcnow().isoformat())
                    })
            
            logger.info(f"Retrieved {len(transformed_messages)} messages for conversation {conversation_id}")
            return transformed_messages
        else:
            logger.error(f"Backend API error: {response.status_code} - {response.text}")
            return []
    except Exception as e:
        logger.error(f"Error getting conversation messages: {str(e)}")
        logger.error(traceback.format_exc())
        return []

@app.get("/api/v1/conversation/message/{message_id}",
    tags=["Frontend Compatibility"],
    summary="Get a specific message",
    description="Returns a specific message by ID for the frontend"
)
async def get_message(message_id: str, request: Request):
    """Proxy get message request to the Java backend (not directly supported)"""
    try:
        # This is a bit tricky since the Java backend doesn't have a direct endpoint for this
        # We'll return an empty object for now - the frontend should use the conversation messages instead
        logger.info(f"Message endpoint not directly supported by backend for ID: {message_id}")
        return {}
    except Exception as e:
        logger.error(f"Error getting message: {str(e)}")
        logger.error(traceback.format_exc())
        return {}

@app.post("/api/v1/conversation",
    tags=["Frontend Compatibility"],
    summary="Create a new conversation",
    description="Creates a new conversation for the frontend"
)
async def create_conversation(
    request: Request,
    agent: LangChainAgent = Depends(get_agent)
):
    """Proxy create conversation request to the Java backend"""
    try:
        # Extract request body
        request_body = await request.json()
        
        # Get manager type from request or use default
        manager_type = request_body.get("managerType", "PUPPETEER")
        user_id = request_body.get("userId", "user-1")
        
        # Format the request for the Java backend
        backend_request = {
            "userId": user_id,
            "managerType": manager_type
        }
        
        # Extract the authorization header from the incoming request
        auth_header = request.headers.get("Authorization")
        headers = {
            "Content-Type": "application/json", 
            "Accept": "application/json"
        }
        
        if auth_header:
            headers["Authorization"] = auth_header
        
        # Make a request to the backend API
        response = requests.post(
            f"{BACKEND_BASE_URL}/api/v1/conversation",
            json=backend_request,
            headers=headers
        )
        
        # Check if the request was successful
        if response.status_code == 200:
            conversation = response.json()
            logger.info(f"Created conversation with ID: {conversation.get('id', 'unknown')}")
            
            # Initialize a new agent conversation
            agent.start_conversation()
            
            return {
                "id": conversation.get("conversationId", str(uuid.uuid4())),
                "userId": conversation.get("userId", user_id),
                "title": conversation.get("title", "New Conversation"),
                "managerType": conversation.get("managerType", manager_type),
                "createdAt": conversation.get("createdAt", datetime.utcnow().isoformat()),
                "updatedAt": conversation.get("updatedAt", datetime.utcnow().isoformat())
            }
        else:
            logger.error(f"Backend API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to create conversation")
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/conversation/message",
    tags=["Frontend Compatibility"],
    summary="Send a message",
    description="Sends a message in a conversation for the frontend"
)
async def send_message(
    request: Request,
    agent: LangChainAgent = Depends(get_agent)
):
    """Proxy send message request to the Java backend"""
    try:
        # Extract request body
        request_body = await request.json()
        
        # Extract data from the request
        conversation_id = request_body.get("conversationId")
        content = request_body.get("content")
        
        if not content:
            raise HTTPException(status_code=400, detail="Message content is required")
        
        # Format the request for the Java backend
        backend_request = {
            "conversationId": conversation_id,
            "userQuery": content
        }
        
        # Extract the authorization header from the incoming request
        auth_header = request.headers.get("Authorization")
        headers = {
            "Content-Type": "application/json", 
            "Accept": "application/json"
        }
        
        if auth_header:
            headers["Authorization"] = auth_header
        
        # Make a request to the backend API
        response = requests.post(
            f"{BACKEND_BASE_URL}/api/v1/conversation/message",
            json=backend_request,
            headers=headers
        )
        
        # Check if the request was successful
        if response.status_code == 200:
            message_data = response.json()
            logger.info(f"Sent message for conversation ID: {conversation_id}")
            
            # Process the query with the agent as well
            agent.process_query(content, session_id=conversation_id)
            
            return {
                "id": str(uuid.uuid4()),
                "conversationId": conversation_id,
                "role": "assistant",
                "content": message_data.get("agentResponse", "Sorry, I couldn't process your request."),
                "createdAt": message_data.get("createdAt", datetime.utcnow().isoformat())
            }
        else:
            logger.error(f"Backend API error: {response.status_code} - {response.text}")
            # Fallback to direct agent response if backend fails
            response = agent.process_query(content, session_id=conversation_id)
            return {
                "id": str(uuid.uuid4()),
                "conversationId": conversation_id,
                "role": "assistant",
                "content": response,
                "createdAt": datetime.utcnow().isoformat()
            }
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        logger.error(traceback.format_exc())
        # Try to provide a fallback response
        try:
            response_content = agent.process_query(content, session_id=conversation_id)
            return {
                "id": str(uuid.uuid4()),
                "conversationId": conversation_id,
                "role": "assistant",
                "content": response_content,
                "createdAt": datetime.utcnow().isoformat()
            }
        except:
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001) 