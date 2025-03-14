"""
Integrations package for external service connections.
"""

from integrations.slack_integration import SlackIntegration
from integrations.jira_integration import JiraIntegration

__all__ = ['SlackIntegration', 'JiraIntegration']
