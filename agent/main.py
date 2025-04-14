from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import uvicorn
import os
from dotenv import load_dotenv
import logging
from agents.langchain_agent import LangChainAgent
from datetime import datetime, UTC, timezone
import uuid
from pathlib import Path
import json
import requests
import traceback
import asyncio
import httpx
import concurrent.futures
from langchain.schema import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from fastapi.responses import JSONResponse
from practice_module import InteractionFlow, StrategyKnowledge
import re
import random  # Added for random choice in practice mode
import hashlib
from uuid import UUID

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

# --- Inserted Helper Functions Start ---

async def save_knowledge_artifacts(conversation_id: str, payload: dict) -> bool:
    """
    Saves the generated knowledge artifacts (guidelines, case studies) to the backend database.

    Args:
        conversation_id: The ID of the conversation.
        payload: A dictionary containing the artifacts to save, matching the backend API expectation.
                 Expected keys: "conversationId", "guidelines", "caseStudies", "timestamp".

    Returns:
        True if saving was successful, False otherwise.
    """
    logger.info(f"Attempting to save knowledge artifacts to database for conversation {conversation_id}")
    
    # Set up headers for the database request
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # Add token if available 
    token = os.getenv('CURRENT_AUTH_TOKEN')
    if token:
        if not token.startswith('Bearer '):
            token = f"Bearer {token}"
        headers["Authorization"] = token

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{BACKEND_BASE_URL}/api/v1/knowledge-artifacts",
                json=payload,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"Successfully saved artifacts for conversation {conversation_id}")
                return True
            else:
                logger.error(f"Failed to save artifacts. Status: {response.status_code}, Response: {response.text[:500]}")
                return False
    except Exception as e:
        logger.error(f"Error saving artifacts to database: {str(e)}")
        logger.error(traceback.format_exc())
        return False

async def generate_and_save_artifacts(conversation_id: str, request: Request, retry_count: int) -> "KnowledgeArtifactsResponse":
    """
    Generates new knowledge artifacts using the agent based on the conversation ID,
    saves them to the database, and returns them.

    Args:
        conversation_id: The ID of the conversation.
        request: The FastAPI request object (currently unused but kept for signature consistency).
        retry_count: The current retry attempt number (unused).

    Returns:
        A KnowledgeArtifactsResponse containing the generated guidelines and case studies.
        Returns empty artifacts if generation or saving fails.
    """
    logger.warning(f"Generating and saving artifacts for conversation {conversation_id} as none were found in DB.")
    
    guidelines = []
    case_studies = []

    try:
        # Initialize agent
        agent = get_agent()
        if not agent:
             logger.error("Agent could not be initialized in generate_and_save_artifacts.")
             # Return empty artifacts if agent fails
             return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])

        # TODO: Improve query generation - ideally use last user message or context
        # Using a placeholder query for now, similar to direct_knowledge_artifacts
        query = f"Generate relevant guidelines and case studies for conversation {conversation_id}"
        logger.info(f"Generating artifacts with placeholder query: '{query}'")

        # Generate guidelines and case studies
        try:
            guidelines = agent.get_relevant_guidelines(query, max_results=5) # Assuming GuidelineItem structure
            logger.info(f"Generated {len(guidelines)} guidelines")
            
            case_studies = agent.get_relevant_case_studies(query, max_results=3) # Assuming CaseStudyItem structure
            logger.info(f"Generated {len(case_studies)} case studies")
            
            # Ensure the format matches KnowledgeArtifactsResponse Pydantic models
            # Convert agent output if necessary (assuming agent returns dicts compatible with Pydantic)
            guidelines = [GuidelineItem(**g) for g in guidelines if isinstance(g, dict)]
            case_studies = [CaseStudyItem(**cs) for cs in case_studies if isinstance(cs, dict)]

        except Exception as e:
            logger.error(f"Error during artifact generation by agent: {str(e)}")
            logger.error(traceback.format_exc())
            # Return empty artifacts if generation fails
            return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])

        # Save the generated artifacts to the database if any were generated
        if guidelines or case_studies:
            try:
                # Prepare DTOs for database storage (matching backend expectation)
                guideline_dtos = [{
                    "title": g.title, "description": g.description, "artifactId": g.id,
                    "artifactType": "GUIDELINE", "relevance": g.relevance, "source": g.source, "category": g.category
                 } for g in guidelines]

                case_study_dtos = [{
                    "title": cs.title, "description": cs.summary, "artifactId": cs.id, # Using summary for description
                    "artifactType": "CASE_STUDY", "relevance": cs.relevance, "source": cs.source, "outcome": cs.outcome
                 } for cs in case_studies]

                # Create the database payload
                save_payload = {
                    "conversationId": conversation_id, # Ensure this is the UUID formatted one if needed
                    "guidelines": guideline_dtos,
                    "caseStudies": case_study_dtos,
                    "timestamp": datetime.now(timezone.utc).isoformat() # Use UTC timezone
                }

                # Save to database (fire and forget for now, log errors)
                save_success = await save_knowledge_artifacts(conversation_id, save_payload)
                if not save_success:
                     logger.error(f"Failed attempt to save generated artifacts for conversation {conversation_id}")
                
            except Exception as e:
                logger.error(f"Error preparing or saving generated artifacts to database: {str(e)}")
                logger.error(traceback.format_exc())
        else:
            logger.info(f"No artifacts were generated for conversation {conversation_id}, nothing to save.")

        # Return the generated artifacts regardless of save success
        return KnowledgeArtifactsResponse(guidelines=guidelines, caseStudies=case_studies)

    except Exception as e:
        logger.error(f"Unexpected error in generate_and_save_artifacts for conversation {conversation_id}: {str(e)}")
        logger.error(traceback.format_exc())
        # Return empty artifacts on major failure
        return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])

# --- Inserted Helper Functions End ---

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
    managerType: Optional[str] = Field(
        None,
        description="Type of manager for the conversation",
        example="PUPPETEER"
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
        description="List of conversation messages",
        example=[{"role": "user", "content": "What are the ethical implications..."}]
    )

class KnowledgeArtifactsResponse(BaseModel):
    """Model for knowledge artifacts response."""
    guidelines: List[GuidelineItem] = Field(..., description="List of relevant ethical guidelines")
    caseStudies: List[CaseStudyItem] = Field(..., description="List of relevant case studies")

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
                    'index_dir': os.getenv('INDEX_DIR', 'data/processed/combined'), # Reverted default path
                    'openai_api_key': os.getenv('OPENAI_API_KEY')
                }
        else:
            logger.info("No configuration file found, using default config")
            # Default configuration
            config = {
                'cache_dir': 'cache',
                'index_dir': os.getenv('INDEX_DIR', 'data/processed/combined'), # Reverted default path
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
    response_model=ConversationContentResponseDTO, # Revert to original DTO
    tags=["Conversation"],
    summary="Process ethical query",
    description="Processes an ethical query and returns guidance"
)
async def generate_response(
    query: Query,
    request: Request,
    agent: LangChainAgent = Depends(get_agent)
) -> ConversationContentResponseDTO: # Revert return type hint
    """
    Process an ethical query and return guidance.
    """
    conversation_id = query.conversationId
    
    conversation_id_for_backend = conversation_id
    if conversation_id.startswith("draft-"):
        md5_hash = hashlib.md5(conversation_id.encode()).hexdigest()
        conversation_id_for_backend = str(uuid.UUID(md5_hash))
        logging.info(f"Using generated stable UUID {conversation_id_for_backend} for draft conversation {conversation_id}")
    
    try:
        # Process the query with the agent
        response = agent.process_query(
            query.userQuery,
            manager_type=query.managerType,
            session_id=query.conversationId
        )
        
        # Revert to returning the original DTO structure
        return ConversationContentResponseDTO(
            id=str(uuid.uuid4()),
            conversationId=query.conversationId,
            userQuery=query.userQuery,
            agentResponse=response,
            createdAt=datetime.now(UTC).isoformat(),
            inPracticeMode=False
        )
    except Exception as e:
        logging.error(f"Error generating agent response: {str(e)}")
        logging.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error generating agent response: {str(e)}"
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
            # More conversational, friendly entering practice mode messages
            enter_messages = [
                "Great idea! Let's dive into some practice scenarios to help you feel more confident. I'll simulate realistic manager conversations so you can practice your ethical advocacy skills in a safe environment. Ready to get started?",
                
                "I think practicing is a fantastic way to prepare! I'll play the role of different manager types and give you feedback on your responses. This will help you develop effective strategies for real-world ethical situations. Shall we begin?",
                
                "Perfect, let's practice together! I'll create simulated ethical scenarios with different manager personalities so you can try various approaches. Don't worry about making mistakes - that's what practice is for! Ready when you are."
            ]
            response = random.choice(enter_messages)
        else:
            # More conversational, friendly exiting practice mode messages
            exit_messages = [
                "Thanks for practicing! I hope you found those scenarios helpful. Let's return to our conversation - how else can I support you with ethical decision-making?",
                
                "Great practice session! You've explored some valuable strategies for ethical advocacy. Now we're back in conversation mode - what other ethical questions or concerns would you like to discuss?",
                
                "That was good practice! Handling ethical situations takes both knowledge and skill, and you're developing both. I'm here if you want to discuss any other ethical challenges you're facing."
            ]
            response = random.choice(exit_messages)
            
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

# New imports for practice module
from practice_module import InteractionFlow, StrategyKnowledge

# Initialize the practice flow as a global singleton for efficiency
practice_flow = InteractionFlow()

# New model for scenario listings
class ScenarioListItem(BaseModel):
    """Model for scenario listing."""
    id: str = Field(..., description="Unique identifier for the scenario")
    concern: str = Field(..., description="Ethical concern category")
    issue: str = Field(..., description="Specific ethical issue")
    manager_type: str = Field(..., description="Type of manager (Puppeteer, Camouflager, etc.)")
    ethical_breach_intensity: str = Field(..., description="Intensity of the ethical breach (High, Medium, Low)")

# Response model for scenario listings
class ScenariosListResponse(BaseModel):
    """Model for scenarios list response."""
    scenarios: List[ScenarioListItem] = Field(..., description="List of available ethical scenarios")

# Model for starting a scenario
class StartScenarioRequest(BaseModel):
    """Model for starting a scenario."""
    scenario_id: str = Field(..., description="ID of the scenario to start")
    conversation_id: str = Field(..., description="Conversation ID for tracking")

# Model for scenario context
class ScenarioContext(BaseModel):
    """Model for scenario context."""
    id: str = Field(..., description="Scenario ID")
    concern: str = Field(..., description="Ethical concern")
    issue: str = Field(..., description="Specific ethical issue")
    manager_type: str = Field(..., description="Type of manager")
    manager_description: str = Field(..., description="Description of the manager type")

# Model for scenario state
class ScenarioState(BaseModel):
    """Model for scenario state."""
    scenario_context: ScenarioContext = Field(..., description="Context of the scenario")
    current_statement: str = Field(..., description="Current manager statement")
    available_choices: List[str] = Field(..., description="Available response choices")
    conversation_history: List[Dict[str, Any]] = Field(..., description="Conversation history")

# Model for submitting a response
class SubmitResponseRequest(BaseModel):
    """Model for submitting a response to a scenario."""
    scenario_id: str = Field(..., description="ID of the scenario")
    conversation_id: str = Field(..., description="Conversation ID for tracking")
    choice_index: int = Field(..., description="Index of the chosen response", ge=0)

# Model for feedback on a response
class ResponseFeedback(BaseModel):
    """Model for feedback on a scenario response."""
    feedback: str = Field(..., description="Feedback on the response")
    evs: int = Field(..., description="Ethical value score")
    is_complete: bool = Field(..., description="Whether the scenario is complete")
    next_statement: Optional[str] = Field(None, description="Next manager statement if any")
    available_choices: Optional[List[str]] = Field(None, description="Next available choices if any")
    final_report: Optional[Dict[str, Any]] = Field(None, description="Final evaluation if scenario is complete")

# Model for strategy recommendations
class StrategyRequest(BaseModel):
    """Model for requesting strategy recommendations."""
    manager_type: str = Field(..., description="Type of manager to get strategies for")

class StrategyInfo(BaseModel):
    """Model for strategy information."""
    name: str = Field(..., description="Name of the strategy")
    description: str = Field(..., description="Description of the strategy")

class StrategyRecommendation(BaseModel):
    """Model for strategy recommendations."""
    manager_type: str = Field(..., description="Type of manager")
    manager_description: str = Field(..., description="Description of the manager type")
    recommended_strategies: List[StrategyInfo] = Field(..., description="Recommended strategies")

@app.get("/practice/scenarios",
    response_model=ScenariosListResponse,
    tags=["Practice"],
    summary="Get available scenarios",
    description="Returns a list of available ethical scenarios for practice"
)
async def get_available_scenarios() -> ScenariosListResponse:
    """Get a list of available ethical scenarios."""
    try:
        scenarios = practice_flow.get_available_scenarios()
        return ScenariosListResponse(scenarios=scenarios)
    except Exception as e:
        logger.error(f"Error getting available scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/practice/scenarios/start",
    response_model=ScenarioState,
    tags=["Practice"],
    summary="Start a scenario",
    description="Start a specific practice scenario"
)
async def start_scenario(request: StartScenarioRequest) -> ScenarioState:
    """Start an ethical practice scenario."""
    try:
        scenario_data = practice_flow.start_scenario(request.scenario_id)
        
        if "error" in scenario_data:
            raise HTTPException(status_code=404, detail=scenario_data["error"])
            
        return ScenarioState(**scenario_data)
    except KeyError as e:
        logger.error(f"Invalid scenario data format: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Invalid scenario data format: {str(e)}")
    except Exception as e:
        logger.error(f"Error starting scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/practice/scenarios/respond",
    response_model=ResponseFeedback,
    tags=["Practice"],
    summary="Submit response",
    description="Submit a response to the current scenario statement"
)
async def submit_response(request: SubmitResponseRequest) -> ResponseFeedback:
    """Submit a response to an ethical scenario."""
    try:
        result = practice_flow.submit_response(request.choice_index)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
            
        return ResponseFeedback(**result)
    except KeyError as e:
        logger.error(f"Invalid response data format: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Invalid response data format: {str(e)}")
    except Exception as e:
        logger.error(f"Error submitting response: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/practice/strategies",
    response_model=StrategyRecommendation,
    tags=["Practice"],
    summary="Get strategy recommendations",
    description="Get recommendations for dealing with a specific manager type"
)
async def get_strategy_recommendations(request: StrategyRequest) -> StrategyRecommendation:
    """Get strategy recommendations for dealing with a specific manager type."""
    try:
        recommendations = practice_flow.get_strategy_recommendation(request.manager_type)
        return StrategyRecommendation(**recommendations)
    except Exception as e:
        logger.error(f"Error getting strategy recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/practice/reset",
    response_model=Dict[str, Any],
    tags=["Practice"],
    summary="Reset practice session",
    description="Reset the current practice session"
)
async def reset_practice_session() -> Dict[str, Any]:
    """Reset the current practice session."""
    try:
        result = practice_flow.reset()
        return result
    except Exception as e:
        logger.error(f"Error resetting practice session: {str(e)}")
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

@app.get("/api/health", status_code=200)
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "ok", "message": "Agent API is running"}

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
                    # Skip messages containing empty queries or default responses
                    if (msg.get("userQuery", "") == "" and msg.get("agentResponse", "").startswith("It seems like you haven't entered a question")):
                        logger.info(f"Filtering out empty query message")
                        continue
                        
                    # Create a new message with all required fields
                    transformed_msg = {
                        "id": msg.get("id") or str(uuid.uuid4()),
                        "conversationId": msg.get("conversationId") or conversation_id,
                        "createdAt": msg.get("createdAt") or datetime.utcnow().isoformat()
                    }
                    
                    # Handle both old and new message formats
                    if "role" in msg and "content" in msg:
                        # If it's a default response, skip it
                        if msg["role"] == "assistant" and (
                            "Hello! How can I assist you today with ethical decision-making" in msg["content"] or
                            "Greetings! I see you've chosen the 'PUPPETEER' style" in msg["content"] or
                            "It seems like you haven't entered a question or prompt" in msg["content"]
                        ):
                            logger.info(f"Filtering out default assistant message")
                            continue
                            
                        # Already in the new format
                        transformed_msg["role"] = msg["role"]
                        transformed_msg["content"] = msg["content"]
                        transformed_messages.append(transformed_msg)
                    else:
                        # Old format with userQuery/agentResponse
                        if "userQuery" in msg and msg.get("userQuery"):
                            # Skip empty queries
                            if msg["userQuery"].strip() == "":
                                continue
                                
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
                            # Skip default responses
                            if (
                                "Hello! How can I assist you today with ethical decision-making" in msg["agentResponse"] or
                                "Greetings! I see you've chosen the 'PUPPETEER' style" in msg["agentResponse"] or
                                "It seems like you haven't entered a question or prompt" in msg["agentResponse"]
                            ):
                                logger.info(f"Filtering out default assistant response")
                                continue
                                
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
            """Create a conversation in the backend."""
            try:
                # Extract the authorization header from the incoming request
                auth_header = request.headers.get("Authorization")
                headers = {
                    "Content-Type": "application/json", 
                    "Accept": "application/json"
                }
                
                if auth_header:
                    # Add Bearer prefix if not present
                    if not auth_header.startswith("Bearer "):
                        auth_header = f"Bearer {auth_header}"
                    headers["Authorization"] = auth_header
                    # Store for future use
                    os.environ["CURRENT_AUTH_TOKEN"] = auth_header
                
                # Make a request to the backend API with timeout
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        lambda: requests.post(
                            f"{BACKEND_BASE_URL}/api/v1/conversation",
                            json=request_body,
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
        # Parse request body
        body = await request.json()
        
        # Log the raw incoming request
        logger.info(f"Received message request: {body}")
        
        # Save the authorization token for future use
        auth_header = request.headers.get("Authorization")
        if auth_header:
            # Log token format (safely)
            auth_prefix = auth_header[:12] if len(auth_header) > 12 else auth_header
            auth_suffix = auth_header[-5:] if len(auth_header) > 5 else ""
            logger.info(f"Received token format: {auth_prefix}...{auth_suffix}, Length: {len(auth_header)}")
            
            # Store token as-is without trying to modify it
            os.environ["CURRENT_AUTH_TOKEN"] = auth_header
            logger.info("Saved authorization token for backend communication")
        else:
            logger.warning("No authorization token received in the request")
        
        # Extract key fields
        conversation_id = body.get("conversationId")
        content = body.get("content", body.get("userQuery", ""))
        temperature = float(body.get("temperature", 0.7))
        
        # Log request parameters
        logger.info(f"Processing message for conversation: {conversation_id}")
        logger.info(f"Message content length: {len(content)}")
        logger.info(f"Temperature: {temperature}")
        
        # Check if this is a practice feedback request by looking for specific content
        is_practice_feedback = (
            "practice scenario" in content.lower() and 
            "manager type" in content.lower() and
            ("feedback" in content.lower() or "ethical decision-making score" in content.lower())
        )
        
        # Use a longer timeout for practice feedback requests, which are more complex
        timeout_seconds = 30.0 if is_practice_feedback else 10.0
        
        # If practice feedback is detected, log it
        if is_practice_feedback:
            logger.info("Detected practice feedback request - using longer timeout")
        
        # Handle empty queries specially
        if not content or content.strip() == "":
            logger.info("Received empty message, returning generic response WITHOUT saving to backend")
            
            user_message_id = str(uuid.uuid4())
            assistant_message_id = str(uuid.uuid4())
            
            return {
                "messages": [
                    {
                        "id": user_message_id,
                        "conversationId": conversation_id,
                        "role": "user",
                        "content": content,
                        "createdAt": datetime.now(timezone.utc).isoformat()
                    },
                    {
                        "id": assistant_message_id,
                        "conversationId": conversation_id,
                        "role": "assistant",
                        "content": "It seems like you haven't entered a question or prompt. Feel free to ask me anything related to technology ethics, and I'll do my best to provide you with guidance and insights.",
                        "createdAt": datetime.now(timezone.utc).isoformat(),
                        "isLoading": False
                    }
                ]
            }
        
        # Generate unique IDs for messages
        user_message_id = str(uuid.uuid4())
        assistant_message_id = str(uuid.uuid4())
        
        # Validate required fields
        if not conversation_id:
            logger.error("Missing required fields in message request")
            return JSONResponse(
                status_code=400,
                content={"error": "Missing required fields: conversationId"}
            )
            
        # Check if this is a draft conversation
        is_draft = conversation_id.startswith('draft-')
        
        # Generate response immediately instead of async
        # We'll handle the background processing properly later
        try:
            logger.info(f"Processing message for conversation: {conversation_id}")
            
            # Process in background to avoid blocking
            background_task = asyncio.create_task(
                process_full_response(
                    conversation_id, 
                    content, 
                    assistant_message_id, 
                    user_message_id,
                    temperature,
                    agent,
                    is_draft
                )
            )
            
            # Wait a short time for the response to be ready
            # This ensures we don't wait too long before returning to the user
            try:
                response = await asyncio.wait_for(background_task, timeout=timeout_seconds)
                logger.info(f"Response generated within timeout period")
                
                # Filter out any references to manager types
                if any(style in response for style in ["PUPPETEER", "puppeteer", "Puppeteer", "DILUTER", "diluter", "Diluter", "CAMOUFLAGER", "camouflager", "Camouflager"]):
                    logger.warning("Response contained manager type references. Filtering out.")
                    # Create a more generic response that doesn't reference styles
                    response = "I'll help you with your ethical question. What specific aspects of technology ethics would you like to explore?"
            except asyncio.TimeoutError:
                logger.warning(f"Response generation taking longer than expected, returning early")
                # Let the task continue in the background
                response = "I'm processing your request. Please check back in a moment for my complete response."
                
            # Return user message and response
            return {
                "messages": [
                    {
                        "id": user_message_id,
                        "conversationId": conversation_id,
                        "role": "user",
                        "content": content,
                        "createdAt": datetime.now(timezone.utc).isoformat()
                    },
                    {
                        "id": assistant_message_id,
                        "conversationId": conversation_id,
                        "role": "assistant",
                        "content": response,
                        "createdAt": datetime.now(timezone.utc).isoformat(),
                        "isLoading": False
                    }
                ],
                "warning": "Backend connection may timeout. Your messages are displayed but may not be saved." if is_draft else None
            }
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            logger.error(traceback.format_exc())
            
            return JSONResponse(
                status_code=500,
                content={
                    "error": f"Error processing message: {str(e)}", 
                    "messages": [
                        {
                            "conversationId": conversation_id,
                            "role": "user",
                            "content": content
                        }
                    ]
                }
            )
    
    except Exception as e:
        logger.error(f"Error parsing request: {str(e)}")
        logger.error(traceback.format_exc())
        
        return JSONResponse(
            status_code=400,
            content={"error": f"Invalid request: {str(e)}"}
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
    """Process a complete user query and generate a response.
    
    This function is designed to be run in the background to avoid blocking the main thread.
    It handles sending the messages to the backend as well.
    """
    response = "I'm processing your request..."
    
    try:
        # If not a draft conversation, try to send the user message to backend
        if not is_draft:
            # Try to send user message to backend first (non-blocking)
            asyncio.create_task(send_to_backend(conversation_id, user_message_id, content, "user"))
        
        # Process the query with the agent
        try:
            logger.info(f"Generating agent response for conversation ID: {conversation_id}")
            response_dto = await process_query_stateless(agent, content, conversation_id, temperature)
            
            # Extract the actual response text from the DTO
            if isinstance(response_dto, ConversationContentResponseDTO):
                response = response_dto.agentResponse
            elif isinstance(response_dto, str):
                response = response_dto
            else:
                logger.warning(f"Unexpected response type: {type(response_dto)}")
                response = str(response_dto)
                
            logger.info(f"Generated response length: {len(response)}")
            logger.info(f"Response preview: {response[:100]}...")
            
            # If we have a draft conversation, we don't need to send to backend
            if not is_draft:
                # Send assistant response to backend (non-blocking)
                asyncio.create_task(send_to_backend(conversation_id, assistant_message_id, response, "assistant"))
                
            # Log success
            logger.info(f"Successfully processed message for conversation ID: {conversation_id}")
            return response
            
        except Exception as agent_error:
            logger.error(f"Error generating response: {str(agent_error)}")
            logger.error(traceback.format_exc())
            response = "I encountered an issue processing your request. Please try again."
            return response
        
    except Exception as e:
        logger.error(f"Error in background processing: {str(e)}")
        logger.error(traceback.format_exc())
        return "I apologize, but there was an error processing your request. Please try again."

async def send_to_backend(conversation_id: str, message_id: str, content: str, role: str):
    """Send a message to the backend for persistence.
    
    This runs in the background and should not block the main request flow.
    """
    # Configure a shorter timeout to prevent processing hanging
    try:
        logger.info(f"Sending message to backend for conversation {conversation_id}")
        
        # Detect if this is practice feedback
        is_practice_feedback = (
            "practice scenario" in content.lower() and 
            "manager type" in content.lower() and
            ("feedback" in content.lower() or "ethical decision-making score" in content.lower())
        )
        
        if is_practice_feedback:
            logger.info("Detected practice feedback request in message to backend")
        
        # Create an HTTP client with a timeout
        client = httpx.AsyncClient(timeout=10.0)  # Increased timeout for better reliability
        
        # Get token from environment
        token = os.environ.get("CURRENT_AUTH_TOKEN")
        
        # Prepare the request headers and payload
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        
        if token:
            headers["Authorization"] = token
        else:
            logger.warning("No token available for backend request")
        
        # Prepare the request payload
        payload = {
            "id": message_id,
            "conversationId": conversation_id,
            "content": content,
            "role": role
        }
        
        # Backend URL from environment
        backend_url = os.environ.get("BACKEND_URL", "http://localhost:8443")
        endpoint = f"{backend_url}/api/v1/conversation/message"
        
        # Add retries for better reliability
        max_retries = 3
        retry_count = 0
        success = False
        
        while retry_count <= max_retries and not success:
            try:
                response = await client.post(
                    endpoint,
                    json=payload,
                    headers=headers
                )
                
                # Log the response
                if response.status_code == 200:
                    logger.info(f"Successfully sent message to backend: {response.status_code}")
                    success = True
                    return True
                else:
                    logger.warning(f"Backend returned non-200 status: {response.status_code}")
                    logger.warning(f"Response content: {response.text[:200]}...")
                    # Increment retry count
                    retry_count += 1
                    
                    # Wait before retrying
                    if retry_count <= max_retries:
                        await asyncio.sleep(1 * retry_count)  # Exponential backoff
            except httpx.TimeoutException:
                logger.error("Timeout when sending message to backend")
                retry_count += 1
                if retry_count <= max_retries:
                    await asyncio.sleep(1 * retry_count)
            except Exception as e:
                logger.error(f"Error sending message to backend: {str(e)}")
                logger.error(traceback.format_exc())
                retry_count += 1
                if retry_count <= max_retries:
                    await asyncio.sleep(1 * retry_count)
        
        # If we've exhausted retries, return failure
        if not success:
            logger.error(f"Failed to send message to backend after {max_retries} retries")
            return False
            
        return False
    except Exception as e:
        logger.error(f"Error sending message to backend: {str(e)}")
        logger.error(traceback.format_exc())
        return False
    finally:
        await client.aclose()

async def process_query_stateless(agent: LangChainAgent, query: str, conversation_id: str, temperature: float):
    """Process a user query and generate a response without storing conversation state"""
    logger.info(f"Processing stateless query for conversation ID: {conversation_id}")
    
    try:
        # Check if this is a practice feedback request
        is_practice_feedback = False
        practice_data = None
        
        if "practice" in query.lower() and "feedback" in query.lower() and "score" in query.lower():
            logger.info("Detected practice feedback request")
            is_practice_feedback = True
            
            # Attempt to extract score and manager type from the query for backup
            score_match = re.search(r"scored (\d+)/100", query)
            manager_match = re.search(r"with a (\w+) manager", query)
            
            extracted_score = score_match.group(1) if score_match else "70"
            extracted_manager = manager_match.group(1) if manager_match else "PUPPETEER"
        
        # Use OpenAI for response generation
        model_name = "gpt-4o-mini" # Changed from gpt-3.5-turbo
        
        # Create the LLM model with the specified temperature
        llm = ChatOpenAI(
            model_name=model_name,
            temperature=temperature,
            openai_api_key=os.getenv('OPENAI_API_KEY')
        )
        
        # Define the system message for the assistant's role
        system_message = """You are EVA, an Ethical Virtual Assistant designed to support software professionals in making sound ethical decisions. Imagine you're a trusted, knowledgeable, and approachable colleague.

Your primary role is to provide concise, practical, and empathetic ethical guidance. Keep your responses clear, brief, and conversational—like a helpful chat with a coworker, not a lecture.

**Principles of your communication:**

- **Conversational Tone:** Communicate naturally and warmly, acknowledging the user's concerns briefly and empathetically.
- **Concise Clarity:** Offer succinct, actionable advice. Avoid unnecessary jargon or overly formal language.
- **Grounded Realism:** Base your advice strictly on real ethical guidelines (such as ACM/IEEE standards). If guidelines are unavailable, transparently use general ethical best practices. Never fabricate guidelines or references.
- **Constructive Engagement:** End with a brief, interactive question inviting further reflection or practice.
- **Balanced Perspective:** Acknowledge potential consequences and business implications succinctly and without exaggeration.

**Structured Response Format:**

1. **Brief Empathy:** Start with a quick acknowledgment of the user's situation (e.g., "That's definitely challenging...", "I understand the tension...").
2. **Core Ethical Insight:** Clearly state the main ethical consideration, briefly referencing relevant guidelines if directly applicable.
3. **Practical Advice:** Suggest a straightforward, practical step the user can take.
4. **Risk Awareness (if relevant):** Briefly mention potential risks like user trust or compliance issues.
5. **Interactive Prompt:** Close with a concise, inviting question (e.g., "Does this make sense?", "Would practicing this conversation help?").

**Critical Reminders:**

- Do NOT reference specific manager styles (Puppeteer, Diluter, Camouflager) unless explicitly asked.
- NEVER produce hallucinations—adhere strictly to provided facts and context.
- Keep responses conversationally short and avoid repetitive language.

Your goal is always to empower and educate, helping users navigate ethical complexity with confidence and clarity."""
        
        # If this is a practice feedback request, modify the system message to handle it
        if is_practice_feedback:
            logger.info("Using practice feedback system message")
            system_message = """You are EVA (Ethical Virtual Assistant), an AI assistant specialized in providing ethical guidance and feedback.

You are responding to a user who has just completed a practice scenario where they had to respond to a manager with questionable ethical demands.

Provide constructive feedback on their performance in the practice session. Consider:
1. How well they maintained ethical principles
2. The effectiveness of their communication
3. Their ability to balance professional obligations with ethical concerns
4. Specific suggestions for improvement
5. Positive reinforcement for good ethical decision-making

Be supportive and educational in your feedback."""
        
        # Process the query with proper error handling
        try:
            # Create the message list - add practice data if this is a feedback request
            messages = [{"role": "system", "content": system_message}]
            messages.append({"role": "user", "content": query})
            
            # Generate the response
            response = llm.predict_messages(messages)
            content = response.content
            logger.info(f"Generated response (first 50 chars): {content[:50]}...")
            
            # Check if the response contains any reference to manager types and regenerate if needed
            if any(style in content for style in ["PUPPETEER", "puppeteer", "Puppeteer", "DILUTER", "diluter", "Diluter", "CAMOUFLAGER", "camouflager", "Camouflager"]):
                logger.warning("Response contained manager type references. Regenerating...")
                
                # Add more explicit instructions
                stronger_message = system_message + """
                
                CRITICAL: Your previous response contained references to manager types or interaction styles.
                DO NOT mention "PUPPETEER", "DILUTER", "CAMOUFLAGER" or any variations of these terms in your response.
                Focus ONLY on addressing the ethical question.
                """
                
                # Regenerate with stronger instructions
                response = llm.predict_messages([
                    {"role": "system", "content": stronger_message},
                    {"role": "user", "content": query}
                ])
                content = response.content
                logger.info("Regenerated response without style references")
            
            # If this is not a practice feedback request and doesn't already have the practice prompt,
            # ensure it ends with the practice prompt
            # Modification: Use the prompt defined in the system message instead of hardcoding
            practice_prompt_text = "Would practicing a discussion around this be helpful?"
            if not is_practice_feedback and practice_prompt_text not in content:
                content = content.rstrip()
                if not content.endswith((".","?","!")):
                    content += "."
                content += f"\n\n{practice_prompt_text}"
                logger.info("Added practice prompt to response")
            
            return ConversationContentResponseDTO(
                id=str(uuid.uuid4()),
                conversationId=conversation_id,
                agentResponse=content,
                createdAt=datetime.utcnow().isoformat()
            )
            
        except Exception as llm_error:
            logger.error(f"Error from LLM: {str(llm_error)}")
            content = """I apologize, but I encountered an error generating a response. 

Here are some general ethical principles to consider:
- Respect for autonomy and individual rights
- Fairness and non-discrimination
- Transparency in AI systems
- Accountability for technology outcomes
- Privacy protection

If you'd like to try again with a more specific question, I'd be happy to help.

Would you like to practice this scenario with simulated manager responses? (yes/no)"""
            
            return ConversationContentResponseDTO(
                id=str(uuid.uuid4()),
                conversationId=conversation_id,
                agentResponse=content,
                createdAt=datetime.utcnow().isoformat()
            )
    
    except concurrent.futures.TimeoutError:
        logger.error("Response generation timed out")
        return ConversationContentResponseDTO(
            id=str(uuid.uuid4()),
            conversationId=conversation_id,
            agentResponse="I'm sorry, but I couldn't generate a response in time. Please try again with a simpler query.\n\nWould you like to practice this scenario with simulated manager responses? (yes/no)",
            createdAt=datetime.utcnow().isoformat()
        )
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        return ConversationContentResponseDTO(
            id=str(uuid.uuid4()),
            conversationId=conversation_id,
            agentResponse="I encountered an issue processing your request. Please try again.\n\nWould you like to practice this scenario with simulated manager responses? (yes/no)",
            createdAt=datetime.utcnow().isoformat()
        )

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

@app.get("/api/v1/auth/verify-token",
    tags=["Authentication"],
    summary="Verify token",
    description="Verifies if the token is valid by checking with the backend"
)
async def verify_token(request: Request):
    """Verify if the token is valid by forwarding the request to the backend"""
    try:
        # Extract the authorization header from the incoming request
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return {"status": "error", "message": "No authorization token provided"}
        
        headers = {
            "Accept": "application/json",
            "Authorization": auth_header
        }
        
        # Make a request to the backend API to verify the token
        # We'll use the conversation endpoint as it requires authentication
        response = requests.get(
            f"{BACKEND_BASE_URL}/api/v1/conversation",
            headers=headers
        )
        
        # Check if the request was successful (token is valid)
        if response.status_code == 200:
            return {"status": "ok", "message": "Token is valid"}
        else:
            return {
                "status": "error", 
                "message": f"Token verification failed: {response.status_code}", 
                "details": response.text
            }
    except Exception as e:
        logger.error(f"Error verifying token: {str(e)}")
        logger.error(traceback.format_exc())
        return {"status": "error", "message": f"Error verifying token: {str(e)}"}

@app.post("/api/v1/auth/login",
    tags=["Authentication"],
    summary="Login",
    description="Authenticates a user and returns a JWT token"
)
async def login(request: Request):
    """Forward login request to the backend"""
    try:
        # Extract the request body
        request_body = await request.json()
        
        # Forward the request to the backend
        response = requests.post(
            f"{BACKEND_BASE_URL}/api/v1/auth/login",
            json=request_body,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        )
        
        # Return the backend response
        status_code = response.status_code
        response_data = response.json()
        
        # Log the login result
        if status_code == 200:
            logger.info(f"User login successful: {request_body.get('email')}")
            
            # Store the token for later use in agent-backend communication
            if response_data.get('accessToken'):
                token = response_data.get('accessToken')
                formatted_token = token if token.startswith('Bearer ') else f"Bearer {token}"
                os.environ["CURRENT_AUTH_TOKEN"] = formatted_token
                logger.info("Saved authentication token for backend communication")
        else:
            logger.error(f"Login failed: {status_code} - {response_data}")
        
        return JSONResponse(
            status_code=status_code,
            content=response_data
        )
    except Exception as e:
        logger.error(f"Error processing login: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"message": f"Internal server error: {str(e)}"}
        )

@app.get("/api/v1/knowledge-artifacts/{conversation_id}", response_model=KnowledgeArtifactsResponse)
async def get_knowledge_artifacts(conversation_id: str, request: Request, retry_count: int = 0, max_retries: int = 3):
    """Get knowledge artifacts for a conversation.
    
    This endpoint provides the guidelines and case studies relevant to a specific conversation.
    
    Args:
        conversation_id: The conversation ID to get artifacts for
        retry_count: Current retry attempt (internal use)
        
    Returns:
        KnowledgeArtifactsResponse: Guidelines and case studies for the conversation
    """
    logger.info(f"[{retry_count}/{max_retries}] Fetching knowledge artifacts for conversation: {conversation_id}")
    
    # Skip invalid conversation IDs
    if conversation_id.startswith("draft-") or "mock-" in conversation_id:
        logger.info(f"Skipping invalid conversation_id: {conversation_id}")
        return {"guidelines": [], "caseStudies": []}
    
    # Format conversation_id as UUID for database consistency
    original_conversation_id = conversation_id
    try:
        # Validate if it's already a UUID
        uuid_obj = uuid.UUID(conversation_id)
        formatted_conversation_id = str(uuid_obj)
        if formatted_conversation_id != conversation_id:
            logger.info(f"Reformatted conversation_id from {conversation_id} to {formatted_conversation_id}")
            conversation_id = formatted_conversation_id
    except ValueError:
        # If not a valid UUID, generate a deterministic UUID from the string
        namespace = uuid.NAMESPACE_URL
        name = f"conversation:{conversation_id}"
        new_uuid = uuid.uuid5(namespace, name)
        formatted_conversation_id = str(new_uuid)
        logger.warning(f"Converted non-UUID conversation_id {conversation_id} to UUID {formatted_conversation_id}")
        conversation_id = formatted_conversation_id
        
    # Try to get artifacts from the backend database
    try:
        logger.info(f"Querying knowledge artifacts database endpoint")
        
        # Get the token from the request
        token = None
        auth_header = request.headers.get("Authorization")
        if auth_header:
            token = auth_header
            if not token.startswith("Bearer "):
                token = f"Bearer {token}"
                
        # Set up API request headers
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        if token:
            headers["Authorization"] = token
            
        # Add timestamp to prevent caching
        timestamp = datetime.now().timestamp()
        
        # Make the request to the backend
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{BACKEND_BASE_URL}/api/v1/knowledge-artifacts/{conversation_id}?t={timestamp}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    logger.info("Successfully retrieved artifacts from database")
                    
                    try:
                        data = response.json()
                        
                        # Validate the data
                        if (data and 
                            isinstance(data.get("guidelines", []), list) and 
                            isinstance(data.get("caseStudies", []), list)):
                            
                            guidelines_count = len(data.get("guidelines", []))
                            case_studies_count = len(data.get("caseStudies", []))
                            
                            logger.info(f"Got {guidelines_count} guidelines and {case_studies_count} case studies from database")
                            
                            # Only return if we have actual data
                            if guidelines_count > 0 or case_studies_count > 0:
                                return data
                            else:
                                logger.info("Database returned empty collections")
                                # If retry limit not reached, attempt to generate new artifacts
                                if retry_count < max_retries:
                                    return await generate_and_save_artifacts(original_conversation_id, request, retry_count)
                        else:
                            logger.warning("Database returned invalid data format")
                            if retry_count < max_retries:
                                return await generate_and_save_artifacts(original_conversation_id, request, retry_count)
                    except Exception as e:
                        logger.error(f"Error parsing database response: {str(e)}")
                        # Don't generate here, just return empty
                        logger.error("Error parsing database response, returning empty artifacts.")
                        return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])
                elif response.status_code == 401:
                    logger.warning("Authentication failed (401)")
                    # Don't generate on auth error
                    return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])
                else:
                    logger.warning(f"Database request failed with status {response.status_code}")
                    # Don't generate on other DB errors
                    return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])
        except httpx.RequestError as e:
            logger.error(f"Request error when fetching from database: {str(e)}")
            # Don't generate on request error
            return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])
    except Exception as e:
        logger.error(f"Unexpected error fetching artifacts: {str(e)}")
        logger.error(traceback.format_exc())
        # Don't generate on unexpected error
            
    # If all else fails, return empty data
    logger.error(f"All attempts to get artifacts failed, returning empty data")
    return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])

# Alternative endpoint for frontend compatibility if needed
@app.get("/knowledge-artifacts/{conversation_id}",
    tags=["Knowledge Base"],
    summary="Get knowledge artifacts for a conversation (legacy)",
    description="Legacy endpoint to retrieve the ethical guidelines and case studies relevant to a specific conversation"
)
async def get_knowledge_artifacts_legacy(conversation_id: str, request: Request):
    """Legacy endpoint to retrieve knowledge artifacts associated with a conversation."""
    return await get_knowledge_artifacts(conversation_id, request)

@app.get("/direct-knowledge-artifacts/{conversation_id}", response_model=KnowledgeArtifactsResponse)
async def direct_knowledge_artifacts(conversation_id: str):
    """
    Directly retrieve knowledge artifacts for a conversation from the database.
    This endpoint provides a direct way to access knowledge artifacts without browser cache issues.
    
    Args:
        conversation_id: The conversation ID to get artifacts for
        
    Returns:
        KnowledgeArtifactsResponse: Guidelines and case studies for the conversation
    """
    logger.info(f"Direct request for knowledge artifacts for conversation: {conversation_id}")
    
    # Skip invalid conversation IDs
    if conversation_id.startswith("draft-") or "mock-" in conversation_id:
        logger.info(f"Skipping invalid conversation_id: {conversation_id}")
        return {"guidelines": [], "caseStudies": []}
    
    # Format conversation_id as UUID for database consistency
    try:
        # Validate if it's already a UUID
        uuid_obj = uuid.UUID(conversation_id)
        formatted_conversation_id = str(uuid_obj)
        if formatted_conversation_id != conversation_id:
            logger.info(f"Reformatted conversation_id from {conversation_id} to {formatted_conversation_id}")
            conversation_id = formatted_conversation_id
    except ValueError:
        # If not a valid UUID, generate a deterministic UUID from the string
        namespace = uuid.NAMESPACE_URL
        name = f"conversation:{conversation_id}"
        new_uuid = uuid.uuid5(namespace, name)
        formatted_conversation_id = str(new_uuid)
        logger.warning(f"Converted non-UUID conversation_id {conversation_id} to UUID {formatted_conversation_id}")
        conversation_id = formatted_conversation_id
    
    # Set up headers for the database request
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    # Add token if available 
    token = os.getenv('CURRENT_AUTH_TOKEN')
    if token:
        if not token.startswith('Bearer '):
            token = f"Bearer {token}"
        headers["Authorization"] = token
    
    # First try to get the data directly from the database
    try:
        logger.info(f"Attempting to fetch knowledge artifacts from database for {conversation_id}")
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Add timestamp to prevent caching issues
            timestamp = datetime.now().timestamp()
            response = await client.get(
                f"{BACKEND_BASE_URL}/api/v1/knowledge-artifacts/{conversation_id}?t={timestamp}",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Successfully retrieved artifacts from database")
                
                # Validate the data
                if (data and 
                    isinstance(data.get("guidelines", []), list) and 
                    isinstance(data.get("caseStudies", []), list)):
                    
                    guidelines_count = len(data.get("guidelines", []))
                    case_studies_count = len(data.get("caseStudies", []))
                    
                    logger.info(f"Retrieved {guidelines_count} guidelines and {case_studies_count} case studies from database")
                    
                    if guidelines_count > 0 or case_studies_count > 0:
                        return {
                            "guidelines": data.get("guidelines", []),
                            "caseStudies": data.get("caseStudies", [])
                        }
                    else:
                        logger.info("Database returned empty artifacts, will generate new ones")
                else:
                    logger.warning("Database returned invalid data format")
            else:
                logger.warning(f"Database request failed with status {response.status_code}")
                
    except Exception as e:
        logger.error(f"Error fetching artifacts from database: {str(e)}")
    
    logger.info("No artifacts found in database, generating new artifacts")
    
    # If database retrieval fails or returns empty data, generate new artifacts
    try:
        # Initialize agent
        agent = get_agent()
        
        # Construct a query from the conversation ID
        query = f"Generate relevant guidelines and case studies for conversation {conversation_id}"
        
        logger.info(f"Generating artifacts with query: '{query}'")
        
        # Generate guidelines and case studies
        guidelines = []
        case_studies = []
        
        try:
            guidelines = agent.get_relevant_guidelines(query, max_results=5)
            logger.info(f"Generated {len(guidelines)} guidelines")
            
            case_studies = agent.get_relevant_case_studies(query, max_results=3)
            logger.info(f"Generated {len(case_studies)} case studies")
        except Exception as e:
            logger.error(f"Error generating artifacts: {str(e)}")
            logger.error(traceback.format_exc())
            return {"guidelines": [], "caseStudies": []}
        
        # Save the generated artifacts to the database
        try:
            # Prepare DTOs for database storage
            guideline_dtos = []
            case_study_dtos = []
            
            for guideline in guidelines:
                dto = {
                    "title": guideline.get("title", ""),
                    "description": guideline.get("description", ""),
                    "artifactId": guideline.get("id", ""),
                    "artifactType": "GUIDELINE",
                    "relevance": float(guideline.get("relevance", 0))
                }
                guideline_dtos.append(dto)
                
            for case_study in case_studies:
                dto = {
                    "title": case_study.get("title", ""),
                    "description": case_study.get("description", "") or case_study.get("summary", ""),
                    "artifactId": case_study.get("id", ""),
                    "artifactType": "CASE_STUDY",
                    "relevance": float(case_study.get("relevance", 0))
                }
                case_study_dtos.append(dto)
            
            # Create the database payload
            save_payload = {
                "conversationId": conversation_id,
                "guidelines": guideline_dtos,
                "caseStudies": case_study_dtos,
                "timestamp": datetime.now().isoformat()
            }
            
            # Save to database
            save_result = await save_knowledge_artifacts(conversation_id, save_payload)
            
            if save_result:
                logger.info("Successfully saved generated artifacts to database")
            else:
                logger.error("Failed to save generated artifacts to database")
                
        except Exception as e:
            logger.error(f"Error saving generated artifacts to database: {str(e)}")
            logger.error(traceback.format_exc())
        
        # Return the generated artifacts regardless of save success
        return {
            "guidelines": guidelines,
            "caseStudies": case_studies
        }
        
    except Exception as e:
        logger.error(f"Error in direct_knowledge_artifacts: {str(e)}")
        logger.error(traceback.format_exc())
        return {"guidelines": [], "caseStudies": []}

@app.get("/api/v1/diagnostic/rag-artifacts",
    tags=["Diagnostic"],
    summary="Diagnostic endpoint for RAG artifacts issues",
    description="Provides diagnostic information about RAG artifacts storage and retrieval"
)
async def diagnostic_rag_artifacts(request: Request):
    """Diagnostic endpoint to help troubleshoot problems with RAG artifacts."""
    logger.info("Running RAG artifacts diagnostics")
    
    # Collect diagnostic information
    diagnostics = {
        "timestamp": datetime.now(UTC).isoformat(),
        "environment": {
            "backend_url": BACKEND_BASE_URL,
            "agent_version": "1.0", # Or get from somewhere if available
            "token_available": os.getenv('CURRENT_AUTH_TOKEN') is not None,
        },
        "local_storage": {
            "artifacts_dir_exists": False,
            "artifact_count": 0,
            "sample_artifacts": []
        },
        "backend_connection": {
            "status": "unknown",
            "response_code": None,
            "error": None
        }
    }
    
    # Check local artifact storage
    try:
        artifacts_dir = Path("data/artifacts")
        diagnostics["local_storage"]["artifacts_dir_exists"] = artifacts_dir.exists()
        
        if artifacts_dir.exists():
            artifact_files = list(artifacts_dir.glob("*.json"))
            diagnostics["local_storage"]["artifact_count"] = len(artifact_files)
            
            # Add sample of up to 5 most recent artifacts
            sample_artifacts = sorted(artifact_files, key=lambda p: p.stat().st_mtime, reverse=True)[:5]
            
            for artifact_file in sample_artifacts:
                try:
                    with open(artifact_file, "r") as f:
                        artifact_data = json.load(f)
                    
                    diagnostics["local_storage"]["sample_artifacts"].append({
                        "filename": artifact_file.name,
                        "conversation_id": artifact_data.get("conversationId"),
                        "guideline_count": len(artifact_data.get("guidelines", [])),
                        "case_study_count": len(artifact_data.get("caseStudies", [])),
                        "timestamp": artifact_data.get("timestamp")
                    })
                except Exception as e:
                    diagnostics["local_storage"]["sample_artifacts"].append({
                        "filename": artifact_file.name,
                        "error": str(e)
                    })
    except Exception as e:
        diagnostics["local_storage"]["error"] = str(e)
    
    # Test backend connection
    try:
        token = os.getenv('CURRENT_AUTH_TOKEN')
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        if token:
            headers["Authorization"] = token
        
        # Use a simple health check endpoint if available, or a sample conversation ID
        test_url = f"{BACKEND_BASE_URL}/api/v1/health" 
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(test_url, headers=headers)
            
            diagnostics["backend_connection"]["status"] = "connected"
            diagnostics["backend_connection"]["response_code"] = response.status_code
            
            # If we got a successful response, also test the rag-artifacts endpoint with a test UUID
            if response.status_code < 400:
                test_conversation_id = "00000000-0000-0000-0000-000000000000"  # Test UUID
                rag_test_url = f"{BACKEND_BASE_URL}/api/v1/knowledge-artifacts/{test_conversation_id}"
                
                try:
                    rag_response = await client.get(rag_test_url, headers=headers)
                    
                    diagnostics["rag_endpoint_test"] = {
                        "status": "tested",
                        "response_code": rag_response.status_code,
                        "response_body": rag_response.text[:500] if len(rag_response.text) > 500 else rag_response.text
                    }
                except Exception as e:
                    diagnostics["rag_endpoint_test"] = {
                        "status": "error",
                        "error": str(e)
                    }
            
    except Exception as e:
        diagnostics["backend_connection"]["status"] = "error"
        diagnostics["backend_connection"]["error"] = str(e)
    
    # Database schema analysis
    diagnostics["database_schema"] = {
        "expected_fields": [
            "id (BIGSERIAL PRIMARY KEY)",
            "conversation_id (UUID NOT NULL)",
            "artifact_type (VARCHAR(20) NOT NULL)",
            "artifact_id (VARCHAR(255) NOT NULL)",
            "title (VARCHAR(255) NOT NULL)",
            "description (TEXT)",
            "source (VARCHAR(255))",
            "category (VARCHAR(255))",
            "relevance (FLOAT)",
            "summary (TEXT)",
            "outcome (TEXT)",
        ],
        "expected_constraints": [
            "CONSTRAINT fk_rag_artifact_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id)"
        ],
        "mismatch_summary": "The database schema expects conversation_id to be a UUID, but the Java code may be storing string values that aren't valid UUIDs."
    }
    
    return diagnostics
    
async def generate_artifacts(request: Request, agent: LangChainAgent = Depends(get_agent)):
    try:
        message_content = await request.json()
        conversation_id = message_content.get("conversationId")
        message_text = message_content.get("messageContent")
        
        if not conversation_id:
            logger.warning("No conversation ID provided for artifact generation")
            return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])
        
        # Use the message content if provided, otherwise use a default query
        query_text = message_text if message_text else "What are the ethical considerations for this technology?"
        logger.info(f"Generating artifacts for conversation {conversation_id} based on query: '{query_text[:50]}...'")
        
        # Agent instance is now injected via Depends(get_agent)
        if not agent:
            # This check might be redundant now but kept for safety
            raise HTTPException(status_code=500, detail="Agent is not initialized")

        # Generate artifacts using the agent instance
        guidelines = agent.get_relevant_guidelines(query_text)
        case_studies = agent.get_relevant_case_studies(query_text)
        
        logger.info(f"Returning response with {len(guidelines)} guidelines, {len(case_studies)} case studies")
        # Return the generated artifacts directly
        return KnowledgeArtifactsResponse(
            guidelines=guidelines,
            caseStudies=case_studies
        )
    except Exception as e:
        logger.error(f"Error generating artifacts: {e}")
        logger.error(traceback.format_exc())
        # Return empty artifacts on error to prevent frontend issues
        logger.warning(f"Returning empty artifacts due to generation error for conversation {conversation_id}")
        return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])

@app.post("/api/v1/generate-artifacts")
async def generate_artifacts(request: Request, agent: LangChainAgent = Depends(get_agent)):
    try:
        message_content = await request.json()
        conversation_id = message_content.get("conversationId")
        message_text = message_content.get("messageContent")
        
        if not conversation_id:
            logger.warning("No conversation ID provided for artifact generation")
            return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])
        
        # Use the message content if provided, otherwise use a default query
        query_text = message_text if message_text else "What are the ethical considerations for this technology?"
        logger.info(f"Generating artifacts for conversation {conversation_id} based on query: '{query_text[:50]}...'")
        
        # Agent instance is now injected via Depends(get_agent)
        if not agent:
            # This check might be redundant now but kept for safety
            raise HTTPException(status_code=500, detail="Agent is not initialized")

        # Generate artifacts using the agent instance
        guidelines = agent.get_relevant_guidelines(query_text)
        case_studies = agent.get_relevant_case_studies(query_text)
        
        logger.info(f"Returning response with {len(guidelines)} guidelines, {len(case_studies)} case studies")
        # Return the generated artifacts directly
        return KnowledgeArtifactsResponse(
            guidelines=guidelines,
            caseStudies=case_studies
        )
    except Exception as e:
        logger.error(f"Error generating artifacts: {e}")
        logger.error(traceback.format_exc())
        # Return empty artifacts on error to prevent frontend issues
        logger.warning(f"Returning empty artifacts due to generation error for conversation {conversation_id}")
        return KnowledgeArtifactsResponse(guidelines=[], caseStudies=[])

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001) 