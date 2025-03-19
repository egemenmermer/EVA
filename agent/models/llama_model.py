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

        logger.info(f"Initialized LlamaModel using API for {model_name}")

    def generate_ethical_response(self, query: str, context: List[Dict], 
                                manager_type: str) -> str:
        """Generate an ethical response using the Llama-2 API."""

        # Check cache first to avoid redundant API calls
        cache_key = self._get_cache_key(query, context, manager_type)
        if cache_key in self.cache:
            return self.cache[cache_key]

        try:
            # Format prompt for structured output
            prompt = self._format_prompt(query, context, manager_type)

            # API Request with Retry Mechanism
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = requests.post(
                        self.api_url,
                        headers=self.headers,
                        json={
                            "inputs": prompt,
                            "parameters": {
                                "max_length": 2048,
                                "temperature": 0.7,
                                "top_p": 0.9,
                                "do_sample": True,
                                "return_full_text": False
                            }
                        },
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        generated_text = result[0].get('generated_text', '') if isinstance(result, list) else str(result)
                        structured_response = self._extract_response(generated_text)
                        
                        # Cache the response
                        self.cache[cache_key] = structured_response
                        return structured_response

                    elif response.status_code == 429:
                        logger.warning(f"Rate limit exceeded. Retrying in 5 seconds... (Attempt {attempt + 1}/{max_retries})")
                        time.sleep(5)  # Wait and retry
                        continue

                    else:
                        error_msg = f"API Error: {response.status_code} - {response.text}"
                        logger.error(error_msg)
                        if attempt == max_retries - 1:  # Last attempt
                            return f"I apologize, but I encountered an error: {error_msg}"
                        time.sleep(2)  # Wait before retrying

                except requests.exceptions.Timeout:
                    logger.error("Request timed out")
                    if attempt == max_retries - 1:
                        return "I apologize, but the request timed out. Please try again."
                    time.sleep(2)
                except requests.exceptions.RequestException as e:
                    logger.error(f"Request failed: {str(e)}")
                    if attempt == max_retries - 1:
                        return f"I apologize, but there was a network error: {str(e)}"
                    time.sleep(2)

            return "I encountered an issue generating a response. Please try again later."

        except Exception as e:
            logger.error(f"API request failed: {str(e)}")
            return "I'm experiencing technical difficulties at the moment."

    def _format_prompt(self, query: str, context: List[Dict], 
                      manager_type: str) -> str:
        """Format the prompt with manager type information."""
        
        # Process context into categorized sections
        guidelines = []
        case_studies = []
        research_papers = []
        
        for c in context:
            text = c.get('text', '')[:500]  # Limit context length
            if any(keyword in text.lower() for keyword in ['guideline', 'ethics', 'policy']):
                guidelines.append(text)
            elif any(keyword in text.lower() for keyword in ['case', 'example', 'incident']):
                case_studies.append(text)
            else:
                research_papers.append(text)

        # Construct the prompt
        prompt = f"""As an {manager_type} manager, analyze the following ethical concern:

Query: {query}

"""

        if guidelines:
            prompt += "\nRelevant Guidelines:\n" + "\n".join(f"- {g}" for g in guidelines[:2])
        
        if case_studies:
            prompt += "\nRelevant Case Studies:\n" + "\n".join(f"- {c}" for c in case_studies[:2])
        
        if research_papers:
            prompt += "\nAdditional Context:\n" + "\n".join(f"- {r}" for r in research_papers[:2])

        prompt += f"\n\nProvide a response that reflects the {manager_type} management style while addressing the ethical concern."

        return prompt

    def _get_cache_key(self, query: str, context: List[Dict], 
                       manager_type: str) -> str:
        """Generate a cache key for the response."""
        key_parts = [
            query,
            str(sorted([str(c) for c in context])),
            manager_type
        ]
        return hashlib.md5(''.join(key_parts).encode()).hexdigest()

    def _extract_response(self, text: str) -> str:
        """Extract and clean up the generated response."""
        # Remove any system prompts or formatting
        lines = text.split('\n')
        response_lines = []
        in_response = False
        
        for line in lines:
            if line.strip().lower().startswith(('response:', 'answer:', 'ai:')):
                in_response = True
                continue
            if in_response and line.strip():
                response_lines.append(line.strip())
        
        return ' '.join(response_lines) if response_lines else text.strip()

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