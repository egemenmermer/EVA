"""
Ethical Decision-Making Practice Module for Software Engineers

This module provides an interactive simulation of ethical scenarios commonly encountered
in software engineering. It allows users to practice ethical decision-making and learn
effective strategies for ethical advocacy in professional settings.

The module simulates interactions with different manager types (Puppeteer, Camouflager, 
Diluter) and provides feedback on the ethical effectiveness of user responses.

Main components:
- InteractionFlow: Manages the conversation flow between user and simulated manager
- EthicalScenarioEvaluator: Evaluates user responses and provides feedback
- StrategyKnowledge: Contains information about ethical strategies and manager types
"""

from .evaluator import EthicalScenarioEvaluator
from .interaction_flow import InteractionFlow
from .strategy_knowledge import StrategyKnowledge

__all__ = ['EthicalScenarioEvaluator', 'InteractionFlow', 'StrategyKnowledge'] 