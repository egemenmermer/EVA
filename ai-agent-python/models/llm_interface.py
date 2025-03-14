from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import os
import logging
from typing import Dict, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class LLMInterface:
    """Interface for loading and managing LLM models."""
    
    def __init__(self, model_name: str, cache_dir: str, api_token: str):
        """Initialize LLM interface."""
        self.model_name = model_name
        self.cache_dir = Path(cache_dir)
        self.api_token = api_token
        
        # Create cache directory
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Load models
        self._load_models()
        
    def _load_models(self):
        """Load tokenizer and model."""
        try:
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=self.cache_dir,
                token=self.api_token
            )
            
            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float32,
                cache_dir=self.cache_dir,
                token=self.api_token,
                low_cpu_mem_usage=True
            )
            
            # Move to CPU explicitly
            self.model = self.model.cpu()
            
            logger.info(f"Successfully loaded {self.model_name}")
            
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            raise
            
    def generate(self, prompt: str, 
                max_length: int = 1024,
                temperature: float = 0.7,
                top_p: float = 0.9) -> str:
        """Generate text from prompt."""
        try:
            # Tokenize
            inputs = self.tokenizer(prompt, return_tensors="pt")
            
            # Generate
            outputs = self.model.generate(
                inputs.input_ids,
                max_length=max_length,
                temperature=temperature,
                top_p=top_p,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
            
            # Decode
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Remove prompt from response
            response = response[len(prompt):]
            
            return response.strip()
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return "" 