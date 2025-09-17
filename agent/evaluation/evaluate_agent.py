import logging
from typing import List, Dict, Tuple
import numpy as np
from bert_score import BERTScorer
from rouge_score import rouge_scorer
from pathlib import Path
import json
from datetime import datetime
from agents.langchain_agent import LangChainAgent

logger = logging.getLogger(__name__)

class AgentEvaluator:
    """Evaluate ethical agent performance using multiple metrics."""
    
    def __init__(self, agent: LangChainAgent):
        """Initialize evaluator with metrics."""
        self.agent = agent
        
        # Initialize scorers
        self.bert_scorer = BERTScorer(lang="en", rescale_with_baseline=True)
        self.rouge_scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
        
        # Track evaluation results
        self.results = []
        
    def evaluate_response(self, 
                         query: str,
                         response: str,
                         expected: str,
                         role: str) -> Dict:
        """Evaluate a single response using multiple metrics."""
        try:
            # Calculate BERT score
            P, R, F1 = self.bert_scorer.score([response], [expected])
            bert_score = float(F1.mean())
            
            # Calculate ROUGE scores
            rouge_scores = self.rouge_scorer.score(expected, response)
            
            # Store result
            result = {
                'timestamp': datetime.now().isoformat(),
                'role': role,
                'query': query,
                'response': response,
                'expected': expected,
                'metrics': {
                    'bert_score': bert_score,
                    'rouge1_f': rouge_scores['rouge1'].fmeasure,
                    'rouge2_f': rouge_scores['rouge2'].fmeasure,
                    'rougeL_f': rouge_scores['rougeL'].fmeasure
                }
            }
            
            self.results.append(result)
            return result
            
        except Exception as e:
            logger.error(f"Error evaluating response: {str(e)}")
            return {}
            
    def evaluate_test_set(self, test_cases: List[Dict]) -> Dict:
        """Evaluate agent on a test set of queries."""
        results = []
        metrics = {
            'bert_score': [],
            'rouge1_f': [],
            'rouge2_f': [],
            'rougeL_f': []
        }
        
        for case in test_cases:
            # Set role for this test case
            self.agent.set_user_role(case['role'])
            
            # Get agent response
            response = self.agent.process_query(case['query'])
            
            # Evaluate response
            result = self.evaluate_response(
                query=case['query'],
                response=response,
                expected=case['expected'],
                role=case['role']
            )
            
            results.append(result)
            
            # Aggregate metrics
            for metric, value in result.get('metrics', {}).items():
                metrics[metric].append(value)
        
        # Calculate aggregate statistics
        summary = {
            'total_cases': len(test_cases),
            'metrics': {
                metric: {
                    'mean': float(np.mean(values)),
                    'std': float(np.std(values)),
                    'min': float(np.min(values)),
                    'max': float(np.max(values))
                }
                for metric, values in metrics.items()
            }
        }
        
        return {
            'summary': summary,
            'detailed_results': results
        }
        
    def save_results(self, save_dir: str):
        """Save evaluation results to file."""
        save_path = Path(save_dir)
        save_path.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = save_path / f"evaluation_results_{timestamp}.json"
        
        try:
            with open(filename, 'w') as f:
                json.dump(self.results, f, indent=2)
            logger.info(f"Saved evaluation results to {filename}")
        except Exception as e:
            logger.error(f"Error saving results: {str(e)}") 