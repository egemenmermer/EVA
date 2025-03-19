import React, { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useStore } from '@/store/useStore';
import { conversationApi } from '@/services/api';
import { v4 as uuidv4 } from 'uuid';

// Define the Message type consistently with what's used in useStore
interface Message {
  id?: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export const ChatWindow: React.FC = () => {
  const { 
    currentConversation, 
    messages, 
    setMessages, 
    addMessage, 
    managerType
  } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation?.conversationId) {
      fetchMessages(currentConversation.conversationId);
    } else {
      // Clear messages if no conversation is selected
      setMessages([]);
    }
  }, [currentConversation?.conversationId]);

  const fetchMessages = async (conversationId: string) => {
    try {
      console.log('Fetching messages for conversation:', conversationId);
      const fetchedMessages = await conversationApi.getConversationMessages(conversationId);
      
      // Convert API messages to our format
      const formattedMessages: Message[] = fetchedMessages.map(msg => ({
        id: uuidv4(), // Generate a temporary ID
        conversationId: msg.conversationId,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages. Please try again.');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !currentConversation?.conversationId) return;

    try {
      setLoading(true);
      setError(null);

      // Add user message to UI immediately
      const userMessage: Message = {
        id: uuidv4(),
        conversationId: currentConversation.conversationId,
        role: 'user',
        content,
        createdAt: new Date().toISOString()
      };
      addMessage(userMessage);

      // Send to API
      console.log('Sending message to API:', content);
      const response = await conversationApi.sendMessage(
        currentConversation.conversationId,
        content
      );

      // Add AI response to UI
      const assistantMessage: Message = {
        id: uuidv4(),
        conversationId: currentConversation.conversationId,
        role: 'assistant',
        content: response.agentResponse || response.content,
        createdAt: response.createdAt
      };
      
      addMessage(assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Welcome message for new conversation
  const getWelcomeMessage = () => {
    return {
      id: 'welcome',
      conversationId: currentConversation?.conversationId || 'new',
      role: 'assistant' as const,
      content: `👋 Welcome to EthicAI! I'm your AI assistant using the ${managerType} manager.\n\nHow can I help you today?`,
      createdAt: new Date().toISOString()
    };
  };

  return (
    <div className="h-full flex flex-col">
      {currentConversation ? (
        <>
          <div className="flex-1 overflow-hidden">
            <MessageList 
              messages={messages.length > 0 ? messages : [getWelcomeMessage()]} 
              loading={loading} 
            />
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <MessageInput onSendMessage={handleSendMessage} disabled={loading} />
            {error && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Welcome to EthicAI
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Select a conversation from the sidebar or start a new one to begin.
            </p>
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current manager type: <span className="font-medium">{managerType}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 