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
from langchain_core.messages import SystemMessage, HumanMessage
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

class ArtifactGenerationRequest(BaseModel):
    query: str = Field(..., description="The user query to generate artifacts for.")
    max_guidelines: Optional[int] = Field(3, description="Maximum number of guidelines to return.")
    max_case_studies: Optional[int] = Field(2, description="Maximum number of case studies to return.")

class ArtifactItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None # Guidelines have description
    summary: Optional[str] = None # Case studies have summary
    outcome: Optional[str] = None # Case studies have outcome
    source: str
    relevance: float
    category: Optional[str] = None # Guidelines have category

class ArtifactGenerationResponse(BaseModel):
    guidelines: List[ArtifactItem]
    caseStudies: List[ArtifactItem]

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
    background_tasks: BackgroundTasks,
    agent: LangChainAgent = Depends(get_agent)
) -> ConversationContentResponseDTO:
    """Generate a response to an ethical query - stateless version."""
    try:
        logger.info(f"Generating response for conversation ID: {query.conversationId}")
        logger.info(f"User query: {query.userQuery[:50]}...")
        
        # Initialize default temperature
        temperature = 0.7
        
        # Try to get temperature from the query object if it has it
        if hasattr(query, "temperature") and query.temperature is not None:
            try:
                temp_value = float(query.temperature)
                if 0 <= temp_value <= 1:
                    temperature = temp_value
                    logger.info(f"Using temperature from request: {temperature}")
            except (ValueError, TypeError):
                pass
        
        # Create the LLM instance
        llm = ChatOpenAI(
            model_name="gpt-3.5-turbo",
            temperature=temperature,
            openai_api_key=os.getenv('OPENAI_API_KEY')
        )
        
        # Create a system prompt
        system_message = """You are EVA, an empathetic and helpful Ethical AI assistant.
        Your goal is to help users navigate complex ethical dilemmas in technology projects.
        Provide thoughtful, nuanced guidance based on established ethical frameworks and principles.
        Focus on helping the user understand implications, consider different perspectives, and make informed decisions.

        Keep your responses clear, concise, and easy to read. Use markdown for formatting where appropriate.
        Adopt a supportive and conversational tone.

        After providing your guidance, always ask if they want to practice:
        'Would you like to practice how to approach this situation? [Yes, practice] [No, not now]'
        """
        
        # Make a direct call to the LLM
        response_content = ""
        try:
            messages = [
                SystemMessage(content=system_message),
                HumanMessage(content=query.userQuery)
            ]
            
            response = llm.invoke(messages)
            response_content = response.content # Store content
            logger.info(f"Generated response (first 50 chars): {response_content[:50]}...")
            
        except Exception as llm_error:
            logger.error(f"Error from LLM: {str(llm_error)}")
            response_content = """I apologize, but I encountered an error generating a response. 
            Please try asking your question again, or rephrase it slightly."""

        # Create response DTO
        response_dto = ConversationContentResponseDTO(
            id=str(uuid.uuid4()),
            conversationId=query.conversationId,
            userQuery=query.userQuery,
            agentResponse=response_content,
            content=response_content, # Use stored content
            role="assistant",
            createdAt=datetime.utcnow().isoformat(),
            inPracticeMode=False,
            practiceScore=None
        )
        
        # Add background task to the injected background_tasks object
        # Only add task if LLM didn't error out and we have valid content
        if response_content and "I apologize" not in response_content:
            logger.info(f"Adding background task update_conversation_context for conv {query.conversationId}")
            background_tasks.add_task(
                update_conversation_context,
                query.conversationId,
                query.userQuery,
                response_content # Pass the actual response content
            )
        else:
             logger.warning(f"Skipping background task due to LLM error or empty response for conv {query.conversationId}")
        
        # Return the DTO directly. FastAPI handles running tasks added to the dependency.
        return response_dto
            
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return an error DTO, no background task will run here
        return ConversationContentResponseDTO(
            id=str(uuid.uuid4()),
            conversationId=query.conversationId,
            userQuery=query.userQuery,
            agentResponse="I apologize, but I encountered an error processing your request. Please try again.",
            content="I apologize, but I encountered an error processing your request. Please try again.",
            role="assistant",
            createdAt=datetime.utcnow().isoformat(),
            inPracticeMode=False,
            practiceScore=None
        )

async def update_conversation_context(conversation_id: str, user_query: str, agent_response: str):
    """Background task to update conversation context, title, and fetch RAG artifacts."""
    logger.info(f"[Background Task START] update_conversation_context for conv {conversation_id}")
    try:
        # Get the authorization token
        auth_header = os.getenv("CURRENT_AUTH_TOKEN")
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        if auth_header:
            headers["Authorization"] = auth_header
            logger.info(f"[Background Task] Using auth token: {auth_header[:20]}...")
        else:
            logger.warning("[Background Task] No auth token found in env for backend calls.")
            # Depending on backend security, may need to handle this case
            
        # 1. Update conversation title
        try:
            title = user_query[:50] + ("..." if len(user_query) > 50 else "")
            logger.info(f"[Background Task] Attempting to update title for conv {conversation_id} to: '{title}'")
            async with httpx.AsyncClient() as client:
                update_title_response = await client.post(
                    f"{BACKEND_BASE_URL}/api/v1/conversation/{conversation_id}/update-title",
                    json={"title": title},
                    headers=headers,
                    timeout=5.0
                )
                update_title_response.raise_for_status() # Raise errors for bad responses
                logger.info(f"[Background Task] Successfully updated title for conv {conversation_id}. Status: {update_title_response.status_code}")
        except httpx.TimeoutException:
             logger.warning(f"[Background Task] Timeout updating title for conv {conversation_id}")
        except httpx.HTTPStatusError as http_err:
             logger.warning(f"[Background Task] HTTP error updating title for conv {conversation_id}: {http_err.response.status_code} - {http_err.response.text[:100]}")
        except Exception as e:
            logger.warning(f"[Background Task] Could not update conversation title for conv {conversation_id}: {str(e)}")
            
        # 2. Generate and save RAG artifacts
        try:
            logger.info(f"[Background Task] Calling generate_and_save_artifacts for conv {conversation_id}")
            agent = get_agent() # Get a fresh agent instance for the background task
            await generate_and_save_artifacts(agent, user_query, conversation_id, auth_header)
            logger.info(f"[Background Task] Finished generate_and_save_artifacts call for conv {conversation_id}")
        except Exception as e:
            logger.error(f"[Background Task ERROR] Could not generate or save RAG artifacts for conv {conversation_id}: {str(e)}")
            logger.error(traceback.format_exc())
            
    except Exception as e:
        logger.error(f"[Background Task FATAL] Error in update_conversation_context for conv {conversation_id}: {str(e)}")
        logger.error(traceback.format_exc())
    finally:
         logger.info(f"[Background Task END] update_conversation_context for conv {conversation_id}")

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
        
        # Also try to send feedback to Java backend if possible
        try:
            # Placeholder for future backend integration
            # This would send the feedback to the Java backend
            pass
        except Exception as backend_error:
            logger.warning(f"Could not send feedback to backend: {str(backend_error)}")
        
        return FeedbackResponse(feedbackId=feedback_id, success=True)
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        # Still return success to avoid disrupting the UI
        return FeedbackResponse(
            feedbackId=str(uuid.uuid4()), 
            success=True  # Changed to True to ensure frontend doesn't show an error
        )

# Add a separate endpoint for practice feedback that doesn't require authentication
@app.post("/api/v1/practice-feedback",
    response_model=FeedbackResponse,
    tags=["Practice"],
    summary="Submit practice feedback",
    description="Submit feedback for practice mode without requiring authentication"
)
async def submit_practice_feedback(
    request: Request
) -> FeedbackResponse:
    """Submit feedback for practice mode without authentication."""
    try:
        # Parse request body
        body = await request.json()
        
        # Generate a unique ID for this feedback
        feedback_id = str(uuid.uuid4())
        
        # Save feedback locally
        feedback_dir = Path("practice_feedback")
        feedback_dir.mkdir(exist_ok=True)
        
        feedback_file = feedback_dir / f"{feedback_id}.json"
        with open(feedback_file, "w") as f:
            json.dump({
                "id": feedback_id,
                "conversationId": body.get("conversationId", "unknown"),
                "score": body.get("score", 0),
                "comments": body.get("comments", ""),
                "timestamp": datetime.utcnow().isoformat()
            }, f, indent=2)
        
        logger.info(f"Saved practice feedback {feedback_id}")
        
        return FeedbackResponse(feedbackId=feedback_id, success=True)
    except Exception as e:
        logger.error(f"Error submitting practice feedback: {str(e)}")
        # Always return success
        return FeedbackResponse(
            feedbackId=str(uuid.uuid4()), 
            success=True
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
                
                # Check if messages already have role/content format
                if len(messages) > 0 and all(("role" in msg and "content" in msg) for msg in messages):
                    logger.info(f"Messages already in correct format - not transforming")
                    return messages
                
                # Transform messages to ensure they have role and content fields (frontend format)
                transformed_messages = []
                
                # Process each message individually to avoid duplication
                for idx, msg in enumerate(messages):
                    # Skip any message that doesn't have either userQuery or agentResponse
                    if (not msg.get("userQuery") and not msg.get("agentResponse")):
                        continue
                        
                    # Handle user message first
                    if msg.get("userQuery"):
                        # Don't create duplicate user messages - check if we've already added this query
                        is_duplicate = False
                        for existing in transformed_messages:
                            if (existing.get("role") == "user" and 
                                existing.get("content") == msg.get("userQuery") and
                                abs((idx - transformed_messages.index(existing))) <= 2):
                                is_duplicate = True
                                break
                                
                        if not is_duplicate:
                            user_msg = {
                                "id": msg.get("id") or str(uuid.uuid4()),
                                "conversationId": msg.get("conversationId") or conversation_id,
                                "role": "user",
                                "content": msg.get("userQuery"),
                                "createdAt": msg.get("createdAt") or datetime.utcnow().isoformat()
                            }
                            transformed_messages.append(user_msg)
                            
                    # Handle assistant message
                    if msg.get("agentResponse"):
                        # Don't create duplicate assistant messages
                        is_duplicate = False
                        for existing in transformed_messages:
                            if (existing.get("role") == "assistant" and 
                                existing.get("content") == msg.get("agentResponse") and
                                abs((idx - transformed_messages.index(existing))) <= 2):
                                is_duplicate = True
                                break
                                
                        if not is_duplicate:
                            assistant_msg = {
                                "id": msg.get("id") or str(uuid.uuid4()),
                                "conversationId": msg.get("conversationId") or conversation_id,
                                "role": "assistant",
                                "content": msg.get("agentResponse"),
                                "createdAt": msg.get("createdAt") or datetime.utcnow().isoformat()
                            }
                            transformed_messages.append(assistant_msg)
                
                # Sort messages by createdAt to maintain conversation flow
                transformed_messages.sort(key=lambda x: x.get("createdAt", ""))
                            
                logger.info(f"Transformed {len(messages)} database messages into {len(transformed_messages)} frontend messages")
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
    """Handle message sending requests from the frontend."""
    try:
        body = await request.json()
        logger.info(f"Send message request received: {body}")
        
        # Extract the authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.error("No authorization header provided for message")
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized - No auth token provided"}
            )
        
        # Save the authorization token for future use
        os.environ["CURRENT_AUTH_TOKEN"] = auth_header
        logger.info("Saved authorization token for backend communication")
        
        # Extract data from request
        conversation_id = body.get("conversationId")
        user_query = body.get("userQuery") 
        temperature = body.get("temperature", 0.7)
        
        # Validate required fields
        if not user_query or not conversation_id:
            logger.error(f"Missing required fields: userQuery={user_query}, conversationId={conversation_id}")
            return JSONResponse(
                status_code=400,
                content={"error": "Missing required fields: userQuery or conversationId"}
            )
        
        # Generate unique IDs for messages
        user_message_id = str(uuid.uuid4())
        assistant_message_id = str(uuid.uuid4())
        current_time = datetime.now(UTC).isoformat()

        # First, send the user message to the backend
        try:
            async with httpx.AsyncClient() as client:
                backend_response = await client.post(
                    f"{BACKEND_BASE_URL}/api/v1/conversation/message",
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    json={
                        "conversationId": conversation_id,
                        "content": user_query,
                        "role": "user",
                        "messageId": user_message_id
                    }
                )
                backend_response.raise_for_status()
                logger.info(f"Successfully sent user message to backend for conversation {conversation_id}")
        except Exception as e:
            logger.error(f"Error sending user message to backend: {str(e)}")
            # Continue even if backend save fails - we'll show the message to the user

        # Generate AI response
        try:
            # Pass user_query to the processing function
            response = await process_query_stateless(agent, user_query, conversation_id, temperature)
            logger.info(f"Generated response length: {len(response)}")
            logger.info(f"Response preview: {response[:100]}...")

            # Try to send AI response to backend
            try:
                async with httpx.AsyncClient() as client:
                    backend_response = await client.post(
                        f"{BACKEND_BASE_URL}/api/v1/conversation/message",
                        headers={
                            "Authorization": auth_header,
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        json={
                            "conversationId": conversation_id,
                            "content": response,
                            "role": "assistant",
                            "messageId": assistant_message_id
                        }
                    )
                    backend_response.raise_for_status()
                    logger.info(f"Successfully sent AI response to backend for conversation {conversation_id}")
            except Exception as e:
                logger.error(f"Error sending AI response to backend: {str(e)}")
                # Continue even if backend save fails

            # Start a background task to generate knowledge artifacts based on the user query
            # This won't block the response to the frontend
            asyncio.create_task(generate_and_save_artifacts(agent, user_query, conversation_id, auth_header))

            # Return both messages to the frontend
            return {
                "messages": [
                    {
                        "id": user_message_id,
                        "conversationId": conversation_id,
                        "role": "user",
                        "content": user_query,
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
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            logger.error(traceback.format_exc())
            return JSONResponse(
                status_code=500,
                content={"error": f"Error generating response: {str(e)}"}
            )
    
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

async def generate_and_save_artifacts(agent: LangChainAgent, user_query: str, conversation_id: str, auth_header: str):
    """Generate knowledge artifacts based on a user query and save them to the backend."""
    try:
        logger.info(f"[Artifact Generation START] for conversation: {conversation_id}")
        
        # Skip for invalid conversation IDs
        if not conversation_id or conversation_id.startswith('draft-'):
            logger.info(f"[Artifact Generation SKIP] for draft/invalid conversation: {conversation_id}")
            return
            
        # Add logging for the user query to help debug
        logger.info(f"[Artifact Generation] Generating artifacts for query: '{user_query[:100]}...' Conversation ID: {conversation_id}")
        
        # Generate artifacts
        guidelines = []
        case_studies = []
        generation_error = None
        try:
            logger.info(f"[Artifact Generation] Calling agent.get_relevant_guidelines for conv {conversation_id}")
            guidelines = agent.get_relevant_guidelines(
                conversation_text=user_query,
                max_results=3
            )
            logger.info(f"[Artifact Generation] Got {len(guidelines)} guidelines for conv {conversation_id}")
            
            logger.info(f"[Artifact Generation] Calling agent.get_relevant_case_studies for conv {conversation_id}")
            case_studies = agent.get_relevant_case_studies(
                conversation_text=user_query,
                max_results=2
            )
            logger.info(f"[Artifact Generation] Got {len(case_studies)} case studies for conv {conversation_id}")
            
            # Check if we got any artifacts - if not, log this clearly
            if not guidelines and not case_studies:
                logger.warning(f"[Artifact Generation WARNING] No artifacts generated for conv {conversation_id}. Vector store might be empty or query didn't match.")
                # Add fallback artifacts if none were generated
                guidelines = [{
                    "id": str(uuid.uuid4()),
                    "title": "Fallback: User Privacy Protection",
                    "description": "Fallback: Always prioritize user privacy and obtain clear consent before collecting or processing personal data.",
                    "source": "General Ethical Principles",
                    "relevance": 0.95,
                    "category": "Privacy"
                }]
                case_studies = [{
                    "id": str(uuid.uuid4()),
                    "title": "Fallback: Cambridge Analytica Data Scandal",
                    "summary": "Fallback: Cambridge Analytica collected personal data from millions of Facebook users without consent for political targeting.",
                    "outcome": "Fallback: Resulted in major regulatory changes and heightened awareness about data privacy.",
                    "source": "Data Privacy Case Studies",
                    "relevance": 0.9
                }]
                logger.info(f"[Artifact Generation] Added fallback artifacts for conv {conversation_id}")
            
        except Exception as gen_err:
            generation_error = str(gen_err)
            logger.error(f"[Artifact Generation ERROR] Error during artifact generation for conv {conversation_id}: {generation_error}")
            logger.error(traceback.format_exc())
            # Use fallbacks if generation failed
            if not guidelines and not case_studies:
                 guidelines = [{
                    "id": str(uuid.uuid4()),
                    "title": "Error Fallback: Privacy",
                    "description": "Fallback due to generation error.",
                    "source": "Error Fallback", "relevance": 0.5, "category": "Error"
                 }]
                 case_studies = []
                 logger.info(f"[Artifact Generation] Added error fallback artifacts for conv {conversation_id}")

        # Format artifact data only if generation didn't completely fail or we have fallbacks
        formatted_guidelines = []
        formatted_case_studies = []
        if guidelines or case_studies:
            try:
                formatted_guidelines = [
                    {
                        "id": g.get('id', str(uuid.uuid4())), # Ensure ID exists
                        "title": g.get('title', 'Untitled Guideline'),
                        "description": g.get('description', ''),
                        "source": g.get('source', 'Unknown Source'),
                        "relevance": float(g.get('relevance', 0.0)), # Ensure float
                        "category": g.get('category', 'General')
                    } for g in guidelines
                ]
                
                formatted_case_studies = [
                    {
                        "id": cs.get('id', str(uuid.uuid4())), # Ensure ID exists
                        "title": cs.get('title', 'Untitled Case Study'),
                        "summary": cs.get('summary', ''),
                        "outcome": cs.get('outcome', ''),
                        "source": cs.get('source', 'Unknown Source'),
                        "relevance": float(cs.get('relevance', 0.0)) # Ensure float
                    } for cs in case_studies
                ]
                logger.info(f"[Artifact Formatting] Formatted {len(formatted_guidelines)} guidelines and {len(formatted_case_studies)} case studies for conv {conversation_id}")
            except Exception as format_err:
                logger.error(f"[Artifact Formatting ERROR] Failed to format artifacts for conv {conversation_id}: {format_err}")
                logger.error(traceback.format_exc())
                # If formatting fails, we can't send anything
                formatted_guidelines = []
                formatted_case_studies = []
        else:
             logger.warning(f"[Artifact Formatting] No guidelines or case studies available to format for conv {conversation_id}. Generation error was: {generation_error}")

        # Only proceed if we have formatted artifacts
        if not formatted_guidelines and not formatted_case_studies:
            logger.error(f"[Artifact Sending SKIP] No formatted artifacts to send for conv {conversation_id}. Aborting send.")
            return

        # Prepare the request payload
        artifact_payload = {
            "conversationId": conversation_id,
            "guidelines": formatted_guidelines,
            "caseStudies": formatted_case_studies
        }
        
        # Show the endpoint being called
        backend_endpoint = f"{BACKEND_BASE_URL}/api/v1/rag-artifacts"
        logger.info(f"[Artifact Sending] Preparing to send artifacts to backend endpoint: {backend_endpoint} for conv {conversation_id}")
        
        # Send artifacts to backend
        async with httpx.AsyncClient() as client:
            response = None
            send_error = None
            try:
                # Log the full request details for debugging
                auth_header_preview = auth_header[:20] + "..." if auth_header else "None"
                payload_preview = str(artifact_payload)[:200] + ("..." if len(str(artifact_payload)) > 200 else "")
                logger.info(f"[Artifact Sending] Sending POST request for conv {conversation_id}. Auth: {auth_header_preview}. Payload Preview: {payload_preview}")
                
                response = await client.post(
                    backend_endpoint,
                    headers={
                        "Authorization": auth_header,
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    json=artifact_payload,
                    timeout=10.0
                )
                
                # Log the response status immediately
                logger.info(f"[Artifact Sending] Backend response status for conv {conversation_id}: {response.status_code}")

                # Raise HTTP errors for bad responses (4xx or 5xx)
                response.raise_for_status()

                logger.info(f"[Artifact Sending SUCCESS] Successfully saved knowledge artifacts for conversation: {conversation_id}")
                # Try to log the response content
                try:
                    content = response.json()
                    logger.info(f"[Artifact Sending] Backend response content: {str(content)[:200]}...")
                except Exception as json_err:
                    logger.warning(f"[Artifact Sending] Could not parse backend response JSON for conv {conversation_id}: {json_err}")
                    logger.warning(f"[Artifact Sending] Raw response text: {response.text[:200]}...")

            except httpx.TimeoutException as timeout_err:
                send_error = f"Timeout error: {timeout_err}"
                logger.error(f"[Artifact Sending ERROR] Timeout while sending artifacts for conversation: {conversation_id}. Error: {send_error}")
            except httpx.HTTPStatusError as http_err:
                send_error = f"HTTP error: {http_err.response.status_code} - {http_err.response.text[:200]}"
                logger.error(f"[Artifact Sending ERROR] HTTP error sending artifacts for conv {conversation_id}. Status: {http_err.response.status_code}. Response: {http_err.response.text[:500]}")
                # Specific handling for 404 - maybe the endpoint changed?
                if http_err.response.status_code == 404:
                    logger.error(f"[Artifact Sending ERROR] Endpoint {backend_endpoint} returned 404. Check backend API path.")
                    # You could add retry logic here if needed, but the original code already had some.
                    # For now, just log the failure clearly.
            except Exception as e:
                send_error = f"General error: {e}"
                logger.error(f"[Artifact Sending ERROR] Unexpected error sending artifacts to backend for conv {conversation_id}: {send_error}")
                logger.error(traceback.format_exc())
                
        logger.info(f"[Artifact Generation END] Finished processing for conversation: {conversation_id}. Send error (if any): {send_error}")
            
    except Exception as outer_err:
        logger.error(f"[Artifact Generation FATAL] Unhandled error in generate_and_save_artifacts for conv {conversation_id}: {outer_err}")
        logger.error(traceback.format_exc())