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
  isSystemMessage?: boolean;
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
  const [practiceMode, setPracticeMode] = useState(false);
  const [showPracticeBanner, setShowPracticeBanner] = useState(false);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation?.conversationId) {
      console.log('ChatWindow: Conversation changed, fetching messages for:', currentConversation.conversationId);
      setLoading(true);
      fetchMessages(currentConversation.conversationId)
        .finally(() => setLoading(false));
    } else {
      // Clear messages if no conversation is selected
      setMessages([]);
    }
  }, [currentConversation?.conversationId, setMessages]);

  const fetchMessages = async (conversationId: string) => {
    try {
      console.log('Fetching messages for conversation:', conversationId);
      const fetchedMessages = await conversationApi.getConversationMessages(conversationId);
      
      console.log('API response for messages:', fetchedMessages);
      
      if (Array.isArray(fetchedMessages)) {
        // Convert API messages to our format and maintain order
        const formattedMessages: Message[] = fetchedMessages.map(msg => {
          // Determine the role (user or assistant)
          let role: 'user' | 'assistant' = 'assistant';
          if (msg.userQuery && !msg.agentResponse) {
            role = 'user';
          }
          
          return {
            id: msg.id || uuidv4(), // Use existing ID if available
            conversationId: conversationId,
            role: role,
            content: role === 'user' ? msg.userQuery : msg.agentResponse || '',
            createdAt: msg.createdAt
          };
        });
        
        console.log('Formatted messages:', formattedMessages.length, formattedMessages);
        
        // Filter out any messages with empty content
        const validMessages = formattedMessages.filter(msg => msg.content.trim() !== '');
        
        setMessages(validMessages);
      } else {
        console.error('API returned invalid message format:', fetchedMessages);
        setError('Failed to parse messages from server. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages. Please try again.');
    }
  };

  // Function to detect if a message is asking about practice mode
  const detectPracticeModeOffer = (content: string): boolean => {
    const lowerContent = content.toLowerCase();
    const practiceKeywords = [
      'would you like to practice handling this situation',
      'practice with a manager',
      'practice session',
      'role-playing'
    ];
    
    return practiceKeywords.some(keyword => lowerContent.includes(keyword));
  };
  
  // Function to handle entering practice mode
  const handleEnterPracticeMode = () => {
    setPracticeMode(true);
    setShowPracticeBanner(true);
    
    // Add a system message to indicate the mode change
    const systemMessage: Message = {
      id: uuidv4(),
      conversationId: currentConversation?.conversationId || '',
      role: 'assistant',
      content: `You've entered practice mode. EVA will now respond as a ${managerType} manager to help you practice your ethical communication skills.`,
      createdAt: new Date().toISOString(),
      isSystemMessage: true
    };
    
    addMessage(systemMessage);
  };
  
  // Function to handle exiting practice mode
  const handleExitPracticeMode = () => {
    setPracticeMode(false);
    
    // Add a system message to indicate the mode change
    const systemMessage: Message = {
      id: uuidv4(),
      conversationId: currentConversation?.conversationId || '',
      role: 'assistant',
      content: `You've exited practice mode. EVA will now respond normally to help you understand ethical considerations.`,
      createdAt: new Date().toISOString(),
      isSystemMessage: true
    };
    
    addMessage(systemMessage);
    
    // Send a special command to the agent to exit practice mode
    handleSendMessage("understand: Let's continue our discussion without role-playing");
  };
  
  // Detect practice mode offers in new messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && detectPracticeModeOffer(lastMessage.content)) {
        setShowPracticeBanner(true);
      }
    }
  }, [messages]);
  
  // Modified sendMessage to handle practice mode responses
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !currentConversation?.conversationId) return;

    // Handle special commands for practice mode
    if (content.toLowerCase() === 'yes' && showPracticeBanner && !practiceMode) {
      handleEnterPracticeMode();
      setShowPracticeBanner(false);
      return;
    }
    
    if (content.toLowerCase() === 'exit practice mode' && practiceMode) {
      handleExitPracticeMode();
      return;
    }

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
      
      // Handle the banner state
      if (showPracticeBanner) {
        setShowPracticeBanner(false);
      }

      // Prefix the message with practice mode indicator if in practice mode
      let messageToSend = content;
      if (practiceMode && !content.startsWith('practice:')) {
        messageToSend = `practice: ${content}`;
      }

      // Send to API
      console.log('Sending message to API:', messageToSend);
      const response = await conversationApi.sendMessage(
        currentConversation.conversationId,
        messageToSend
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
      
      // Check if this is a practice mode offer and show banner if needed
      if (detectPracticeModeOffer(assistantMessage.content)) {
        setShowPracticeBanner(true);
      }
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
          {showPracticeBanner && (
            <div className="bg-blue-50 dark:bg-blue-900 p-4 border-b border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    {practiceMode ? 'Practice Mode Active' : 'Practice Mode Offered'}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    {practiceMode 
                      ? `EVA is currently role-playing as a ${managerType} manager. Type "exit practice mode" to return to normal conversation.` 
                      : `EVA is offering to role-play as a ${managerType} manager to help you practice. Reply with "yes" to start practice mode.`}
                  </p>
                </div>
                <button 
                  onClick={() => setShowPracticeBanner(false)} 
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <span>×</span>
                </button>
              </div>
            </div>
          )}
          
          <div className="flex-1 overflow-hidden">
            <MessageList 
              messages={messages.length > 0 ? messages : [getWelcomeMessage()]} 
              loading={loading}
              practiceMode={practiceMode}
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
              Welcome to EVA
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