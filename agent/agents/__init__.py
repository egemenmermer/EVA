"""
Agents package containing different types of AI agents.
"""

from agents.langchain_agent import LangChainAgent
from agents.base_agent import BaseAgent

# Define what should be available when someone does: from agents import *
__all__ = ['LangChainAgent', 'BaseAgent']
