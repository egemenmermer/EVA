"""Agent for generating and processing clarifying questions."""

from typing import Dict, List, Optional
from loguru import logger
from ..models.llama_model import LlamaModel
from ..utils.prompt_utils import PromptBuilder, ResponseCleaner
from ..config import ISSUE_TYPES, SEVERITY_LEVELS, MANAGER_ATTITUDES

class ClarifyingAgent:
    """Agent for handling clarifying questions about ethical scenarios."""
    
    def __init__(self):
        """Initialize the clarifying agent."""
        self.model = LlamaModel()
        self.prompt_builder = PromptBuilder()
        self.response_cleaner = ResponseCleaner()
        logger.info("Initialized ClarifyingAgent")

    def generate_questions(self, query: str) -> Dict[str, List[str]]:
        """Generate clarifying questions for an ethical scenario.
        
        Args:
            query (str): User's ethical query
            
        Returns:
            Dict[str, List[str]]: Dictionary of questions by category
        """
        try:
            # Build prompt for clarifying questions
            prompt = self.prompt_builder.build_clarifying_prompt(query)
            
            # Generate response
            response = self.model.generate_response(prompt)
            
            # Clean response
            cleaned_response = self.response_cleaner.clean_response(response)
            
            # Extract and categorize questions
            questions = self._categorize_questions(cleaned_response)
            
            logger.info(f"Generated {sum(len(v) for v in questions.values())} questions across {len(questions)} categories")
            return questions
            
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            return self._get_default_questions()

    def _categorize_questions(self, response: str) -> Dict[str, List[str]]:
        """Categorize questions from the response.
        
        Args:
            response (str): Cleaned response text
            
        Returns:
            Dict[str, List[str]]: Categorized questions
        """
        questions = {
            "issue_type": [],
            "severity": [],
            "manager_attitude": []
        }
        
        # Extract all questions from response
        all_questions = [
            line.strip() for line in response.split('\n')
            if '?' in line and line.strip()
        ]
        
        for question in all_questions:
            # Categorize based on keywords
            if any(issue.lower() in question.lower() for issue in ISSUE_TYPES):
                questions["issue_type"].append(question)
            elif any(level.lower() in question.lower() for level in SEVERITY_LEVELS):
                questions["severity"].append(question)
            elif any(attitude.lower() in question.lower() for attitude in MANAGER_ATTITUDES):
                questions["manager_attitude"].append(question)
        
        return questions

    def _get_default_questions(self) -> Dict[str, List[str]]:
        """Get default questions if generation fails.
        
        Returns:
            Dict[str, List[str]]: Default questions by category
        """
        return {
            "issue_type": [
                "Is this primarily a privacy, feasibility, security, or compliance issue?",
                "What specific ethical principle or regulation is most relevant here?"
            ],
            "severity": [
                "How would you rate the severity of this ethical concern (low, medium, high)?",
                "What potential impact could this have on stakeholders?"
            ],
            "manager_attitude": [
                "How would you describe your manager's stance on this issue (supportive, indifferent, pressuring)?",
                "Has your manager expressed any specific views about this situation?"
            ]
        }

    def process_answers(self, 
                       answers: Dict[str, str]) -> Dict[str, Optional[str]]:
        """Process answers to clarifying questions.
        
        Args:
            answers (Dict[str, str]): User's answers to questions
            
        Returns:
            Dict[str, Optional[str]]: Processed and validated answers
        """
        processed = {
            "issue_type": None,
            "severity": None,
            "manager_attitude": None
        }
        
        try:
            # Process issue type
            if "issue_type" in answers:
                issue = answers["issue_type"].upper()
                if issue in ISSUE_TYPES:
                    processed["issue_type"] = issue
            
            # Process severity
            if "severity" in answers:
                severity = answers["severity"].upper()
                if severity in SEVERITY_LEVELS:
                    processed["severity"] = severity
            
            # Process manager attitude
            if "manager_attitude" in answers:
                attitude = answers["manager_attitude"].upper()
                if attitude in MANAGER_ATTITUDES:
                    processed["manager_attitude"] = attitude
            
            logger.info(f"Processed answers: {processed}")
            return processed
            
        except Exception as e:
            logger.error(f"Error processing answers: {str(e)}")
            return processed 