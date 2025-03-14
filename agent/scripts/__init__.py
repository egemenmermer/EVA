"""
Scripts package for running various components of the ethical AI system.
Contains scripts for data processing, agent interaction, and evaluation.
"""

from pathlib import Path

# Ensure scripts directory is in Python path
__path__ = [str(Path(__file__).parent)]

# Define what should be available when someone does: from scripts import *
__all__ = ['process_data', 'run_agent'] 