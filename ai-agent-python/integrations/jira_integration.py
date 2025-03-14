from jira import JIRA
import logging
from typing import Dict, List, Optional
import os
from datetime import datetime

logger = logging.getLogger(__name__)

class JiraConnector:
    """Integration with Jira for tracking ethical decisions."""
    
    def __init__(self):
        """Initialize Jira connection."""
        try:
            self.jira = JIRA(
                server=os.environ.get("JIRA_SERVER"),
                basic_auth=(
                    os.environ.get("JIRA_EMAIL"),
                    os.environ.get("JIRA_API_TOKEN")
                )
            )
            logger.info("Jira connection initialized successfully")
        except Exception as e:
            logger.error(f"Error connecting to Jira: {str(e)}")
            raise

    def create_ethical_issue(self,
                           summary: str,
                           description: str,
                           role: str,
                           context: List[Dict],
                           project_key: str) -> Optional[str]:
        """Create a Jira issue for ethical decision tracking."""
        try:
            # Format description with context
            full_description = self._format_description(description, role, context)
            
            # Create issue
            issue = self.jira.create_issue(
                project=project_key,
                summary=summary,
                description=full_description,
                issuetype={'name': 'Task'},
                labels=['ethical-decision']
            )
            
            logger.info(f"Created Jira issue: {issue.key}")
            return issue.key
            
        except Exception as e:
            logger.error(f"Error creating Jira issue: {str(e)}")
            return None

    def _format_description(self,
                          description: str,
                          role: str,
                          context: List[Dict]) -> str:
        """Format issue description with context."""
        formatted = (
            f"*Ethical Decision Record*\n\n"
            f"h2. Decision Context\n"
            f"* Role: {role}\n"
            f"* Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
            f"h2. Description\n{description}\n\n"
        )
        
        if context:
            formatted += (
                f"h2. Reference Materials\n"
                "Referenced guidelines and cases:\n"
            )
            for doc in context:
                formatted += f"* {doc['source']}: {doc['text'][:200]}...\n"
        
        return formatted

    def add_comment(self, issue_key: str, comment: str) -> bool:
        """Add a comment to an existing issue."""
        try:
            self.jira.add_comment(issue_key, comment)
            return True
        except Exception as e:
            logger.error(f"Error adding comment to {issue_key}: {str(e)}")
            return False

    def update_issue_status(self, issue_key: str, status: str) -> bool:
        """Update the status of an issue."""
        try:
            issue = self.jira.issue(issue_key)
            transitions = self.jira.transitions(issue)
            
            # Find the transition that matches the desired status
            for t in transitions:
                if t['name'].lower() == status.lower():
                    self.jira.transition_issue(issue, t['id'])
                    return True
                    
            logger.warning(f"No transition found for status: {status}")
            return False
            
        except Exception as e:
            logger.error(f"Error updating status for {issue_key}: {str(e)}")
            return False 