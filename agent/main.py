from fastapi import FastAPI, HTTPException, Depends, Header, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any, Union, Literal
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
import redis
from langchain.memory import ConversationBufferMemory

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

# Initialize Redis connection for conversation memory
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
try:
    redis_client = redis.from_url(REDIS_URL)
    logger.info(f"Connected to Redis at {REDIS_URL}")
except Exception as e:
    logger.error(f"Failed to connect to Redis: {str(e)}. Using fallback memory.")
    redis_client = None

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

class ConversationMemory:
    """Manages conversation memory storage and retrieval."""
    
    def __init__(self, redis_client=None, expiry_seconds=86400):  # Default 24-hour expiry
        self.redis_client = redis_client
        self.expiry_seconds = expiry_seconds
        self.fallback_storage = {}  # In-memory fallback if Redis unavailable
    
    def get_conversation_key(self, conversation_id: str) -> str:
        """Create a Redis key for the conversation."""
        return f"conversation:{conversation_id}:history"
    
    def save_exchange(self, conversation_id: str, user_message: str, assistant_message: str) -> bool:
        """Save a conversation exchange to memory."""
        try:
            exchange = {
                "timestamp": datetime.now(UTC).isoformat(),
                "user": user_message,
                "assistant": assistant_message
            }
            
            if self.redis_client:
                # Get existing history
                key = self.get_conversation_key(conversation_id)
                existing_data = self.redis_client.get(key)
                
                if existing_data:
                    history = json.loads(existing_data)
                else:
                    history = []
                
                # Append new exchange and save
                history.append(exchange)
                self.redis_client.setex(
                    key, 
                    self.expiry_seconds,
                    json.dumps(history)
                )
            else:
                # Fallback to in-memory storage
                if conversation_id not in self.fallback_storage:
                    self.fallback_storage[conversation_id] = []
                self.fallback_storage[conversation_id].append(exchange)
            
            logger.info(f"Saved conversation exchange for {conversation_id}")
            return True
        except Exception as e:
            logger.error(f"Error saving conversation exchange: {str(e)}")
            return False
    
    def get_history(self, conversation_id: str, max_turns: int = 10) -> List[Dict[str, str]]:
        """Retrieve conversation history for a conversation."""
        try:
            if self.redis_client:
                key = self.get_conversation_key(conversation_id)
                data = self.redis_client.get(key)
                
                if data:
                    history = json.loads(data)
                    # Return the most recent exchanges up to max_turns
                    return history[-max_turns:] if max_turns > 0 else history
                return []
            else:
                # Fallback to in-memory storage
                history = self.fallback_storage.get(conversation_id, [])
                return history[-max_turns:] if max_turns > 0 else history
        except Exception as e:
            logger.error(f"Error retrieving conversation history: {str(e)}")
            return []
    
    def format_for_prompt(self, conversation_id: str, max_turns: int = 5) -> str:
        """Format conversation history for inclusion in a prompt."""
        history = self.get_history(conversation_id, max_turns)
        if not history:
            return ""
        
        formatted = "Previous conversation:\n"
        for exchange in history:
            formatted += f"User: {exchange.get('user', '')}\n"
            formatted += f"Assistant: {exchange.get('assistant', '')}\n\n"
        
        return formatted
    
    def clear_history(self, conversation_id: str) -> bool:
        """Clear conversation history."""
        try:
            if self.redis_client:
                key = self.get_conversation_key(conversation_id)
                self.redis_client.delete(key)
            else:
                if conversation_id in self.fallback_storage:
                    del self.fallback_storage[conversation_id]
            
            logger.info(f"Cleared conversation history for {conversation_id}")
            return True
        except Exception as e:
            logger.error(f"Error clearing conversation history: {str(e)}")
            return False
    
    def get_langchain_memory(self, conversation_id: str) -> ConversationBufferMemory:
        """Get a LangChain ConversationBufferMemory object for the conversation."""
        from langchain_core.messages import AIMessage, HumanMessage
        
        memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        
        # Load history from storage into memory
        history = self.get_history(conversation_id)
        for exchange in history:
            memory.chat_memory.add_user_message(exchange.get('user', ''))
            memory.chat_memory.add_ai_message(exchange.get('assistant', ''))
        
        return memory

# Initialize the conversation memory manager
conversation_memory = ConversationMemory(redis_client)

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
    userQuery: str
    conversationId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    temperature: Optional[float] = 0.7
    managerType: Optional[str] = None
    request_type: Optional[str] = "initial_query"

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

class PracticeScorePayload(BaseModel):
    conversationId: str
    managerType: str
    score: int
    decisions: List[Dict[str, Any]] # Or a more specific model if available

# Define a new response model for the /api/v1/conversation/message endpoint
class MessageExchangeResponse(BaseModel):
    messages: List[ConversationContentResponseDTO] # Expecting a list of message objects

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
    """Start a new conversation - initializes memory."""
    try:
        # Generate a unique ID instead of using agent state
        conversation_id = str(uuid.uuid4())
        
        # Clear any existing conversation memory for this ID
        conversation_memory.clear_history(conversation_id)
        logger.info(f"Initialized conversation memory for ID: {conversation_id}")
        
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
    """Generate a response to an ethical query - with memory between calls."""
    try:
        logger.info(f"Generating response for conversation ID: {query.conversationId} (Type: {query.request_type})")
        logger.info(f"User query: {query.userQuery[:50]}...")
        
        temperature = 0.7
        
        if hasattr(query, "temperature") and query.temperature is not None:
            try:
                temp_value = float(query.temperature)
                if 0 <= temp_value <= 1:
                    temperature = temp_value
                    logger.info(f"Using temperature from request: {temperature}")
            except (ValueError, TypeError):
                logger.warning(f"Invalid temperature value provided: {query.temperature}. Using default {temperature}.")
                pass
        
        # Create the LLM instance
        llm = ChatOpenAI(
            model_name="gpt-4o-mini",
            temperature=temperature,
            openai_api_key=os.getenv('OPENAI_API_KEY')
        )
        
        # Define system prompts
        initial_query_prompt = """You are EVA, an empathetic and helpful Ethical AI assistant.
        Your goal is to help users navigate complex ethical dilemmas in technology projects.
        Provide thoughtful, nuanced guidance based on established ethical frameworks and principles.
        Focus on helping the user understand implications, consider different perspectives, and make informed decisions.

        Keep your responses clear, concise, and easy to read. Use markdown for formatting where appropriate.
        Adopt a supportive and conversational tone.

        For initial guidance on an ethical dilemma (and NOT for feedback summaries, email drafts, or rehearsal setups), if offering a practice session is appropriate, ALWAYS conclude by asking the *exact question*: "Would you like to practice how to approach this situation?" and then, clearly separated (e.g., on a new line), include the text '[Yes, practice] [No, not now]'. This should be the very end of your initial guidance response when a practice session is offered.

        After providing your guidance, always ask the *exact question* "Would you like to practice how to approach this situation?" and then, clearly separated (e.g., on a new line if possible), include the text '[Yes, practice] [No, not now]'.
"""

        post_feedback_prompt = """You are EVA, an empathetic and helpful Ethical AI assistant.
The user has just completed a practice scenario and is asking for feedback on their performance or score.
Analyze their query and provide constructive, specific feedback on their ethical reasoning and decision-making demonstrated in the scenario they describe.
Acknowledge their score if mentioned.

Your feedback MUST be structured *exactly* as follows, using these *exact literal headings* on their own lines, with no additional sections:

1.  `**Introductory Paragraph:**` [1-2 sentences acknowledging the user's practice session.]

2.  `**Summary of Feedback:**` [Concise overall summary of performance and score, if mentioned.]

3.  `**Detailed Feedback:**`
    *   Under this heading, provide EXACTLY these four sections, each starting with its *exact literal heading* **on its own new line, with no leading markdown characters (*, -) or other formatting**:*
        *   `Strengths`
            [Provide bullet points analyzing *each* decision listed in the user's prompt that was a strength. Example: - Decision X: [Explanation]]
        *   `Areas for Improvement`
            [Provide bullet points analyzing *each* decision listed in the user's prompt that could be improved. Example: - Decision Y: [Explanation]]
        *   `Reasoning Process`
            [Overall analysis of the user's ethical reasoning pattern.]
        *   `Practical Advice for the Future`
            [General advice based on the overall performance.]

4.  `**Concluding Action Prompt:**`
    End with the *exact text*: "Do you feel ready to discuss this with your manager, or would you like to practice again? [Yes, help draft email] [No, practice again]"

**CRITICAL:** The headings `**Introductory Paragraph:**`, `**Summary of Feedback:**`, `**Detailed Feedback:**`, `Strengths`, `Areas for Improvement`, `Reasoning Process`, `Practical Advice for the Future`, and `**Concluding Action Prompt:**` MUST appear exactly as written, each on its own line where specified. Do not add extra formatting or deviate.
"""
        
        if query.request_type == "post_feedback":
            system_message = post_feedback_prompt
            logger.info("Using post-feedback prompt.")
        else: 
            system_message = initial_query_prompt
            logger.info("Using initial query prompt.")
        
        conversation_context = conversation_memory.format_for_prompt(query.conversationId)
        if conversation_context:
            logger.info(f"Retrieved conversation history for {query.conversationId}")
            system_message = f"{system_message}\n\n{conversation_context}"
        
        response_content = ""
        try:
            messages = [
                SystemMessage(content=system_message),
                HumanMessage(content=query.userQuery)
            ]
            
            response = await llm.ainvoke(messages)
            response_content = response.content 
            logger.info(f"Generated response (first 50 chars): {response_content[:50]}...")
            
            conversation_memory.save_exchange(
                query.conversationId,
                query.userQuery,
                response_content
            )
            
        except Exception as llm_error:
            logger.error(f"Error from LLM: {str(llm_error)}")
            response_content = """I apologize, but I encountered an error generating a response. 
            Please try asking your question again, or rephrase it slightly."""

        response_dto = ConversationContentResponseDTO(
            id=str(uuid.uuid4()),
            conversationId=query.conversationId,
            userQuery=query.userQuery,
            agentResponse=response_content,
            role="assistant",
            content=response_content,
            createdAt=datetime.utcnow().isoformat(),
            inPracticeMode=False,
            practiceScore=None
        )
        
        if response_content and "I apologize" not in response_content:
            logger.info(f"Adding background task generate_artifacts_only for conv {query.conversationId}")
            background_tasks.add_task(
                generate_artifacts_only, 
                query.conversationId,
                query.userQuery
            )
        else:
             logger.warning(f"Skipping artifact generation task due to LLM error or empty response for conv {query.conversationId}")
        
        return response_dto
            
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return an error DTO consistent with the response_model
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

# Renamed and simplified background task - ONLY generates artifacts
async def generate_artifacts_only(conversation_id: str, user_query: str):
    """Background task to generate and save RAG artifacts ONLY."""
    logger.info(f"[Background Task START] generate_artifacts_only for conv {conversation_id}")
    try:
        # Get the authorization token (still needed for saving artifacts)
        auth_header = os.getenv("CURRENT_AUTH_TOKEN")
        if not auth_header:
             logger.warning("[Background Task] No auth token found in env for artifact saving.")
             # Decide if we should proceed without auth? For now, we might return.
             # return 
            
        # Generate and save RAG artifacts
        try:
            logger.info(f"[Background Task] Calling generate_and_save_artifacts for conv {conversation_id}")
            agent = get_agent() # Get a fresh agent instance
            await generate_and_save_artifacts(agent, user_query, conversation_id, auth_header)
            logger.info(f"[Background Task] Finished generate_and_save_artifacts call for conv {conversation_id}")
        except Exception as e:
            logger.error(f"[Background Task ERROR] Could not generate or save RAG artifacts for conv {conversation_id}: {str(e)}")
            logger.error(traceback.format_exc())
            
    except Exception as e:
        logger.error(f"[Background Task FATAL] Error in generate_artifacts_only for conv {conversation_id}: {str(e)}")
        logger.error(traceback.format_exc())
    finally:
         logger.info(f"[Background Task END] generate_artifacts_only for conv {conversation_id}")

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
    """Create a new conversation, passing title to backend if provided."""
    try:
        # Extract request body
        request_body = await request.json()
        
        # Get manager type and OPTIONAL title from request
        manager_type = request_body.get("managerType")
        user_id = request_body.get("userId", "user-1")
        initial_title = request_body.get("title") # Get the title sent by frontend
        
        # Save the authorization token for future use
        auth_header = request.headers.get("Authorization")
        if auth_header:
            os.environ["CURRENT_AUTH_TOKEN"] = auth_header
            logger.info("Saved authorization token for backend communication")
        
        # Log the received data
        logger.info(f"Received manager type: {manager_type}, initial title: {initial_title}")
        
        # Generate a local conversation ID immediately
        local_conversation_id = str(uuid.uuid4())
        
        # Define a function to communicate with the backend
        async def create_backend_conversation():
            try:
                # Format the request for the Java backend, INCLUDING THE TITLE
                backend_request = {
                    "userId": user_id,
                    "managerType": manager_type,
                    "title": initial_title # Pass the title here
                }
                
                auth_header = request.headers.get("Authorization") # Re-get header just in case
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
                    logger.info(f"Backend created conversation ID: {conversation.get('conversationId', 'unknown')}, Title: {conversation.get('title')}")
                    return conversation
                else:
                    logger.error(f"Backend API error creating conversation: {response.status_code} - {response.text}")
                    return None
            except asyncio.TimeoutError:
                logger.error("Timeout creating conversation in backend")
                return None
            except Exception as e:
                logger.error(f"Error communicating with backend to create conversation: {str(e)}")
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
                    "updatedAt": backend_conversation.get("updatedAt", datetime.utcnow().isoformat()),
                    "persisted": True # Indicate successful backend persistence
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
                    "updatedAt": datetime.utcnow().isoformat(),
                    "persisted": False # Indicate this is a local fallback
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
                "updatedAt": datetime.utcnow().isoformat(),
                "persisted": False # Indicate this is a local fallback
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
            "updatedAt": datetime.utcnow().isoformat(),
            "persisted": False # Indicate this is a local fallback
        }

async def send_to_backend(conversation_id: str, message_id: str, content: str, role: str, auth_header: str):
    """Sends a single message (user or assistant) to the backend persistence endpoint.

    THIS IS THE NEW FUNCTION TO SAVE PRE-GENERATED MESSAGES.

    """
    endpoint = f"{BACKEND_BASE_URL}/api/v1/conversation/message/save" # NEW Endpoint
    payload = {
        "conversationId": conversation_id,
        "messageId": message_id, # Optional: Backend might generate its own ID
        "content": content,
        "role": role,
        "createdAt": datetime.now(UTC).isoformat() # Add timestamp
    }
    headers = {
        "Authorization": auth_header,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    try:
        async with httpx.AsyncClient() as client:
            logger.info(f"Sending {role} message to NEW backend save endpoint: {endpoint} for conv {conversation_id}")
            response = await client.post(endpoint, json=payload, headers=headers, timeout=10.0)
            response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
            logger.info(f"Successfully sent {role} message to backend save endpoint for conv {conversation_id}. Status: {response.status_code}")
            return True
    except httpx.RequestError as exc:
        logger.error(f"HTTP RequestError sending {role} message to backend save endpoint {endpoint} for conv {conversation_id}: {exc}")
    except httpx.HTTPStatusError as exc:
        logger.error(f"HTTP StatusError sending {role} message to backend save endpoint {endpoint} for conv {conversation_id}: {exc.response.status_code} - {exc.response.text[:100]}")
    except Exception as e:
        logger.error(f"Unexpected error sending {role} message to backend save endpoint {endpoint} for conv {conversation_id}: {str(e)}")
        logger.error(traceback.format_exc())
    return False

@app.post("/api/v1/conversation/message",
    tags=["Frontend Compatibility"],
    summary="Send a message and get AI response",
    description="Generates AI response and schedules artifact generation. Does NOT save messages."
)
async def send_message(
    request: Request,
    background_tasks: BackgroundTasks,
    agent: LangChainAgent = Depends(get_agent)
):
    """
    Handles incoming messages from the frontend, generates an AI response,
    and schedules background tasks for artifact generation.
    This endpoint does NOT save messages to the backend; it returns message IDs
    for the frontend to manage persistence.
    """
    logger.info(f"send_message invoked. Request URL: {request.url}")
    body = await request.json()
    logger.info(f"Request body: {body}")

    conversation_id = body.get("conversationId")
    user_query = body.get("userQuery")
    manager_type = body.get("managerType") # Included for consistency, though agent might have its own
    temperature = body.get("temperature", 0.7)
    request_type = body.get("request_type", "initial_query") # Default to initial_query

    # Generate unique IDs for user and assistant messages for frontend tracking
    user_message_id = str(uuid.uuid4())
    assistant_message_id = str(uuid.uuid4())
    current_time = datetime.now(UTC).isoformat()

    if not user_query or not conversation_id:
        logger.error(f"Missing required fields: userQuery={user_query}, conversationId={conversation_id}")
        return JSONResponse(
            status_code=400,
            content={
                "messages": [{
                    "id": assistant_message_id,
                    "conversationId": conversation_id or "unknown",
                    "role": "assistant",
                    "content": "Error: Missing userQuery or conversationId.",
                    "createdAt": current_time,
                    "isLoading": False
                }]
            }
        )

    logger.info(f"Processing message for conv {conversation_id}. Type: {request_type}. Query: '{user_query[:50]}...'")
    
    try:
        # --- Define System Prompts used by this endpoint ---
        default_system_prompt = """You are EVA, an ethical AI assistant designed to guide technology professionals through ethical dilemmas in their projects. You operate under the EVA framework, utilizing RAG-based (Retrieval-Augmented Generation) methods to leverage an internal knowledge base, enhancing your responses' accuracy and relevance.

Your Role
    • Advisor: Engage users in friendly, supportive conversations to help navigate ethical challenges in technology projects.
    • Trainer: Offer simulated practice scenarios with realistic feedback to help users improve ethical decision-making skills.
    • Evaluator: Provide detailed, actionable feedback and ethical scoring on user performance in practice scenarios.

Communication Style
    • Be supportive, friendly, and conversational.
    • Provide clear, concise guidance integrated seamlessly into conversation.
    • Avoid technical jargon, formal headings, and overly structured language.
    • Always address the user in the second person and yourself in the first person.
    • Responses should be brief but insightful, expanding detail only upon user request.

Interaction Workflow
    • Understand and clarify the user's ethical dilemma or scenario clearly.
    • Discuss the ethical implications, including privacy, data protection, transparency, consent, and compliance.
    • Suggest practical approaches or solutions, balancing ethical considerations and business needs.
    • Proactively offer simulated practice sessions when appropriate:
    • "Would you like to practice how to approach this situation? [Yes, practice] [No, not now]"

Tools and Techniques
    • Artifact Session (RAG-based): Generate responses and feedback utilizing an internal knowledge base.
    • Scenario Simulation: Facilitate simulated interactions, where users practice addressing ethical challenges.
    • Performance Evaluation: Provide detailed scoring and actionable feedback to users post-simulation.

Response Guidelines
    • When the user initiates a scenario, start by acknowledging their situation empathetically.
    • Clearly articulate ethical concerns raised by the scenario, guiding users to reflect deeply.
    • When users complete practice scenarios:
    • Provide specific, detailed feedback on their ethical reasoning and decision-making process.
    • Highlight areas of strength clearly.
    • Suggest improvements and alternative actions tactfully.
    • Enable smooth transition back to regular conversation after scenario practices.
    • After providing feedback, ask: "Do you feel ready to discuss this with your manager, or would you like to practice again? [Yes, help draft email] [No, practice again]"

# Updated instruction for initial practice prompt
    • For initial guidance on an ethical dilemma (when your response is not an email draft, a rehearsal setup, a simulated reply, or a feedback summary), ALWAYS conclude your response by asking the *exact question*: "Would you like to practice how to approach this situation?" and then, clearly separated (e.g., on a new line), include the text '[Yes, practice] [No, not now]'. This question and its options MUST be the very last part of such responses.

Memory and Context Management
    • Record user preferences, previous scenarios, and performance scores proactively to maintain context across interactions.
    • Use this context to personalize future recommendations and scenario suggestions.

Security and Compliance
    • Never store sensitive or personally identifiable user information.
    • Always follow best ethical practices, ensuring privacy and data minimization principles.

Example Interaction

User: "I'm concerned about storing unnecessary user data."

EVA: "It's great you're considering the privacy implications. Storing unnecessary data can indeed create risks. Have you discussed alternative approaches with your team to minimize data collection? Would you like to practice addressing this with a simulated manager? [Yes, practice] [No, not now]"
"""

        post_feedback_prompt = """You are EVA, an empathetic and helpful Ethical AI assistant.
The user has just completed a practice scenario and is asking for feedback on their performance or score.
Analyze their query and provide constructive, specific feedback on their ethical reasoning and decision-making demonstrated in the scenario they describe.
Acknowledge their score if mentioned.

Your feedback MUST be structured *exactly* as follows, using these *exact literal headings* on their own lines, with no additional sections:

1.  `**Introductory Paragraph:**` [1-2 sentences acknowledging the user's practice session.]

2.  `**Summary of Feedback:**` [Concise overall summary of performance and score, if mentioned.]

3.  `**Detailed Feedback:**`
    *   Under this heading, provide EXACTLY these four sections, each starting with its *exact literal heading* **on its own new line, with no leading markdown characters (*, -) or other formatting**:*
        *   `Strengths`
            [Provide bullet points analyzing *each* decision listed in the user's prompt that was a strength. Example: - Decision X: [Explanation]]
        *   `Areas for Improvement`
            [Provide bullet points analyzing *each* decision listed in the user's prompt that could be improved. Example: - Decision Y: [Explanation]]
        *   `Reasoning Process`
            [Overall analysis of the user's ethical reasoning pattern.]
        *   `Practical Advice for the Future`
            [General advice based on the overall performance.]

4.  `**Concluding Action Prompt:**`
    End with the *exact text*: "Do you feel ready to discuss this with your manager, or would you like to practice again? [Yes, help draft email] [No, practice again]"

**CRITICAL:** The headings `**Introductory Paragraph:**`, `**Summary of Feedback:**`, `**Detailed Feedback:**`, `Strengths`, `Areas for Improvement`, `Reasoning Process`, `Practical Advice for the Future`, and `**Concluding Action Prompt:**` MUST appear exactly as written, each on its own line where specified. Do not add extra formatting or deviate.
"""

        email_draft_prompt = """You are EVA, an empathetic AI assistant.
The user wants to draft an email to their boss about an ethical dilemma they have discussed **previously in the conversation history**.
**IMPORTANT:** Base the draft **ONLY** on the original ethical dilemma described by the user earlier in the conversation. **DO NOT** mention the practice scenario, the user's score, the feedback received, or EVA itself in the email draft.

Your task is to generate a concise, professional, and actionable draft email based on the **original problem description** found in the history.

The email should:
1.  Clearly and respectfully state the **original ethical concern** (e.g., data collection, privacy, bias).
2.  Briefly explain *why* it is a concern (e.g., potential harm, compliance issues, company values).
3.  Suggest a constructive path forward, such as requesting a meeting to discuss the issue further or proposing an alternative approach.
4.  Maintain a professional and collaborative tone.

Output ONLY the draft email content (Subject and Body). Do not include any surrounding conversational text, greetings to EVA, or explanations about the email.
Example Structure:

Subject: Discussion regarding [Brief Topic of Concern]

Dear [Boss's Name],

[Sentence briefly stating the reason for the email - raising an ethical concern about a specific project/feature.]
[Sentence explaining the core ethical issue and its potential implications.]
[Sentence proposing a next step, e.g., "I would appreciate the opportunity to discuss this further with you at your convenience." or "Could we schedule a brief meeting to explore potential solutions?"]

Best regards, // or Sincerely,

[Your Name Placeholder - Use a generic placeholder like '[Your Name]']
"""

        rehearsal_prompt = """You are EVA, an AI assistant.
The user has just had an email drafted (or copied an existing one) and wants to practice responding to their boss's potential reactions.
Your response should be:
"Okay, I've copied the draft to your clipboard. Now, would you like to rehearse how you might respond to your boss's potential reactions? [Practice responding to a negative reply] [Practice responding to a positive reply]"
Provide only this exact text.
"""

        simulate_reply_prompt = """You are simulating a boss responding to an email about an ethical concern.
The user will have specified if your reply should be 'positive' or 'negative'.
**IMPORTANT:** Read the conversation history to find the **user's previously drafted email** stating their ethical concern. Your simulated reply MUST be based **solely** on the content and concern raised in **that specific email draft**. **DO NOT** reference any practice scenarios, scores, feedback, or details from the user's *most recent* message asking for the simulation.

Your task is to:
1.  Adopt the persona of the boss who received the user's drafted email.
2.  Based on the user's request in their *current* message (negative or positive simulation):
    *   **If Negative:** Write a reply that is dismissive, defensive, minimizes the concern, or deflects responsibility regarding the **ethical issue raised in the original email**. Keep it professional but clearly resistant.
    *   **If Positive:** Write a reply that acknowledges the concern **raised in the original email**, shows appreciation for raising it, suggests collaboration, or proposes a meeting to discuss it further. Keep it professional and constructive.
3.  Reference the **specific ethical concern** mentioned in the user's **original email draft** (available in history).
4.  Keep the reply concise and realistic for an email response. Use a professional sign-off like "Best," followed by a placeholder like "Boss's Name". **Use plain text for the placeholder name, do not use markdown.**
5.  **Output:** Provide *only* the simulated boss's reply text. Do not include any extra conversational text, greetings to EVA, or explanations.
"""

        # --- Determine Prompt based on User Query ---
        selected_system_prompt = default_system_prompt
        lower_user_query = user_query.lower()
        
        # Check for specific flows first
        if request_type == "post_feedback":
            selected_system_prompt = post_feedback_prompt
            logger.info(f"Using post-feedback prompt for conv {conversation_id} based on request_type")
        elif lower_user_query.startswith("please help me draft an email"): 
            selected_system_prompt = email_draft_prompt
            logger.info(f"Using email draft prompt for conv {conversation_id}")
        elif lower_user_query.startswith("okay, i've copied the draft."):
            selected_system_prompt = rehearsal_prompt
            logger.info(f"Using rehearsal prompt for conv {conversation_id}")
        elif lower_user_query.startswith("okay, please simulate a"): 
            selected_system_prompt = simulate_reply_prompt
            logger.info(f"Using simulate reply prompt for conv {conversation_id}")
        # ADD CHECK: Detect post-practice feedback summary
        elif (
            "practice scenario" in lower_user_query and 
            ("completed" in lower_user_query or "finished" in lower_user_query) and
            ("score was" in lower_user_query or "decision-making score" in lower_user_query)
        ):
             selected_system_prompt = post_feedback_prompt # Use the correct prompt
             logger.info(f"Using post-feedback prompt for conv {conversation_id} based on keywords")
        else:
             # Fallback to default
             logger.info(f"Using default system prompt for conv {conversation_id}")

        # --- Retrieve conversation history ---
        conversation_context = conversation_memory.format_for_prompt(conversation_id)
        if conversation_context:
            logger.info(f"Retrieved conversation history for {conversation_id}")
            selected_system_prompt = f"{selected_system_prompt}\n\n{conversation_context}"
        else:
            logger.info(f"No conversation history found for {conversation_id}")

        # --- Generate AI Response --- 
        ai_response_content = "Error: Failed to generate AI response." # Default error
        try:
            llm = ChatOpenAI(
                model_name="gpt-4o-mini",
                temperature=temperature,
                openai_api_key=os.getenv('OPENAI_API_KEY')
            )
            
            messages_for_llm = [
                SystemMessage(content=selected_system_prompt),
                HumanMessage(content=user_query) # Pass the original user query for context
            ]
            
            llm_response = await llm.ainvoke(messages_for_llm)
            ai_response_content = llm_response.content
            logger.info(f"Generated AI response for conv {conversation_id} using relevant prompt.")
            
            # Save to conversation memory
            conversation_memory.save_exchange(conversation_id, user_query, ai_response_content)
            logger.info(f"Saved conversation exchange to memory for {conversation_id}")
            
        except Exception as e:
            logger.error(f"Error generating AI response for conv {conversation_id}: {str(e)}")
            logger.error(traceback.format_exc())
            # Explicitly set error content if LLM call fails
            ai_response_content = f"Error: Failed to generate AI response due to: {str(e)}" 
        # --- End AI Response Generation ---

        # ADDED: Log the full content specifically for feedback requests before returning
        if request_type == "post_feedback":
            logger.info(f"[Feedback Content Check] Full AI Response Content for Feedback (conv {conversation_id}): '{ai_response_content}'")

        # --- Send RAG Artifacts Generation to Background --- 
        if "Error:" not in ai_response_content and selected_system_prompt == default_system_prompt:
            # Only generate artifacts for default interactions, not drafts or rehearsals or simulations
            logger.info(f"Adding background task generate_and_save_artifacts for conv {conversation_id}")
            background_tasks.add_task(generate_and_save_artifacts, agent, user_query, conversation_id, os.environ.get("CURRENT_AUTH_TOKEN", ""))
        else:
            logger.warning(f"Skipping artifact generation for conv {conversation_id} (AI error, draft, rehearsal, or simulation)")
        # --- End RAG --- 

        # --- Return immediate response to Frontend --- 
        # Return IDs and AI content; frontend will handle saving messages
        response_payload = {
            "messages": [
                {
                    "id": user_message_id, # Return ID for user message
                    "conversationId": conversation_id,
                    "role": "user",
                    "content": user_query,
                    "createdAt": current_time
                },
                {
                    "id": assistant_message_id, # Return ID for assistant message
                    "conversationId": conversation_id,
                    "role": "assistant",
                    "content": ai_response_content, 
                    "createdAt": current_time,
                    "isLoading": False 
                }
            ]
        }
            
        return response_payload
        # --- End Frontend Response ---
            
    except Exception as e:
        logger.error(f"Critical error processing message request (agent generation): {str(e)}")
        logger.error(traceback.format_exc())
        # Return error structure consistent with success response but with error content
        return JSONResponse(
            status_code=500,
            content={
                 "messages": [
                    {
                        "id": str(uuid.uuid4()), # Generate dummy IDs
                        "conversationId": body.get("conversationId", "unknown"),
                        "role": "assistant",
                        "content": f"Internal server error in agent: {str(e)}", 
                        "createdAt": datetime.now(UTC).isoformat(),
                        "isLoading": False 
                    }
                ]
            }
        )

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
        
        # Define the correct backend URL (ensure this is correct in your environment)
        logger.info(f"[Artifact Generation] Using backend URL: {BACKEND_BASE_URL}")
        
        # Try multiple endpoints that match the frontend
        # The artifacts may be accessible at different endpoints depending on the API implementation
        endpoints = [
            f"{BACKEND_BASE_URL}/api/v1/knowledge-artifacts",
            f"{BACKEND_BASE_URL}/api/v1/rag-artifacts",
            f"{BACKEND_BASE_URL}/api/v1/conversation/{conversation_id}/knowledge-artifacts"
        ]
        
        # Send artifacts to backend with retry logic for different endpoints
        async with httpx.AsyncClient(timeout=10.0) as client:
            sent_successfully = False
            
            for endpoint in endpoints:
                logger.info(f"[Artifact Sending] Trying endpoint: {endpoint}")
                try:
                    response = await client.post(
                        endpoint,
                        json=artifact_payload,
                        headers={
                            "Authorization": auth_header,
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        }
                    )
                    response.raise_for_status() # Raise HTTPStatusError for bad responses (4xx or 5xx)
                    logger.info(f"[Artifact Sending SUCCESS] Successfully sent to {endpoint}. Status: {response.status_code}")
                    sent_successfully = True
                    break # Exit loop on first successful send
                except httpx.RequestError as exc:
                    # More specific error logging
                    if isinstance(exc, httpx.ConnectError):
                        logger.error(f"[Artifact Sending ERROR] Failed to connect to {endpoint}: {exc}")
                    elif isinstance(exc, httpx.TimeoutException):
                        logger.error(f"[Artifact Sending ERROR] Timeout connecting to {endpoint}: {exc}")
                    else:
                        logger.error(f"[Artifact Sending ERROR] Request error sending to {endpoint}: {exc}")
                except httpx.HTTPStatusError as exc:
                    logger.error(f"[Artifact Sending ERROR] HTTP error sending to {endpoint}: Status {exc.response.status_code} - {exc.response.text}")
                except Exception as e:
                    # Catch any other unexpected errors
                    logger.error(f"[Artifact Sending ERROR] Unexpected error sending to {endpoint}: {e}\n{traceback.format_exc()}")
            
            if not sent_successfully:
                logger.error(f"[Artifact Sending FAILED] All endpoints failed for conversation {conversation_id}")
        
    except Exception as outer_err:
        logger.error(f"[Artifact Generation FATAL] Unhandled error in generate_and_save_artifacts for conv {conversation_id}: {outer_err}")
        logger.error(traceback.format_exc())

    logger.info(f"[Artifact Generation END] for conversation: {conversation_id}")

@app.delete("/api/v1/conversation/{conversation_id}",
    tags=["Frontend Compatibility"],
    summary="Delete a conversation",
    description="Deletes a conversation and its messages"
)
async def delete_conversation(conversation_id: str, request: Request):
    """Proxy delete conversation request to the Java backend and clear memory."""
    try:
        # Extract the authorization header from the incoming request
        auth_header = request.headers.get("Authorization")
        headers = {
            "Accept": "application/json"
        }
        
        if auth_header:
            headers["Authorization"] = auth_header
        
        logger.info(f"Processing delete request for conversation: {conversation_id}")
        
        # Clear conversation memory
        conversation_memory.clear_history(conversation_id)
        logger.info(f"Cleared conversation memory for ID: {conversation_id}")
        
        # Make a request to the backend API
        try:
            # The Java backend has this endpoint at /api/v1/conversation/{id}
            response = requests.delete(
                f"{BACKEND_BASE_URL}/api/v1/conversation/{conversation_id}",
                headers=headers,
                timeout=8
            )
        
            # Check if the request was successful
            if response.status_code in [200, 204]:
                logger.info(f"Successfully deleted conversation ID: {conversation_id}")
                # Return a 204 No Content response
                return JSONResponse(content={}, status_code=204)
            else:
                logger.error(f"Backend API error: {response.status_code} - {response.text}")
                # Return the same status code from the backend
                return JSONResponse(content={}, status_code=response.status_code)
        except requests.exceptions.RequestException as req_error:
            logger.error(f"Error making delete request: {str(req_error)}")
            # Return empty dict with 500 error status
            return JSONResponse(content={}, status_code=500)
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        logger.error(traceback.format_exc())
        # Return empty dict with 500 error status
        return JSONResponse(content={}, status_code=500)

@app.post("/api/v1/practice-score/submit",
    tags=["Frontend Compatibility"],
    summary="Submit practice score data",
    description="Receives practice score details from the frontend (currently just logs it)."
)
async def submit_practice_score(
    request: Request,
    payload: PracticeScorePayload
):
    """Handle submission of practice scenario scores."""
    try:
        logger.info(f"Received practice score submission for conv {payload.conversationId}")
        logger.debug(f"Practice score payload: {payload.dict()}")
        
        # TODO: Implement actual saving logic if needed (e.g., to database or Redis)
        
        return JSONResponse(status_code=200, content={"message": "Practice score received successfully"})
    except Exception as e:
        logger.error(f"Error processing practice score submission for conv {payload.conversationId}: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal server error processing practice score")