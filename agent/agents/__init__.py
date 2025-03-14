"""
Agents package containing different types of AI agents.
"""

from agents.ethical_agent import EthicalAgent
from agents.base_agent import BaseAgent

# Define what should be available when someone does: from agents import *
__all__ = ['EthicalAgent', 'BaseAgent']
