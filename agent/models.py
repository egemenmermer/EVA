import logging
import os
from typing import Dict, List, Optional, Any
import openai

logger = logging.getLogger(__name__)

# Configure OpenAI API
openai.api_key = os.getenv("OPENAI_API_KEY")

class OpenAIModel:
    """OpenAI model for generating text responses."""
    
    def __init__(self, model_name: str = "gpt-4", cache_dir: str = None):
        """Initialize the OpenAI model."""
        logger.info(f"Initializing OpenAI model: {model_name}")
        self.model_name = model_name
        self.cache_dir = cache_dir
        
    def generate(self, prompt: str, max_tokens: int = 500, temperature: float = 0.7) -> str:
        """Generate text based on the prompt using OpenAI."""
        try:
            response = openai.ChatCompletion.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are an ethical AI assistant helping with software development decisions."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error generating text with OpenAI: {str(e)}")
            return f"Error generating response: {str(e)}"
        
    def batch_generate(self, prompts: List[str], max_tokens: int = 500, temperature: float = 0.7) -> List[str]:
        """Generate text for multiple prompts."""
        return [self.generate(prompt, max_tokens, temperature) for prompt in prompts]

# For backward compatibility
LlamaModel = OpenAIModel 