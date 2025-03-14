import logging
from typing import Dict, List, Optional
from pathlib import Path
import json
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
    DataCollatorForLanguageModeling
)
from datasets import Dataset
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)

class EthicalFineTuner:
    """Fine-tune LLM on ethical conversations."""
    
    def __init__(self, 
                 model_name: str,
                 cache_dir: str,
                 api_token: str):
        """Initialize fine-tuning components."""
        self.model_name = model_name
        self.cache_dir = Path(cache_dir)
        self.api_token = api_token
        
        # Create directories
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Load base model and tokenizer
        self._load_model()
        
    def _load_model(self):
        """Load pre-trained model and tokenizer."""
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=self.cache_dir,
                token=self.api_token
            )
            
            self.model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float32,
                cache_dir=self.cache_dir,
                token=self.api_token,
                low_cpu_mem_usage=True
            )
            
            logger.info(f"Loaded base model: {self.model_name}")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
            
    def prepare_training_data(self, conversations_file: str) -> Dataset:
        """Prepare conversation data for fine-tuning."""
        try:
            # Load conversations
            with open(conversations_file) as f:
                conversations = json.load(f)
            
            # Format conversations for training
            training_data = []
            for conv in conversations:
                formatted = self._format_conversation(conv)
                if formatted:
                    training_data.append(formatted)
            
            # Create dataset
            dataset = Dataset.from_dict({
                'text': training_data
            })
            
            # Tokenize dataset
            tokenized_dataset = dataset.map(
                lambda x: self.tokenizer(
                    x['text'],
                    truncation=True,
                    max_length=512,
                    padding='max_length'
                ),
                batched=True
            )
            
            return tokenized_dataset
            
        except Exception as e:
            logger.error(f"Error preparing training data: {str(e)}")
            raise
            
    def _format_conversation(self, conv: Dict) -> Optional[str]:
        """Format a conversation for training."""
        try:
            role = conv.get('role', '')
            query = conv.get('query', '')
            response = conv.get('response', '')
            context = conv.get('context', [])
            
            # Format context
            context_str = ""
            if context:
                context_str = "Relevant guidelines and cases:\n"
                for doc in context:
                    context_str += f"- {doc['text']}\n"
                context_str += "\n"
            
            # Format full conversation
            formatted = (
                "<s>[INST] <<SYS>>\n"
                "You are an ethical decision-making assistant for software professionals. "
                f"You are speaking to a {role}. "
                "Use the provided context to give specific, actionable guidance.\n"
                "<</SYS>>\n\n"
                f"{context_str}"
                f"{query} [/INST]\n"
                f"{response}</s>"
            )
            
            return formatted
            
        except Exception as e:
            logger.error(f"Error formatting conversation: {str(e)}")
            return None
            
    def train(self,
             dataset: Dataset,
             output_dir: str,
             epochs: int = 3,
             batch_size: int = 8,
             learning_rate: float = 2e-5):
        """Fine-tune the model on prepared dataset."""
        try:
            # Setup training arguments
            training_args = TrainingArguments(
                output_dir=output_dir,
                num_train_epochs=epochs,
                per_device_train_batch_size=batch_size,
                learning_rate=learning_rate,
                weight_decay=0.01,
                logging_dir=f"{output_dir}/logs",
                logging_steps=10,
                save_strategy="epoch",
                save_total_limit=2,
                no_cuda=True  # Force CPU training
            )
            
            # Initialize trainer
            trainer = Trainer(
                model=self.model,
                args=training_args,
                train_dataset=dataset,
                data_collator=DataCollatorForLanguageModeling(
                    tokenizer=self.tokenizer,
                    mlm=False
                )
            )
            
            # Train model
            trainer.train()
            
            # Save final model
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            final_output_dir = f"{output_dir}/final_{timestamp}"
            self.model.save_pretrained(final_output_dir)
            self.tokenizer.save_pretrained(final_output_dir)
            
            logger.info(f"Completed fine-tuning. Model saved to {final_output_dir}")
            
        except Exception as e:
            logger.error(f"Error during training: {str(e)}")
            raise 