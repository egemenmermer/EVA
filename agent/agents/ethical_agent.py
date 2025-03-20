import os
import logging
from typing import Dict, List, Tuple, Optional, Any
from pathlib import Path
from datetime import datetime
import uuid
from tqdm import tqdm
import torch
import gc
import time

from agents.base_agent import BaseAgent
from data_processing.data_loader import DataLoader
from data_processing.chunking import process_document, chunk_documents
from embeddings.embedding_model import EmbeddingModel
from retriever.hybrid_retriever import HybridRetriever
from retriever.cross_encoder import ReRanker
from models import LlamaModel
from data_processing import TextChunker

logger = logging.getLogger(__name__)

class EthicalAgent(BaseAgent):
    """Core Ethical Decision-Making Agent."""
    
    MANAGER_TYPES = {
        "PUPPETEER": {
            "description": "Controls project flow to nudge developers into unethical decisions",
            "style": "manipulative",
            "focus": ["control", "influence", "pressure"]
        },
        "DILUTER": {
            "description": "Weakens ethical concerns by making them seem less important",
            "style": "dismissive",
            "focus": ["minimize", "downplay", "rationalize"]
        },
        "CAMOUFLAGER": {
            "description": "Hides ethical concerns in bureaucracy or misleading language",
            "style": "deceptive",
            "focus": ["obscure", "confuse", "misdirect"]
        }
    }

    def __init__(self, config: Dict):
        """Initialize the ethical agent."""
        try:
            super().__init__(config)
            
            # Initialize user-related attributes
            self.user_role = None
            self.user_responses = {}
            self.conversation_id = str(uuid.uuid4())
            self.manager_type = None
            
            # Set up cache and data directories
            self.cache_dir = Path(config.get('cache_dir', 'cache'))
            self.index_dir = Path(config.get('index_dir', 'ethics_index'))
            
            # Initialize components (embedding model, retriever, etc.)
            self._initialize_components()
            
            # Initialize the LLM model
            self.model = LlamaModel(
                model_name="meta-llama/Llama-2-7b-chat-hf",
                api_token=config.get('api_token'),
                use_api=True
            )
            
            # Ensure index is created
            self._ensure_index()
            
            logger.info("Ethical Agent initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize EthicalAgent: {str(e)}")
            raise

    def process_query(self, query: str, manager_type: str = None) -> str:
        """Process a user query and generate a response."""
        try:
            start_time = time.time()
            
            # Validate and set manager type if provided
            if manager_type:
                if manager_type not in self.MANAGER_TYPES:
                    logger.warning(f"Invalid manager type: {manager_type}. Using default.")
                else:
                    self.manager_type = manager_type
                    
            # Extract prefixes if present (practice: or understand:)
            mode = "understand"  # Default mode
            original_query = query
            
            if query.lower().startswith("practice:"):
                mode = "practice"
                query = query[len("practice:"):].strip()
                logger.info(f"Practice mode detected. Query: {query}")
            elif query.lower().startswith("understand:"):
                mode = "understand"
                query = query[len("understand:"):].strip()
                logger.info(f"Understanding mode explicitly set. Query: {query}")
            
            # Determine conversation mode based on conversation state
            if hasattr(self, 'conversation_mode'):
                # If conversation_mode exists and is set to practice, stay in practice mode
                # unless explicitly changing to understand mode
                if self.conversation_mode == "practice" and not query.lower().startswith("understand:"):
                    mode = "practice"
            
            # Set/update the conversation mode
            self.conversation_mode = mode
            logger.info(f"Conversation mode: {mode}")
            
            # Get relevant context from knowledge base using RAG
            context = self._get_relevant_context(query)
            
            # Generate response based on mode
            try:
                if mode == "practice":
                    response = self._generate_manager_response(query, context)
                else:  # understand mode
                    response = self._generate_understanding_response(query, context)
            except Exception as e:
                logger.error(f"Error generating response: {str(e)}")
                # Create a fallback response that's helpful but acknowledges the technical issue
                response = f"""I apologize, but I'm having difficulty generating a response at the moment. 

Based on your query about "{query[:50]}...", I understand you're asking about an ethical issue. While my advanced reasoning capabilities are limited right now, I can suggest:

1. Consider the ethical implications for all stakeholders
2. Evaluate both short and long-term consequences
3. Reflect on transparency, fairness, and accountability

Could you try rephrasing your question or providing more specific details about your situation?"""
            
            # Log processing time
            processing_time = time.time() - start_time
            logger.info(f"Query processed in {processing_time:.2f} seconds")
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing query: {str(e)}")
            return f"I apologize, but I encountered an error while processing your request. Please try again or rephrase your question. Error details: {str(e)}"

    def _generate_understanding_response(self, query: str, context: List[Dict] = None) -> str:
        """Generate a response in understanding mode."""
        try:
            # Prepare the prompt
            prompt = f"""You are an ethical AI assistant helping with software development dilemmas. 
            
The user has shared this concern: "{query}"

Your task is to:
1. Understand the ethical dimensions of their situation
2. Provide a balanced, thoughtful response
3. Ask clarifying questions if needed
4. Reference relevant ethical principles

Respond in a helpful, educational tone without taking on any specific manager persona.
"""

            if context:
                prompt += "\n\nRelevant information:\n"
                for item in context[:3]:  # Use top 3 context items
                    prompt += f"- {item.get('text', '')[:200]}...\n"

            # Try to use the LLM
            try:
                return self.model.generate(prompt)
            except Exception as e:
                logger.error(f"Error generating understanding response from API: {str(e)}")
                # Fallback response if API fails
                ethical_principles = [
                    "Privacy and Data Protection",
                    "Fairness and Non-discrimination",
                    "Transparency and Explainability",
                    "Safety and Security",
                    "Human Autonomy"
                ]
                
                # Extract key terms from the query
                query_keywords = set(query.lower().split())
                privacy_terms = {"privacy", "data", "information", "personal", "collecting"}
                fairness_terms = {"fair", "bias", "discrimination", "equal", "justice"}
                transparency_terms = {"transparent", "explain", "clarity", "understand", "black-box"}
                safety_terms = {"safe", "security", "harm", "risk", "protect"}
                
                relevant_principles = []
                if any(term in query_keywords for term in privacy_terms):
                    relevant_principles.append(ethical_principles[0])
                if any(term in query_keywords for term in fairness_terms):
                    relevant_principles.append(ethical_principles[1])
                if any(term in query_keywords for term in transparency_terms):
                    relevant_principles.append(ethical_principles[2])
                if any(term in query_keywords for term in safety_terms):
                    relevant_principles.append(ethical_principles[3])
                
                if not relevant_principles:
                    relevant_principles = [ethical_principles[0], ethical_principles[4]]  # Default if no match
                
                return f"""Thank you for sharing your ethical concern. I understand you're asking about "{query}".

Based on your description, the key ethical principles at play here include {" and ".join(relevant_principles)}.

When facing ethical dilemmas in software development, it's important to:
1. Identify all stakeholders who might be affected
2. Consider both immediate and long-term consequences
3. Evaluate alternatives that might reduce ethical concerns
4. Consult applicable guidelines, policies, or regulations

Could you share more details about the specific situation you're facing? This would help me provide more targeted guidance."""
        
        except Exception as e:
            logger.error(f"Error in _generate_understanding_response: {str(e)}")
            return "I'm sorry, I'm having trouble processing your request at the moment. Could you please try again with a simpler or more specific question?"

    def _generate_manager_response(self, query: str, context: List[Dict] = None) -> str:
        """Generate a response in practice (manager) mode."""
        try:
            # Determine manager characteristics
            manager_info = self.MANAGER_TYPES.get(self.manager_type, self.MANAGER_TYPES["DILUTER"])
            
            # Prepare the prompt
            prompt = f"""You are role-playing as a {self.manager_type} manager responding to an ethical concern.

Manager characteristics:
- Description: {manager_info['description']}
- Style: {manager_info['style']}
- Focus areas: {', '.join(manager_info['focus'])}

The team member has raised this ethical concern: "{query}"

Respond in character as this type of manager would, incorporating their typical language patterns, priorities, and ethical stance.
"""

            if context:
                prompt += "\n\nYou might reference these points in your response:\n"
                for item in context[:2]:  # Use top 2 context items
                    prompt += f"- {item.get('text', '')[:150]}...\n"

            # Try to use the LLM
            try:
                return self.model.generate(prompt)
            except Exception as e:
                logger.error(f"Error generating manager response from API: {str(e)}")
                # Fallback responses based on manager type
                fallback_responses = {
                    "PUPPETEER": f"""Thanks for bringing this up. I appreciate your concern about "{query}".

Look, we need to maintain our timeline here. I understand your ethical concerns, but we have commitments to meet. 

What if we make a small adjustment to address the immediate issue, but keep moving forward with our original plan? The client is expecting this feature by the end of the quarter.

I'll take your concerns under advisement, but for now, let's focus on hitting our deadlines. I'm sure we can find a balance that works.

Can you continue with the implementation while I consider your concerns?""",
                    
                    "DILUTER": f"""I hear what you're saying about "{query}", but I think you might be overthinking this.

These ethical concerns rarely amount to anything serious in practice. Many companies handle things this way, and it's considered standard in the industry.

The risks you're pointing out are quite minimal when you look at the big picture. Let's not make a mountain out of a molehill.

Why don't we proceed as planned, and if any actual problems arise, we can address them then? Being too cautious can slow down innovation.

Does that make sense to you?""",
                    
                    "CAMOUFLAGER": f"""Thank you for your diligence regarding "{query}". 

I've taken the liberty of reviewing our compliance framework, and I believe we're operating within the acceptable parameters of section 5.3 of our internal guidelines.

We're implementing an alternative interpretative framework that balances stakeholder interests while maintaining velocity on our key performance indicators.

I've documented your concerns in our risk assessment matrix and scheduled a future discussion with the appropriate cross-functional team members.

In the meantime, please continue with the established development protocol. We'll circle back on this in Q4 during our ethics review session."""
                }
                
                # Return the fallback response for the current manager type
                return fallback_responses.get(self.manager_type, fallback_responses["DILUTER"])
        
        except Exception as e:
            logger.error(f"Error in _generate_manager_response: {str(e)}")
            return f"I apologize, but I'm having difficulty generating a {self.manager_type} manager response right now. Could we continue this conversation when the system is functioning properly?"

    def _get_relevant_context(self, query: str) -> List[Dict]:
        """Retrieve relevant context for the query."""
        try:
            return self.retriever.hybrid_search(query, top_k=5)
        except Exception as e:
            logger.error(f"Error retrieving context: {str(e)}")
            return []

    def _initialize_components(self):
        """Initialize all component models."""
        try:
            # Initialize embedding model
            self.embedding_model = EmbeddingModel(cache_dir=str(self.cache_dir))
            
            # Initialize retriever
            self.retriever = HybridRetriever(self.embedding_model, str(self.cache_dir))
            
            # Initialize re-ranker
            self.reranker = ReRanker(cache_dir=str(self.cache_dir))
            
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
        self.user_responses = {}
        
        return """Welcome to the Ethical AI Decision-Making Assistant. I'm here to help you navigate ethical challenges in software development and management.

To provide the most relevant guidance, I'll need to understand:
1. The specific ethical dilemma you're facing
2. The context and stakeholders involved

Please describe the ethical concern you'd like to discuss."""

    def set_user_role(self, role: str) -> Tuple[bool, str]:
        """Set the user's role."""
        if role.lower() in self.VALID_ROLES:
            self.user_role = role.lower()
            return True, f"Role set to: {role}"
        return False, f"Invalid role. Valid roles are: {', '.join(self.VALID_ROLES.keys())}"

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
        
        if self.user_role in role_focus:
            focus_areas.extend(role_focus[self.user_role])
        
        # Issue-based focus areas
        if self.user_responses.get('issue_type') == 'Privacy':
            focus_areas.extend(['Data Protection', 'Confidentiality'])
        elif self.user_responses.get('issue_type') == 'Feasibility':
            focus_areas.extend(['Resource Management', 'Technical Constraints'])
        
        # Severity-based focus areas
        if self.user_responses.get('severity') == 'High':
            focus_areas.append('Risk Management')
        
        return list(set(focus_areas))  # Remove duplicates

    def save_feedback(self, query_id: str, rating: int, comment: Optional[str] = None) -> str:
        """Log feedback information but don't save to database."""
        feedback_id = str(uuid.uuid4())
        logger.info(f"Received feedback for query {query_id}: rating={rating}, comment={comment}")
        return feedback_id

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
                        role=self.user_role,
                        focus_areas=focus_areas,
                        issue_type=self.user_responses.get('issue_type'),
                        severity=self.user_responses.get('severity'),
                        manager_attitude=self.user_responses.get('manager_attitude')
                    )
                    
                    print("\nHere's my analysis and recommendations:")
                    print("=" * 50)
                    print(response)
                    print("=" * 50)
                    
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
                            role=self.user_role,
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

    def _get_user_role(self) -> str:
        """Get the current user role."""
        return self.user_role

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

    def save_conversation(self, query: str, response: str, metadata: Dict = None) -> bool:
        """Save conversation to database."""
        try:
            conversation_data = {
                "conversation_id": self.conversation_id,
                "user_role": self.user_role,
                "query": query,
                "response": response,
                "timestamp": datetime.now(),
                "user_responses": self.user_responses
            }
            if metadata:
                conversation_data.update(metadata)
            
            self.db.save_conversation(conversation_data)
            return True
        except Exception as e:
            logger.error(f"Error saving conversation: {str(e)}")
            return False 