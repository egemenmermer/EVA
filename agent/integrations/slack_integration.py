from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
import logging
from typing import Dict, Optional
import os
from agents.ethical_agent import EthicalAgent

logger = logging.getLogger(__name__)

class SlackBot:
    """Slack bot for ethical decision-making assistance."""
    
    def __init__(self, ethical_agent: EthicalAgent):
        """Initialize Slack bot with ethical agent."""
        self.client = WebClient(token=os.environ.get("SLACK_BOT_TOKEN"))
        self.agent = ethical_agent
        self.user_roles = {}  # Map Slack user IDs to roles
        
        # Verify bot connection
        try:
            self.bot_id = self.client.auth_test()["bot_id"]
            logger.info("Slack bot initialized successfully")
        except SlackApiError as e:
            logger.error(f"Error connecting to Slack: {str(e)}")
            raise

    async def handle_message(self, event: Dict) -> None:
        """Handle incoming Slack messages."""
        try:
            user_id = event.get("user")
            channel_id = event.get("channel")
            text = event.get("text", "").strip()
            
            # Ignore bot's own messages
            if not user_id or event.get("bot_id") == self.bot_id:
                return
                
            # Check if user needs to set role
            if user_id not in self.user_roles:
                await self._handle_role_setup(user_id, channel_id, text)
                return
                
            # Process query with ethical agent
            response = self.agent.process_query(text)
            
            # Send response
            await self._send_message(channel_id, response)
            
        except Exception as e:
            logger.error(f"Error handling Slack message: {str(e)}")
            await self._send_error_message(channel_id)

    async def _handle_role_setup(self, user_id: str, channel_id: str, text: str) -> None:
        """Handle role setup for new users."""
        try:
            if text.lower() in ["help", "roles"]:
                welcome_message = self.agent.start_conversation()
                await self._send_message(channel_id, welcome_message)
                return
                
            success, message = self.agent.set_user_role(text)
            if success:
                self.user_roles[user_id] = text.lower().replace(" ", "_")
            await self._send_message(channel_id, message)
            
        except Exception as e:
            logger.error(f"Error in role setup: {str(e)}")
            await self._send_error_message(channel_id)

    async def _send_message(self, channel_id: str, text: str) -> None:
        """Send a message to Slack channel."""
        try:
            # Split long messages if needed (Slack has a 4000 char limit)
            if len(text) > 4000:
                chunks = [text[i:i+4000] for i in range(0, len(text), 4000)]
                for chunk in chunks:
                    self.client.chat_postMessage(
                        channel=channel_id,
                        text=chunk
                    )
            else:
                self.client.chat_postMessage(
                    channel=channel_id,
                    text=text
                )
        except SlackApiError as e:
            logger.error(f"Error sending message to Slack: {str(e)}")

    async def _send_error_message(self, channel_id: str) -> None:
        """Send error message to Slack channel."""
        error_message = (
            "I apologize, but I encountered an error processing your request. "
            "Please try again or contact support if the issue persists."
        )
        await self._send_message(channel_id, error_message)

    def get_user_role(self, user_id: str) -> Optional[str]:
        """Get role for a given user ID."""
        return self.user_roles.get(user_id) 