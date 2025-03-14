import os
import logging
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
from datetime import datetime
import uuid
from tqdm import tqdm
import torch
import gc

from agents.base_agent import BaseAgent
from data_processing.data_loader import DataLoader
from data_processing.chunking import process_document, chunk_documents
from embeddings.embedding_model import EmbeddingModel
from retriever.hybrid_retriever import HybridRetriever
from retriever.cross_encoder import ReRanker
from models import LlamaModel
from database import DatabaseConnector
from data_processing import TextChunker

logger = logging.getLogger(__name__)

class EthicalAgent(BaseAgent):
    """Core Ethical Decision-Making Agent."""
    
    VALID_ROLES = {
        "software_engineer": {
            "description": "Technical implementation and code-level decisions",
            "focus": ["technical feasibility", "code quality", "security practices"],
            "perspective": "engineering"
        },
        "project_manager": {
            "description": "Project planning and team coordination",
            "focus": ["timeline impact", "resource allocation", "risk management"],
            "perspective": "management"
        },
        "product_owner": {
            "description": "Product vision and user value",
            "focus": ["user impact", "business value", "feature prioritization"],
            "perspective": "business"
        },
        "security_engineer": {
            "description": "Security and risk assessment",
            "focus": ["security implications", "data protection", "compliance"],
            "perspective": "security"
        },
        "data_scientist": {
            "description": "Data and algorithm ethics",
            "focus": ["algorithmic fairness", "bias mitigation", "model transparency"],
            "perspective": "data"
        },
        "ux_designer": {
            "description": "User experience and interface design",
            "focus": ["user accessibility", "interface transparency", "dark patterns"],
            "perspective": "user"
        },
        "legal_counsel": {
            "description": "Legal compliance and risk",
            "focus": ["regulatory compliance", "legal risks", "liability"],
            "perspective": "legal"
        },
        "ethics_officer": {
            "description": "Organizational ethics oversight",
            "focus": ["ethical guidelines", "company values", "social impact"],
            "perspective": "ethics"
        }
    }

    def __init__(self, config: Dict):
        """Initialize the ethical agent."""
        try:
            super().__init__(config)
            
            # Set up cache and data directories
            self.cache_dir = Path(config.get('cache_dir', 'cache'))
            self.index_dir = Path(config.get('index_dir', 'ethics_index'))
            
            # Create necessary directories
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            self.index_dir.mkdir(parents=True, exist_ok=True)
            
            # Initialize components with caching
            self.retriever = HybridRetriever(
                embedding_model=EmbeddingModel(cache_dir=str(self.cache_dir / "embeddings")),
                cache_dir=str(self.cache_dir / "retriever")
            )
            
            # Generate conversation ID
            self.conversation_id = str(uuid.uuid4())
            
            # Initialize database connection
            self.db = DatabaseConnector()
            
            # Initialize chunker
            self.chunker = TextChunker()
            
            # Check if we have cached index
            if not self._load_cached_index():
                logger.info("No cached index found. Will create on first query.")
            
            # Initialize LlamaModel with better error handling
            try:
                model_name = self.config.get('model_name', 'meta-llama/Llama-2-7b-chat-hf')
                logger.info(f"Initializing LlamaModel with model: {model_name}")
                self.model = LlamaModel(
                    model_name=model_name,
                    api_token=self.config.get('api_token'),
                    use_api=True  # Force API usage instead of downloading
                )
            except Exception as e:
                logger.error(f"Error initializing LlamaModel: {str(e)}")
                if 'api_token' not in self.config or not self.config['api_token']:
                    raise ValueError("Missing Hugging Face API token. Please set HUGGINGFACE_TOKEN environment variable.")
                else:
                    raise RuntimeError(f"Failed to initialize LlamaModel: {str(e)}")
            
            logger.info("Ethical Agent initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing EthicalAgent: {str(e)}")
            if isinstance(e, (ValueError, ConnectionError)):
                raise  # Re-raise these specific errors
            raise RuntimeError(f"Failed to initialize EthicalAgent: {str(e)}")

    def _initialize_components(self):
        """Initialize all component models."""
        try:
            # Initialize embedding model
            self.embedding_model = EmbeddingModel(cache_dir=self.cache_dir)
            
            # Initialize retriever
            self.retriever = HybridRetriever(self.embedding_model, self.cache_dir)
            
            # Initialize re-ranker
            self.reranker = ReRanker(cache_dir=self.cache_dir)
            
        except Exception as e:
            logger.error(f"Error initializing components: {str(e)}")
            raise RuntimeError(f"Failed to initialize components: {str(e)}")

    def _load_cached_index(self) -> bool:
        """Load cached index if it exists."""
        try:
            # Get paths from config or use defaults
            index_path = self.config.get('index_path', str(self.index_dir / "faiss.index"))
            docs_path = self.config.get('documents_path', str(self.index_dir / "documents.json"))
            
            logger.info(f"Attempting to load index from {index_path}")
            logger.info(f"Attempting to load documents from {docs_path}")
            
            if Path(index_path).exists() and Path(docs_path).exists():
                if Path(index_path).is_file() and Path(docs_path).is_file():  # Ensure they are files
                    logger.info("Loading cached index...")
                    self.retriever.load_index(str(index_path), str(docs_path))
                    return True
                else:
                    logger.warning("Index or documents path exists but is not a file")
            else:
                logger.info("No cached index found")
            return False
            
        except Exception as e:
            logger.error(f"Error loading cached index: {str(e)}")
            return False

    def _ensure_index(self):
        """Ensure index is created if needed."""
        if not self._load_cached_index():
            logger.info("Creating search index...")
            print("\nPreparing document index (this may take a few minutes on first run)...")
            
            # Load documents
            loader = DataLoader()
            guidelines = loader.load_guidelines()
            case_studies = loader.load_case_studies()
            
            # Process documents with optimized settings for M1
            print("\nProcessing documents...")
            all_chunks = chunk_documents(
                guidelines + case_studies,
                chunk_size=512,      # Standard chunk size for better accuracy
                overlap=32,          # Minimal overlap to save memory
                max_workers=2        # Limit workers to prevent memory pressure
            )
            
            if not all_chunks:
                logger.error("No chunks created from documents")
                return
            
            # Create index with smaller batch size for M1's unified memory
            print(f"\nCreating search index from {len(all_chunks)} chunks...")
            self.retriever.index_documents(
                all_chunks,
                batch_size=4  # Very small batch size to prevent memory issues
            )
            
            # Save index
            os.makedirs(self.index_dir, exist_ok=True)
            self.retriever.save_index(
                str(self.index_dir / "faiss.index"),
                str(self.index_dir / "documents.json")
            )
            print("\nIndex creation complete!")

    def start_conversation(self) -> str:
        """Start a new conversation and return a welcome message."""
        self.conversation_id = str(uuid.uuid4())
        self.current_user_role = None
        self.user_responses = {}
        
        return """Welcome to the Ethical AI Decision-Making Assistant. I'm here to help you navigate ethical challenges in software development and management.

To provide the most relevant guidance, I'll need to understand:
1. Your role in the organization
2. The specific ethical dilemma you're facing
3. The context and stakeholders involved

Please start by describing your role (e.g., developer, manager, researcher) and the ethical concern you'd like to discuss."""

    def process_query(self, query: str, role: str = None) -> Dict[str, Any]:
        """Process a user query and generate a response."""
        try:
            # Set or update user role
            if role:
                self.current_user_role = role
            
            if not self.current_user_role:
                return {
                    "response": "Before we proceed, please specify your role (e.g., developer, manager, researcher).",
                    "needs_role": True
                }

            # If we don't have all necessary information, generate clarifying questions
            if not self._has_complete_context():
                questions = self.model.generate_clarifying_questions(query)
                remaining_questions = self._filter_answered_questions(questions)
                
                if remaining_questions:
                    question_text = "\n".join([
                        f"- {q[0]}" for q in remaining_questions.values()
                    ])
                    return {
                        "response": f"To better assist you, I need some additional information:\n{question_text}",
                        "questions": remaining_questions,
                        "needs_clarification": True
                    }

            # Ensure index exists
            self._ensure_index()

            # Retrieve relevant context using hybrid search
            focus_areas = self._determine_focus_areas()
            context = self.retriever.hybrid_search(query, top_k=5)
            
            # Generate response
            response = self.model.generate_ethical_response(
                query=query,
                context=context,
                role=self.current_user_role,
                focus_areas=focus_areas,
                issue_type=self.user_responses.get('issue_type'),
                severity=self.user_responses.get('severity'),
                manager_attitude=self.user_responses.get('manager_attitude')
            )
            
            # Save conversation
            self._save_conversation(query, response)
            
            # Clear cache after processing
            if hasattr(torch, 'cuda') and torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            
            return {
                "response": response,
                "context": context,
                "focus_areas": focus_areas
            }
            
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return {
                "response": "I apologize, but I encountered an error while processing your request. Please try again.",
                "error": str(e)
            }

    def set_user_role(self, role: str) -> None:
        """Set the user's role."""
        # Clean up the role input
        role = role.lower().strip()
        
        # Map common role names to valid roles
        role_mapping = {
            'developer': 'software_engineer',
            'engineer': 'software_engineer',
            'dev': 'software_engineer',
            'manager': 'project_manager',
            'pm': 'project_manager',
            'owner': 'product_owner',
            'po': 'product_owner',
            'security': 'security_engineer',
            'data': 'data_scientist',
            'designer': 'ux_designer',
            'legal': 'legal_counsel',
            'ethics': 'ethics_officer'
        }
        
        # Try to map the role to a valid one
        mapped_role = role_mapping.get(role, role)
        
        if mapped_role in self.VALID_ROLES:
            self.current_user_role = mapped_role
            logger.info(f"Set user role to: {self.current_user_role}")
        else:
            logger.warning(f"Invalid role attempted: {role}")
            self.current_user_role = None

    def add_user_response(self, question_type: str, response: str) -> None:
        """Add a user's response to a clarifying question."""
        self.user_responses[question_type] = response
        logger.info(f"Added user response for {question_type}: {response}")

    def _has_complete_context(self) -> bool:
        """Check if we have all necessary context information."""
        required_fields = ['issue_type', 'severity', 'manager_attitude']
        return all(field in self.user_responses for field in required_fields)

    def _filter_answered_questions(self, questions: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """Filter out questions that have already been answered."""
        return {
            q_type: q_list 
            for q_type, q_list in questions.items() 
            if q_type not in self.user_responses
        }

    def _determine_focus_areas(self) -> List[str]:
        """Determine focus areas based on user role and responses."""
        focus_areas = []
        
        # Role-based focus areas
        role_focus = {
            'developer': ['Code Ethics', 'Technical Implementation', 'Data Privacy'],
            'manager': ['Team Management', 'Project Ethics', 'Resource Allocation'],
            'researcher': ['Research Ethics', 'Data Handling', 'Methodology']
        }
        
        if self.current_user_role in role_focus:
            focus_areas.extend(role_focus[self.current_user_role])
        
        # Issue-based focus areas
        if self.user_responses.get('issue_type') == 'Privacy':
            focus_areas.extend(['Data Protection', 'Confidentiality'])
        elif self.user_responses.get('issue_type') == 'Feasibility':
            focus_areas.extend(['Resource Management', 'Technical Constraints'])
        
        # Severity-based focus areas
        if self.user_responses.get('severity') == 'High':
            focus_areas.append('Risk Management')
        
        return list(set(focus_areas))  # Remove duplicates

    def _save_conversation(self, query: str, response: str) -> None:
        """Save the conversation to the database."""
        if not self.conversation_id:
            self.conversation_id = str(uuid.uuid4())
        
        try:
            # Create metadata dictionary with all relevant information
            metadata = {
                'role': self.current_user_role,
                'issue_type': self.user_responses.get('issue_type'),
                'severity': self.user_responses.get('severity'),
                'manager_attitude': self.user_responses.get('manager_attitude')
            }
            
            self.db.save_conversation(
                conversation_id=self.conversation_id,
                query=query,
                response=response,
                metadata=metadata  # Pass role info in metadata instead of as separate argument
            )
        except Exception as e:
            logger.error(f"Error saving conversation: {str(e)}")

    def save_feedback(self, feedback: str, rating: int) -> None:
        """Save user feedback for the conversation."""
        try:
            self.db.save_feedback(
                conversation_id=self.conversation_id,
                feedback=feedback,
                rating=rating
            )
            logger.info(f"Saved feedback for conversation {self.conversation_id}")
        except Exception as e:
            logger.error(f"Error saving feedback: {str(e)}")

    def handle_conversation(self) -> None:
        """Handle the main conversation flow with RAG-enhanced responses."""
        try:
            self.start_conversation()  # Initialize conversation state
            print("\nWelcome to the Ethical AI Decision-Making Assistant!")
            print("=" * 50)
            print("I'm here to help you navigate ethical challenges in your work.")
            print("Please share your ethical concern or question, and I'll guide you through it.")
            print("=" * 50)
            
            # Get initial query
            print("\nPlease describe your ethical dilemma:")
            query = input("You: ").strip()
            
            if not query:
                print("I need a specific ethical concern to help you.")
                return
            
            # Get user role
            print("\nWhat is your role in the organization?")
            print("(e.g., software engineer, project manager, product owner, data scientist)")
            self._get_user_role()
            
            # Get issue context
            print("\nLet me analyze your situation...")
            self._get_issue_context()
            
            print("\nThank you for providing those details. Let me think about your situation...")
            
            while True:
                # Get relevant context from knowledge base using RAG
                context = self.retriever.hybrid_search(query, top_k=5)
                
                # Log retrieved context for debugging
                logger.debug("Retrieved context:")
                for c in context:
                    logger.debug(f"- Score: {c.get('score', 'N/A')}")
                    logger.debug(f"- Text: {c.get('text', '')[:100]}...")
                
                # Determine focus areas based on role and issue
                focus_areas = self._determine_focus_areas()
                
                try:
                    # Generate response using the model
                    response = self.model.generate_ethical_response(
                        query=query,
                        context=context,
                        role=self.current_user_role,
                        focus_areas=focus_areas,
                        issue_type=self.user_responses.get('issue_type'),
                        severity=self.user_responses.get('severity'),
                        manager_attitude=self.user_responses.get('manager_attitude')
                    )
                    
                    print("\nHere's my analysis and recommendations:")
                    print("=" * 50)
                    print(response)
                    print("=" * 50)
                    
                    # Save the conversation
                    try:
                        self._save_conversation(query, response)
                    except Exception as e:
                        logger.error(f"Failed to save conversation: {e}")
                    
                    # Simulate stakeholder interaction
                    print("\nWould you like to:")
                    print("1. Simulate a stakeholder response to test your argument")
                    print("2. Get more specific guidance on any part of the analysis")
                    print("3. Discuss a different aspect of your ethical dilemma")
                    print("4. End the conversation")
                    
                    follow_up = input("\nYour choice (1-4): ").strip()
                    
                    if follow_up == "4":
                        print("\nThank you for using the Ethical AI Decision-Making Assistant.")
                        print("Remember, ethical decision-making is an ongoing process.")
                        break
                    elif follow_up == "1":
                        print("\nLet's simulate a stakeholder response.")
                        print("What would your manager or stakeholder likely say to your ethical concerns?")
                        stakeholder_response = input("Stakeholder: ").strip()
                        
                        # Generate counter-argument using RAG
                        counter_context = self.retriever.hybrid_search(
                            f"{query} {stakeholder_response}", 
                            top_k=3
                        )
                        
                        counter_response = self.model.generate_ethical_response(
                            query=f"Stakeholder says: {stakeholder_response}",
                            context=counter_context,
                            role=self.current_user_role,
                            focus_areas=focus_areas,
                            issue_type=self.user_responses.get('issue_type'),
                            severity=self.user_responses.get('severity'),
                            manager_attitude=self.user_responses.get('manager_attitude')
                        )
                        
                        print("\nHere's a suggested response to the stakeholder:")
                        print("=" * 50)
                        print(counter_response)
                        print("=" * 50)
                        
                        # Ask if they want to continue the simulation
                        print("\nWould you like to:")
                        print("1. Continue the stakeholder simulation")
                        print("2. Return to the main analysis")
                        sim_choice = input("\nYour choice (1-2): ").strip()
                        
                        if sim_choice == "1":
                            query = f"Previous stakeholder response: {stakeholder_response}"
                            continue
                        else:
                            query = "Let's return to the main analysis."
                            continue
                            
                    elif follow_up == "2":
                        print("\nWhich aspect would you like to explore further?")
                        print("1. Ethical Analysis")
                        print("2. Argumentation Strategy")
                        print("3. Practical Recommendations")
                        print("4. Case Study Details")
                        print("5. Action Plan")
                        
                        aspect = input("\nYour choice (1-5): ").strip()
                        query = f"Please provide more details about aspect {aspect} of the previous analysis."
                    elif follow_up == "3":
                        print("\nWhat other aspects of your ethical dilemma would you like to discuss?")
                        query = input("You: ").strip()
                    else:
                        print("\nI didn't understand that choice. Let's continue with your original dilemma.")
                        continue
                    
                except Exception as e:
                    logger.error(f"Failed to generate response: {e}")
                    print("\nI apologize, but I had trouble generating a response. Would you like to try rephrasing your question?")
                    continue
                
        except KeyboardInterrupt:
            print("\n\nExiting gracefully...")
        except Exception as e:
            logger.error(f"Error in conversation: {str(e)}")
            print("\nI apologize, but I encountered an error. Please try again.")

    def _get_user_role(self) -> None:
        """Get the user's role."""
        print("\nWhat is your role? (developer, manager, researcher)")
        while True:
            role = input("You: ").strip().lower()
            
            role_mapping = {
                'developer': 'software_engineer',
                'engineer': 'software_engineer',
                'manager': 'manager',
                'researcher': 'researcher'
            }
            
            if role in role_mapping:
                self.current_user_role = role_mapping[role]
                logger.info(f"Set user role to: {self.current_user_role}")
                break
            else:
                print("Please specify your role (developer, manager, or researcher):")

    def _get_issue_context(self) -> None:
        """Get context about the ethical issue."""
        print("\nLet me gather some important context about your situation...")
        
        # Define structured questions for context gathering
        questions = {
            "manager_attitude": [
                "What is your manager's stance on this ethical concern?",
                "1. Supportive - Open to ethical considerations",
                "2. Indifferent - Neutral or focused on business priorities",
                "3. Pressuring - Pushing for quick implementation despite concerns"
            ],
            "stakeholders": [
                "Who are the key stakeholders affected by this decision?",
                "(e.g., users, employees, shareholders, society at large)"
            ],
            "timeline": [
                "What is the timeline pressure for this decision?",
                "1. Immediate - Need to act quickly",
                "2. Short-term - Within the next few weeks",
                "3. Long-term - Time for thorough consideration"
            ]
        }
        
        # Ask each question and store responses
        for question_type, questions_list in questions.items():
            print("\n" + questions_list[0])
            for i in range(1, len(questions_list)):
                print(questions_list[i])
            
            while True:
                response = input("\nYour response: ").strip().lower()
                
                # Validate responses based on question type
                if question_type == "manager_attitude":
                    if response in ["1", "2", "3"]:
                        attitudes = {
                            "1": "Supportive",
                            "2": "Indifferent",
                            "3": "Pressuring"
                        }
                        self.user_responses[question_type] = attitudes[response]
                        break
                elif question_type in ["stakeholders", "timeline"]:
                    self.user_responses[question_type] = response
                    break
                
                print("Please provide a valid response from the options shown.")
            
            logger.info(f"Added user response for {question_type}: {self.user_responses[question_type]}")
        
        print("\nThank you for providing these details. This will help me give you more targeted guidance.") 