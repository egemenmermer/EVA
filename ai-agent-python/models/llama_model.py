from typing import List, Dict, Optional
import logging
import requests
import json
import time
import hashlib

logger = logging.getLogger(__name__)

class LlamaModel:
    """Enhanced interface for Hugging Face API using Llama-2."""

    def __init__(self, 
                 model_name: str = "meta-llama/Llama-2-7b-chat-hf", 
                 api_token: str = None, 
                 use_api: bool = True):
        """Initialize model with API credentials and caching."""
        if not api_token:
            raise ValueError("API token is required for Hugging Face API access")

        self.model_name = model_name
        self.api_token = api_token
        self.api_url = f"https://api-inference.huggingface.co/models/{model_name}"
        self.headers = {"Authorization": f"Bearer {api_token}"}
        self.cache = {}

        logger.info(f"Initialized LlamaModel with {model_name}")

    def generate_ethical_response(self, query: str, context: List[Dict], role: str, 
                                  focus_areas: List[str], issue_type: str = None, 
                                  severity: str = None, manager_attitude: str = None) -> str:
        """Generate an ethical response using the Llama-2 API."""

        # Check cache first to avoid redundant API calls
        cache_key = self._get_cache_key(query, context, role, focus_areas, issue_type, severity, manager_attitude)
        if cache_key in self.cache:
            return self.cache[cache_key]

        try:
            # Format prompt for structured output
            prompt = self._format_prompt(query, context, role, focus_areas, issue_type, severity, manager_attitude)

            # API Request with Retry Mechanism
            max_retries = 3
            for attempt in range(max_retries):
                response = requests.post(
                    self.api_url,
                    headers=self.headers,
                    json={"inputs": prompt, "parameters": {
                        "max_new_tokens": 1024,
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "do_sample": True,
                        "return_full_text": False
                    }}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    generated_text = result[0].get('generated_text', '') if isinstance(result, list) else str(result)
                    structured_response = self._extract_response(generated_text)
                    
                    # Cache the response
                    self.cache[cache_key] = structured_response
                    return structured_response

                elif response.status_code == 429:
                    logger.warning("Rate limit exceeded. Retrying in 5 seconds...")
                    time.sleep(5)  # Wait and retry

                else:
                    logger.error(f"API Error: {response.status_code} - {response.text}")
                    break

            return "I encountered an issue generating a response. Please try again later."

        except Exception as e:
            logger.error(f"API request failed: {str(e)}")
            return "I'm experiencing technical difficulties at the moment."

    def _format_prompt(self, query: str, context: List[Dict], role: str, focus_areas: List[str],
                      issue_type: str = None, severity: str = None, manager_attitude: str = None) -> str:
        """Formats the prompt with RAG-enhanced structured reasoning, guidelines, and case studies."""
        
        # Limit the number of retrieved context entries
        MAX_CONTEXT_ENTRIES = 3
        context = context[:MAX_CONTEXT_ENTRIES]

        # Process context into categorized sections
        guidelines = []
        case_studies = []
        research_papers = []
        
        for c in context:
            text = c['text'][:500]
            if any(keyword in text.lower() for keyword in ['guideline', 'code of ethics', 'policy', 'regulation']):
                guidelines.append(text)
            elif any(keyword in text.lower() for keyword in ['case study', 'example', 'incident', 'lawsuit']):
                case_studies.append(text)
            else:
                research_papers.append(text)

        # Format context sections
        guidelines_text = "\n".join([f"- {g}" for g in guidelines]) if guidelines else "No specific guidelines found."
        case_studies_text = "\n".join([f"- {c}" for c in case_studies]) if case_studies else "No relevant case studies found."
        research_text = "\n".join([f"- {r}" for r in research_papers]) if research_papers else "No relevant research papers found."

        # Define structured output with RAG-enhanced framework
        prompt = f"""
<|system|>
You are an AI-powered ethical decision-making assistant for software professionals, specifically helping a {role} navigate complex ethical decisions. Your goal is to provide comprehensive guidance through ethical analysis, argumentation tactics, and practical recommendations, backed by relevant literature and case studies.

User's Ethical Dilemma:
{query}

Context Analysis:
- Role: {role}
- Focus Areas: {", ".join(focus_areas)}
- Manager's Attitude: {manager_attitude if manager_attitude else "N/A"}

Based on the user's description and the retrieved context, please analyze:
1. The type of ethical concern (e.g., Privacy & Data Protection, AI/ML Fairness & Bias, Security & Compliance, User Experience & Accessibility, Business Ethics & Transparency)
2. The severity of the potential impact (Low, Medium, or High)

Relevant Ethical Guidelines & Policies:
{guidelines_text}

Relevant Case Studies & Precedents:
{case_studies_text}

Supporting Research & Literature:
{research_text}

Please provide a structured response following this framework:

1️⃣ ETHICAL ANALYSIS
- Identify the core ethical principles at stake
- Evaluate potential impacts on stakeholders
- Consider power dynamics and organizational context
- Reference specific ethical frameworks and guidelines from the retrieved context

2️⃣ ARGUMENTATION STRATEGY
Based on the manager's attitude ({manager_attitude if manager_attitude else "N/A"}), provide:
- Logical Appeals: Use empirical evidence and citations from the retrieved literature
- Emotional Appeals: Reference real-world impacts from case studies
- Process-Based Resistance: Suggest ethics reviews and compliance framing
- Timing-Based Resistance: Propose strategic approaches based on precedents

3️⃣ PRACTICAL RECOMMENDATIONS
Provide three actionable steps that:
- Address immediate ethical concerns
- Build support for ethical decision-making
- Create sustainable ethical practices

4️⃣ CASE STUDY REFERENCE
- Share a relevant real-world example from the retrieved context
- Extract key lessons and parallels
- Apply insights to the current situation

5️⃣ ACTION PLAN
- Immediate next steps
- Long-term ethical considerations
- Support resources and references

6️⃣ ENCOURAGEMENT & CLOSING
- Reinforce ethical responsibility
- Offer ongoing support
- Provide learning resources

Response:
</|system|>
"""
        return prompt

    def _extract_response(self, text: str) -> str:
        """Extracts and structures the response from the model output."""
        try:
            response = text.split("Response:")[-1].strip()
            return response
        except:
            return text

    def generate_clarifying_questions(self, query: str) -> Dict[str, List[str]]:
        """Generate clarifying questions to categorize the issue properly."""

        # Check cache first
        cache_key = f"clarify_{hashlib.md5(query.encode()).hexdigest()}"
        if cache_key in self.cache:
            return self.cache[cache_key]

        try:
            prompt = f"""Based on this ethical concern: "{query}"

Identify the most relevant clarifying questions to categorize the issue:
1️⃣ Is this a **Feasibility** or **Privacy** issue?  
2️⃣ How severe is the ethical breach? (**Low, Medium, High**)  
3️⃣ What is the manager's stance? (**Supportive, Indifferent, Pressuring**)  

Provide structured response."""
            
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json={"inputs": prompt, "parameters": {"max_length": 512, "temperature": 0.7}}
            )

            if response.status_code == 200:
                clarifying_questions = {
                    "issue_type": ["Is this issue primarily about Feasibility or Privacy?"],
                    "severity": ["How severe is the ethical breach? (Low, Medium, High)"],
                    "manager_attitude": ["What is your manager's stance? (Supportive, Indifferent, Pressuring)"]
                }
                self.cache[cache_key] = clarifying_questions
                return clarifying_questions
            
            return {}

        except Exception as e:
            logger.error(f"Error generating clarifying questions: {str(e)}")
            return {}

    def _get_cache_key(self, *args) -> str:
        """Generate a hash key for caching responses."""
        key_string = "_".join(str(arg) for arg in args if arg)
        return hashlib.md5(key_string.encode()).hexdigest()