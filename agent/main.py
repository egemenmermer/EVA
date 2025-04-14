from fastapi import FastAPI, HTTPException, Depends, Header, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any, Union
import uvicorn
import os
from dotenv import load_dotenv
import logging
from agents.langchain_agent import LangChainAgent
from datetime import datetime, UTC
import uuid
from pathlib import Path
import json
import requests
import traceback
import asyncio
import httpx
import concurrent.futures
from langchain.schema import SystemMessage, HumanMessage
from langchain.chat_models import ChatOpenAI
from fastapi.responses import JSONResponse

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
    temperature: Optional[float] = Field(
        None,
        description="Temperature for response generation (0.0-1.0)",
        example=0.7,
        ge=0.0,
        le=1.0
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

def get_agent():
    """Create a new agent instance for each request to avoid state sharing."""
    try:
        # Try to load configuration from config file
        config_path = Path('config/agent_config.json')
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                logger.info("Loaded agent configuration from config file")
            except Exception as e:
                logger.error(f"Error loading config from {config_path}: {e}")
                # Fallback configuration
                config = {
                    'cache_dir': 'cache',
                    'index_dir': str(Path('data/processed/combined')),
                    'openai_api_key': os.getenv('OPENAI_API_KEY')
                }
        else:
            logger.info("No configuration file found, using default config")
            # Default configuration
            config = {
                'cache_dir': 'cache',
                'index_dir': str(Path('data/processed/combined')),
                'openai_api_key': os.getenv('OPENAI_API_KEY')
            }
            
        # IMPORTANT: Create a new agent instance for each request
        # This ensures no state is shared between different conversations
        new_agent = LangChainAgent(config)
        return new_agent
        
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        # Return a basic agent as fallback
        fallback_config = {
            'openai_api_key': os.getenv('OPENAI_API_KEY')
        }
        return LangChainAgent(fallback_config)

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
    """Start a new conversation - stateless version."""
    try:
        # Generate a unique ID instead of using agent state
        conversation_id = str(uuid.uuid4())
        
        # Get the time now
        now = datetime.utcnow().isoformat()
        
        # Return a simple response without storing state in the agent
        return ConversationResponseDTO(
            conversationId=conversation_id,
            userId=request.userId,
            createdAt=now
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
    """Generate a response to an ethical query - stateless version."""
    try:
        logger.info(f"Generating response for conversation ID: {query.conversationId}")
        logger.info(f"User query: {query.userQuery[:50]}...")
        
        # Use OpenAI directly without agent state
        from langchain.chat_models import ChatOpenAI
        
        # Get manager type from conversation if available
        manager_type = None
        temperature = 0.7  # Default temperature
        
        try:
            # Try to get conversation details from the backend
            auth_header = None
            for header in ["authorization", "Authorization"]:
                if header in getattr(query, "__dict__", {}).get("headers", {}):
                    auth_header = query.__dict__["headers"][header]
                    break
            
            headers = {
                "Accept": "application/json"
            }
            if auth_header:
                headers["Authorization"] = auth_header
            
            # Make a request to get conversation details for manager type
            response = requests.get(
                f"{BACKEND_BASE_URL}/api/v1/conversation/{query.conversationId}",
                headers=headers,
                timeout=3
            )
            
            if response.status_code == 200:
                conversation_data = response.json()
                manager_type = conversation_data.get("managerType")
                
                # Get temperature from the conversation if available
                if "temperature" in conversation_data:
                    try:
                        temp_value = float(conversation_data.get("temperature"))
                        if 0 <= temp_value <= 1:
                            temperature = temp_value
                            logger.info(f"Using temperature from conversation: {temperature}")
                    except (ValueError, TypeError):
                        pass
                
                logger.info(f"Retrieved manager type from backend: {manager_type}")
                
                # Also update title if it's "New Conversation"
                if conversation_data.get("title") == "New Conversation":
                    # Generate a title from the query
                    title = query.userQuery[:50] + ("..." if len(query.userQuery) > 50 else "")
                    
                    # Update the title
                    title_update_response = requests.post(
                        f"{BACKEND_BASE_URL}/api/v1/conversation/{query.conversationId}/update-title",
                        json={"title": title},
                        headers=headers,
                        timeout=3
                    )
                    
                    if title_update_response.status_code == 200:
                        logger.info(f"Updated conversation title to: {title}")
        except Exception as e:
            logger.warning(f"Could not retrieve conversation details: {str(e)}")
        
        # Try to get temperature from the query object if it has it
        if hasattr(query, "temperature"):
            try:
                temp_value = float(query.temperature)
                if 0 <= temp_value <= 1:
                    temperature = temp_value
                    logger.info(f"Using temperature from request: {temperature}")
            except (ValueError, TypeError):
                pass
        
        llm = ChatOpenAI(
            model_name="gpt-3.5-turbo",
            temperature=temperature,
            openai_api_key=os.getenv('OPENAI_API_KEY')
        )
        
        # Create a system prompt that incorporates the manager type if available
        system_message = """You are an ethical AI assistant that helps with ethical decision-making in technology.
        Provide thoughtful, nuanced guidance based on ethical frameworks and principles.
        Focus on helping the user understand ethical implications and make informed decisions."""
        
        if manager_type:
            system_message += f"\n\nThe user has selected '{manager_type}' as their preferred interaction style."
        
        # Make a direct call to the LLM
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": query.userQuery}
        ]
        
        # Process the query with proper error handling
        try:
            response = llm.predict_messages(messages)
            content = response.content
            logger.info(f"Generated response (first 50 chars): {content[:50]}...")
        except Exception as llm_error:
            logger.error(f"Error from LLM: {str(llm_error)}")
            content = """I apologize, but I encountered an error generating a response. 

Here are some general ethical principles to consider:
- Respect for autonomy and individual rights
- Fairness and non-discrimination
- Transparency in AI systems
- Accountability for technology outcomes
- Privacy protection

Please try again with a more specific question about your ethical concern."""
        
        # Create response DTO
        return ConversationContentResponseDTO(
            id=str(uuid.uuid4()),
            conversationId=query.conversationId,
            userQuery=query.userQuery,
            agentResponse=content,
            content=content,  # Adding content field for frontend compatibility
            role="assistant",  # Adding role field for frontend compatibility
            createdAt=datetime.utcnow().isoformat(),
            inPracticeMode=False,
            practiceScore=None
        )
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return a fallback response instead of raising an exception
        # This ensures the frontend always gets a response
        return ConversationContentResponseDTO(
            id=str(uuid.uuid4()),
            conversationId=getattr(query, "conversationId", "unknown"),
            userQuery=getattr(query, "userQuery", ""),
            agentResponse="I apologize, but I encountered an error processing your request. Please try again with a different question.",
            content="I apologize, but I encountered an error processing your request. Please try again with a different question.",
            role="assistant",
            createdAt=datetime.utcnow().isoformat(),
            inPracticeMode=False,
            practiceScore=None
        )

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
    """Toggle practice mode - stateless version that simply acknowledges the request."""
    try:
        # Simply generate a response message without changing agent state
        if request.enter:
            response = "Entering practice mode. I'll provide practical ethical scenarios and feedback on your responses."
        else:
            response = "Exiting practice mode. Let's continue our conversation about ethical decision-making."
            
        return ConversationContentResponseDTO(
            id=str(uuid.uuid4()),
            conversationId=request.conversationId,
            agentResponse=response,
            createdAt=datetime.utcnow().isoformat(),
            inPracticeMode=request.enter,
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
    """Submit feedback without relying on agent state."""
    try:
        # Generate a unique ID for this feedback
        feedback_id = str(uuid.uuid4())
        
        # Create a feedback record
        feedback_record = {
            "id": feedback_id,
            "conversationId": feedback.conversationId,
            "rating": feedback.rating,
            "comment": feedback.comment,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Save feedback to a file instead of using agent state
        feedback_dir = Path("feedback")
        feedback_dir.mkdir(exist_ok=True)
        
        feedback_file = feedback_dir / f"{feedback_id}.json"
        with open(feedback_file, "w") as f:
            json.dump(feedback_record, f, indent=2)
            
        logger.info(f"Saved feedback {feedback_id} for conversation {feedback.conversationId}")
        
        return FeedbackResponse(feedbackId=feedback_id, success=True)
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        # Still return success to avoid disrupting the UI
        return FeedbackResponse(
            feedbackId=str(uuid.uuid4()), 
            success=False
        )

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
    """Get relevant ethical guidelines using the vectorstore without storing conversation state."""
    try:
        # Extract conversation text for context
        conversation_text = ""
        for message in context.messages:
            role = message.get("role", "")
            content = message.get("content", "")
            if content:
                conversation_text += f"{role}: {content}\n"
        
        # Use the agent's vector store capabilities but without storing state
        # This retrieves guidelines from FAISS but doesn't change the agent's conversation state
        try:
            # Check if a vectorstore is available
            if not hasattr(agent, 'vectorstore') or agent.vectorstore is None:
                logger.warning("No vector store available for guidelines search")
                # Return fallback guidelines if no vectorstore
                return GuidelinesResponse(guidelines=[
                    {
                        "id": str(uuid.uuid4()),
                        "title": "Data Minimization",
                        "description": "Only collect the minimum amount of data necessary for your application to function properly.",
                        "source": "General Ethical Principles",
                        "relevance": 0.95,
                        "category": "Privacy"
                    }
                ])
                
            # Use the vectorstore but in a stateless way
            # Search for similar documents with the conversation text
            search_results = agent.vectorstore.similarity_search_with_score(conversation_text, k=5)
            
            # Format the search results as guidelines
            guidelines = []
            for doc, score in search_results:
                # Only include documents of type 'guideline'
                if doc.metadata.get('type') == 'guideline' or 'guideline' in doc.metadata.get('source', '').lower():
                    guideline = {
                        "id": str(uuid.uuid4()),
                        "title": doc.metadata.get('title', 'Ethical Guideline'),
                        "description": doc.page_content,
                        "source": doc.metadata.get('source', 'Unknown Source'),
                        "relevance": float(1.0 - min(score / 2.0, 0.9)),  # Convert distance to relevance score
                        "category": doc.metadata.get('category', 'Ethics')
                    }
                    guidelines.append(guideline)
            
            # If no guidelines found, provide a fallback
            if not guidelines:
                guidelines = [{
                    "id": str(uuid.uuid4()),
                    "title": "Data Minimization",
                    "description": "Only collect the minimum amount of data necessary for your application to function properly.",
                    "source": "General Ethical Principles",
                    "relevance": 0.95,
                    "category": "Privacy"
                }]
                
            return GuidelinesResponse(guidelines=guidelines)
            
        except Exception as search_error:
            logger.error(f"Error searching vector store: {str(search_error)}")
            # Return fallback guidelines
            return GuidelinesResponse(guidelines=[
                {
                    "id": str(uuid.uuid4()),
                    "title": "Data Minimization",
                    "description": "Only collect the minimum amount of data necessary for your application to function properly.",
                    "source": "General Ethical Principles",
                    "relevance": 0.95,
                    "category": "Privacy"
                }
            ])
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
    """Get relevant case studies using the vectorstore without storing conversation state."""
    try:
        # Extract conversation text for context
        conversation_text = ""
        for message in context.messages:
            role = message.get("role", "")
            content = message.get("content", "")
            if content:
                conversation_text += f"{role}: {content}\n"
        
        # Use the agent's vector store capabilities but without storing state
        try:
            # Check if a vectorstore is available
            if not hasattr(agent, 'vectorstore') or agent.vectorstore is None:
                logger.warning("No vector store available for case studies search")
                # Return fallback case studies if no vectorstore
                return CaseStudiesResponse(caseStudies=[
                    {
                        "id": str(uuid.uuid4()),
                        "title": "Cambridge Analytica Data Scandal",
                        "summary": "Cambridge Analytica collected personal data from millions of Facebook users without consent for political targeting.",
                        "outcome": "Resulted in major regulatory changes and heightened awareness about data privacy.",
                        "source": "Data Privacy Case Studies",
                        "relevance": 0.9
                    }
                ])
                
            # Use the vectorstore but in a stateless way
            search_results = agent.vectorstore.similarity_search_with_score(conversation_text, k=5)
            
            # Format the search results as case studies
            case_studies = []
            for doc, score in search_results:
                # Only include documents of type 'case_study'
                if doc.metadata.get('type') == 'case_study' or 'case' in doc.metadata.get('source', '').lower():
                    # Extract outcome from metadata or content if available
                    content = doc.page_content
                    outcome = doc.metadata.get('outcome', 'No specific outcome recorded')
                    if "Outcome:" in content:
                        content_parts = content.split("Outcome:")
                        summary = content_parts[0].strip()
                        outcome = content_parts[1].strip()
                    else:
                        summary = content
                    
                    case_study = {
                        "id": str(uuid.uuid4()),
                        "title": doc.metadata.get('title', 'Case Study'),
                        "summary": summary,
                        "outcome": outcome,
                        "source": doc.metadata.get('source', 'Unknown Source'),
                        "relevance": float(1.0 - min(score / 2.0, 0.9))  # Convert distance to relevance score
                    }
                    case_studies.append(case_study)
            
            # If no case studies found, provide a fallback
            if not case_studies:
                case_studies = [{
                    "id": str(uuid.uuid4()),
                    "title": "Cambridge Analytica Data Scandal",
                    "summary": "Cambridge Analytica collected personal data from millions of Facebook users without consent for political targeting.",
                    "outcome": "Resulted in major regulatory changes and heightened awareness about data privacy.",
                    "source": "Data Privacy Case Studies",
                    "relevance": 0.9
                }]
                
            return CaseStudiesResponse(caseStudies=case_studies)
            
        except Exception as search_error:
            logger.error(f"Error searching vector store: {str(search_error)}")
            # Return fallback case studies
            return CaseStudiesResponse(caseStudies=[
                {
                    "id": str(uuid.uuid4()),
                    "title": "Cambridge Analytica Data Scandal",
                    "summary": "Cambridge Analytica collected personal data from millions of Facebook users without consent for political targeting.",
                    "outcome": "Resulted in major regulatory changes and heightened awareness about data privacy.",
                    "source": "Data Privacy Case Studies",
                    "relevance": 0.9
                }
            ])
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

@app.get("/api/v1/conversation/message/{conversation_id}",
    tags=["Frontend Compatibility"],
    summary="Get all messages for a conversation",
    description="Returns all messages for a specific conversation"
)
async def get_conversation_messages(conversation_id: str, request: Request):
    """Get messages for a conversation with consistent format for the frontend"""
    try:
        # Extract the authorization header from the incoming request
        auth_header = request.headers.get("Authorization")
        headers = {
            "Content-Type": "application/json", 
            "Accept": "application/json"
        }
        
        if auth_header:
            headers["Authorization"] = auth_header
            
        # Log the request
        logger.info(f"Getting messages for conversation ID: {conversation_id}")
        
        try:
            # Make a request to the backend API
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: requests.get(
                        f"{BACKEND_BASE_URL}/api/v1/conversation/message/{conversation_id}",
                        headers=headers,
                        timeout=5
                    )
                ),
                timeout=8
            )
            
            if response.status_code == 200:
                messages = response.json()
                logger.info(f"Retrieved {len(messages)} messages for conversation {conversation_id}")
                
                # Transform messages to ensure they have role and content fields
                transformed_messages = []
                
                # Process messages in pairs (user query followed by agent response)
                for msg in messages:
                    # Create a new message with all required fields
                    transformed_msg = {
                        "id": msg.get("id") or str(uuid.uuid4()),
                        "conversationId": msg.get("conversationId") or conversation_id,
                        "createdAt": msg.get("createdAt") or datetime.utcnow().isoformat()
                    }
                    
                    # Handle both old and new message formats
                    if "role" in msg and "content" in msg:
                        # Already in the new format
                        transformed_msg["role"] = msg["role"]
                        transformed_msg["content"] = msg["content"]
                        transformed_messages.append(transformed_msg)
                    else:
                        # Old format with userQuery/agentResponse
                        if "userQuery" in msg and msg.get("userQuery"):
                            # Add user message
                            user_msg = {
                                "id": str(uuid.uuid4()),
                                "conversationId": msg.get("conversationId") or conversation_id,
                                "role": "user",
                                "content": msg["userQuery"],
                                "createdAt": msg.get("createdAt") or datetime.utcnow().isoformat()
                            }
                            transformed_messages.append(user_msg)
                            
                        if "agentResponse" in msg and msg.get("agentResponse"):
                            # Add assistant message
                            agent_msg = {
                                "id": str(uuid.uuid4()),
                                "conversationId": msg.get("conversationId") or conversation_id,
                                "role": "assistant",
                                "content": msg["agentResponse"],
                                "createdAt": msg.get("createdAt") or datetime.utcnow().isoformat()
                            }
                            transformed_messages.append(agent_msg)
                            
                logger.info(f"Transformed {len(messages)} database messages into {len(transformed_messages)} frontend messages")
                logger.info(f"Message preview: {str(transformed_messages[:2])}")
                return transformed_messages
                
            elif response.status_code == 404:
                logger.warning(f"No messages found for conversation {conversation_id}")
                return []
            else:
                logger.error(f"Backend API error: {response.status_code} - {response.text}")
                # Return empty array instead of error
                return []
                
        except asyncio.TimeoutError:
            logger.error(f"Timeout getting messages from backend for conversation {conversation_id}")
            return []
        except Exception as e:
            logger.error(f"Error getting messages from backend: {str(e)}")
            logger.error(traceback.format_exc())
            return []
            
    except Exception as e:
        logger.error(f"Error getting conversation messages: {str(e)}")
        logger.error(traceback.format_exc())
        # Return empty array instead of error
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
    """Create a new conversation with timeout handling"""
    try:
        # Extract request body
        request_body = await request.json()
        
        # Get manager type from request without hardcoding default
        manager_type = request_body.get("managerType")
        user_id = request_body.get("userId", "user-1")
        
        # Save the authorization token for future use
        auth_header = request.headers.get("Authorization")
        if auth_header:
            os.environ["CURRENT_AUTH_TOKEN"] = auth_header
            logger.info("Saved authorization token for backend communication")
        
        # Log the received manager type for debugging
        logger.info(f"Received manager type from frontend: {manager_type}")
        
        # Generate a local conversation ID immediately
        # We'll use this if the backend fails or times out
        local_conversation_id = str(uuid.uuid4())
        
        # Define a function to communicate with the backend
        async def create_backend_conversation():
            try:
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
                
                # Make a request to the backend API with timeout
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        lambda: requests.post(
                            f"{BACKEND_BASE_URL}/api/v1/conversation",
                            json=backend_request,
                            headers=headers,
                            timeout=5  # 5 second timeout for the HTTP request
                        )
                    ),
                    timeout=8  # 8 second overall timeout
                )
                
                # Check if the request was successful
                if response.status_code == 200:
                    conversation = response.json()
                    logger.info(f"Created conversation with ID: {conversation.get('conversationId', 'unknown')} and manager type: {conversation.get('managerType')}")
                    return conversation
                else:
                    logger.error(f"Backend API error: {response.status_code} - {response.text}")
                    return None
            except asyncio.TimeoutError:
                logger.error("Timeout creating conversation in backend")
                return None
            except Exception as e:
                logger.error(f"Error communicating with backend: {str(e)}")
                return None

        try:
            # Only call the backend - don't use the agent for conversation creation
            backend_conversation = await create_backend_conversation()
            
            # If backend conversation was created successfully, use that
            if backend_conversation:
                return {
                    "conversationId": backend_conversation.get("conversationId", local_conversation_id),
                    "userId": backend_conversation.get("userId", user_id),
                    "title": backend_conversation.get("title", "New Conversation"),
                    "managerType": backend_conversation.get("managerType", manager_type),
                    "createdAt": backend_conversation.get("createdAt", datetime.utcnow().isoformat()),
                    "updatedAt": backend_conversation.get("updatedAt", datetime.utcnow().isoformat())
                }
            else:
                # Fall back to a local conversation if backend fails
                logger.info(f"Using local conversation with ID: {local_conversation_id} and manager type: {manager_type}")
                return {
                    "conversationId": local_conversation_id,
                    "userId": user_id,
                    "title": "New Conversation",
                    "managerType": manager_type,
                    "createdAt": datetime.utcnow().isoformat(),
                    "updatedAt": datetime.utcnow().isoformat()
                }
                
        except asyncio.TimeoutError:
            logger.error("Overall timeout creating conversation")
            # Return with just the local conversation ID as a fallback
            return {
                "conversationId": local_conversation_id,
                "userId": user_id,
                "title": "New Conversation",
                "managerType": manager_type,
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Error creating conversation: {str(e)}")
        logger.error(traceback.format_exc())
        # Even in case of error, return a valid conversation object so the UI can continue
        fallback_id = str(uuid.uuid4())
        return {
            "conversationId": fallback_id,
            "userId": request_body.get("userId", "user-1"),
            "title": "New Conversation",
            "managerType": request_body.get("managerType"),
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
        }

@app.post("/api/v1/conversation/message",
    tags=["Frontend Compatibility"],
    summary="Send a message",
    description="Sends a message in a conversation for the frontend"
)
async def send_message(
    request: Request,
    agent: LangChainAgent = Depends(get_agent)
):
    try:
        body = await request.json()
        logger.info(f"Send message request received: {body}")
        
        # Save the authorization token for future use
        auth_header = request.headers.get("Authorization")
        if auth_header:
            os.environ["CURRENT_AUTH_TOKEN"] = auth_header
            logger.info("Saved authorization token for backend communication")
        
        # Extract data from request
        conversation_id = body.get("conversationId", "")
        content = body.get("content", "")
        temperature = body.get("temperature", 0.7)
        
        # Generate unique IDs for messages
        user_message_id = str(uuid.uuid4())
        assistant_message_id = str(uuid.uuid4())
        
        # Validate required fields
        if not content or not conversation_id:
            return JSONResponse(
                status_code=400,
                content={"error": "Missing required fields: content or conversationId"}
            )
            
        # Generate response immediately instead of async
        try:
            logger.info(f"Generating response synchronously for conversation ID: {conversation_id}")
            response = await process_query_stateless(agent, content, conversation_id, temperature)
            logger.info(f"Generated response length: {len(response)}")
            logger.info(f"Response preview: {response[:100]}...")
            
            # Check if this is a draft conversation ID and handle differently
            is_draft = conversation_id.startswith("draft-")
            
            # Create response payload with both messages
            current_time = datetime.now(UTC).isoformat()
            
            # Prepare immediate response with both user message and actual agent response
            immediate_response = {
                "messages": [
                    {
                        "id": user_message_id,
                        "conversationId": conversation_id,
                        "role": "user",
                        "content": content,
                        "createdAt": current_time
                    },
                    {
                        "id": assistant_message_id,
                        "conversationId": conversation_id,
                        "role": "assistant",
                        "content": response,
                        "createdAt": current_time,
                        "isLoading": False
                    }
                ]
            }
            
            # Start background task to save messages to backend
            if not is_draft:
                asyncio.create_task(send_to_backend(conversation_id, user_message_id, content, "user"))
                asyncio.create_task(send_to_backend(conversation_id, assistant_message_id, response, "assistant"))
            
            return immediate_response
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Return error response with placeholder for the assistant's message
            current_time = datetime.now(UTC).isoformat()
            return {
                "messages": [
                    {
                        "id": user_message_id,
                        "conversationId": conversation_id,
                        "role": "user",
                        "content": content,
                        "createdAt": current_time
                    },
                    {
                        "id": assistant_message_id,
                        "conversationId": conversation_id,
                        "role": "assistant",
                        "content": "I encountered an error processing your request. Please try again.",
                        "createdAt": current_time,
                        "isLoading": False
                    }
                ]
            }
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": f"Error processing message: {str(e)}"}
        )

async def process_full_response(
    conversation_id: str, 
    content: str, 
    assistant_message_id: str, 
    user_message_id: str,
    temperature: float,
    agent: LangChainAgent,
    is_draft: bool = False
):
    """Process the full response in the background and update the conversation."""
    try:
        logger.info(f"Processing full response for conversation ID: {conversation_id}")
        
        # When we're operating with a draft conversation, we skip backend saves
        if not is_draft:
            # Try to send user message to backend first (non-blocking)
            asyncio.create_task(send_to_backend(conversation_id, user_message_id, content, "user"))
        
        # Process the query with the agent
        try:
            logger.info(f"Generating agent response for conversation ID: {conversation_id}")
            response = await process_query_stateless(agent, content, conversation_id, temperature)
            logger.info(f"Generated response length: {len(response)}")
            logger.info(f"Response preview: {response[:100]}...")
            
            # If we have a draft conversation, we don't need to send to backend
            if not is_draft:
                # Send assistant response to backend (non-blocking)
                asyncio.create_task(send_to_backend(conversation_id, assistant_message_id, response, "assistant"))
                
            # Log success
            logger.info(f"Successfully processed message for conversation ID: {conversation_id}")
            
        except Exception as agent_error:
            logger.error(f"Error generating response: {str(agent_error)}")
            logger.error(traceback.format_exc())
            response = "I encountered an issue processing your request. Please try again."
        
    except Exception as e:
        logger.error(f"Error in background processing: {str(e)}")
        logger.error(traceback.format_exc())

async def send_to_backend(conversation_id: str, message_id: str, content: str, role: str):
    """Send message to backend API."""
    try:
        # Only send to backend if we have a valid conversation ID (not a draft)
        if conversation_id and not conversation_id.startswith("draft-"):
            backend_url = f"{BACKEND_BASE_URL}/api/v1/conversation/message"
            
            # The Java backend expects userQuery and agentResponse, so we need to map our data accordingly
            if role == "user":
                payload = {
                    "conversationId": conversation_id,
                    "userQuery": content,
                    "agentResponse": ""  # Will be filled when the agent response arrives
                }
            elif role == "assistant":
                # For assistant messages, we need to update an existing message
                # First, get the message that needs updating
                try:
                    # Make a request to get conversation messages
                    headers = {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                    
                    # Use the stored token from global state
                    token = os.environ.get("CURRENT_AUTH_TOKEN")
                    if token:
                        headers["Authorization"] = token
                    
                    # Get the messages first to find the one without an agent response
                    get_response = requests.get(
                        f"{BACKEND_BASE_URL}/api/v1/conversation/message/{conversation_id}",
                        headers=headers,
                        timeout=5
                    )
                    
                    if get_response.status_code == 200:
                        messages = get_response.json()
                        # Look for a message with userQuery but no agentResponse
                        for msg in reversed(messages):  # Start from most recent
                            if msg.get("userQuery") and not msg.get("agentResponse"):
                                # Found the message to update
                                payload = {
                                    "conversationId": conversation_id,
                                    "userQuery": msg.get("userQuery", ""),
                                    "agentResponse": content
                                }
                                break
                        else:
                            # If no matching message found, create a new one
                            payload = {
                                "conversationId": conversation_id,
                                "userQuery": "Previous query",  # Placeholder
                                "agentResponse": content
                            }
                    else:
                        logger.error(f"Failed to get messages: {get_response.status_code} - {get_response.text}")
                        # Fallback payload
                        payload = {
                            "conversationId": conversation_id,
                            "userQuery": "" if role == "assistant" else content,
                            "agentResponse": content if role == "assistant" else ""
                        }
                except Exception as get_error:
                    logger.error(f"Error getting messages: {str(get_error)}")
                    # Fallback payload
                    payload = {
                        "conversationId": conversation_id,
                        "userQuery": "" if role == "assistant" else content,
                        "agentResponse": content if role == "assistant" else ""
                    }
            else:
                # For any other role, create a generic payload
                payload = {
                    "conversationId": conversation_id,
                    "userQuery": "" if role == "assistant" else content,
                    "agentResponse": content if role == "assistant" else ""
                }
            
            logger.info(f"Sending {role} message to backend for conversation: {conversation_id}")
            logger.debug(f"Payload: {payload}")
            
            # Use the stored token from global state
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            
            token = os.environ.get("CURRENT_AUTH_TOKEN")
            if token:
                headers["Authorization"] = token
                logger.debug("Including authorization token in request")
            else:
                logger.warning("No authorization token available for backend request")
            
            # Send the request with proper error handling
            try:
                response = requests.post(
                    backend_url,
                    json=payload,
                    headers=headers,
                    timeout=10
                )
                
                if response.status_code == 200:
                    logger.info(f"Successfully sent {role} message to backend for conversation: {conversation_id}")
                    return True
                else:
                    logger.error(f"Backend API error: {response.status_code} - {response.text}")
                    return False
            except Exception as request_error:
                logger.error(f"Request error sending message to backend: {str(request_error)}")
                logger.error(traceback.format_exc())
                return False
        else:
            logger.info(f"Skipping backend save for draft conversation: {conversation_id}")
            return False
    except Exception as e:
        logger.error(f"Error in send_to_backend: {str(e)}")
        logger.error(traceback.format_exc())
        return False

async def process_query_stateless(agent: LangChainAgent, query: str, conversation_id: str, temperature: float):
    """Process a query statelessly without maintaining agent state."""
    logger.info(f"Processing stateless query for conversation ID: {conversation_id}")
    
    try:
        # Retrieve conversation details if possible to get manager type
        manager_type = None
        try:
            if conversation_id and not conversation_id.startswith("draft-"):
                backend_url = f"{os.getenv('BACKEND_URL', 'http://localhost:8443')}/api/v1/conversation/{conversation_id}"
                async with httpx.AsyncClient(timeout=3.0) as client:
                    response = await client.get(backend_url)
                    if response.status_code == 200:
                        conversation_data = response.json()
                        manager_type = conversation_data.get("managerType")
                        logger.info(f"Using manager type from conversation: {manager_type}")
        except Exception as e:
            logger.warning(f"Could not retrieve conversation details: {str(e)}")
        
        # Initialize the OpenAI model
        llm = ChatOpenAI(
            model_name="gpt-3.5-turbo",
            temperature=temperature,
            openai_api_key=os.getenv('OPENAI_API_KEY')
        )
        
        # Create the prompt that focuses on the current query without needing conversation history
        system_message = """You are an ethical AI assistant that helps with ethical decision-making in technology.
        Provide thoughtful, nuanced guidance based on ethical frameworks and principles.
        Focus on helping the user understand ethical implications and make informed decisions."""
        
        if manager_type:
            system_message += f"\n\nThe user has selected '{manager_type}' as their preferred interaction style."
        
        # Make a direct call to the LLM
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": query}
        ]
        
        # Use a timeout to prevent hanging
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(
                lambda: llm.invoke([
                    SystemMessage(content=system_message),
                    HumanMessage(content=query)
                ]).content
            )
            response = future.result(timeout=25)  # 25 second timeout
        
        return response
    
    except concurrent.futures.TimeoutError:
        logger.error("Response generation timed out")
        return "I'm sorry, but I couldn't generate a response in time. Please try again with a simpler query."
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        return "I encountered an issue processing your request. Please try again."

@app.delete("/api/v1/conversation/{conversation_id}",
    tags=["Frontend Compatibility"],
    summary="Delete a conversation",
    description="Deletes a conversation and its messages"
)
async def delete_conversation(conversation_id: str, request: Request):
    """Proxy delete conversation request to the Java backend"""
    try:
        # Extract the authorization header from the incoming request
        auth_header = request.headers.get("Authorization")
        headers = {
            "Accept": "application/json"
        }
        
        if auth_header:
            headers["Authorization"] = auth_header
        
        # Make a request to the backend API
        response = requests.delete(
            f"{BACKEND_BASE_URL}/api/v1/conversation/{conversation_id}",
            headers=headers
        )
        
        # Check if the request was successful
        if response.status_code in [200, 204]:
            logger.info(f"Successfully deleted conversation ID: {conversation_id}")
            return {}
        else:
            logger.error(f"Backend API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to delete conversation")
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/conversation/{conversation_id}/update-title",
    tags=["Frontend Compatibility"],
    summary="Update conversation title",
    description="Updates the title of a conversation"
)
async def update_conversation_title(conversation_id: str, request: Request):
    """Proxy update conversation title request to the Java backend"""
    try:
        # Extract request body
        request_body = await request.json()
        title = request_body.get("title", "Untitled Conversation")
        
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
            f"{BACKEND_BASE_URL}/api/v1/conversation/{conversation_id}/update-title",
            json={"title": title},
            headers=headers
        )
        
        # Check if the request was successful
        if response.status_code == 200:
            updated_conversation = response.json()
            logger.info(f"Successfully updated title for conversation ID: {conversation_id}")
            return updated_conversation
        else:
            logger.error(f"Backend API error: {response.status_code} - {response.text}")
            # If backend fails, return a basic success response
            return {
                "conversationId": conversation_id,
                "title": title,
                "updatedAt": datetime.utcnow().isoformat()
            }
    except Exception as e:
        logger.error(f"Error updating conversation title: {str(e)}")
        logger.error(traceback.format_exc())
        # Return a basic success response if an exception occurs
        return {
            "conversationId": conversation_id,
            "title": request_body.get("title", "Untitled Conversation"),
            "updatedAt": datetime.utcnow().isoformat()
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001) 