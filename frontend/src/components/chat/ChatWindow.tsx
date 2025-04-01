import React, { useState, useEffect, Dispatch, SetStateAction, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useStore, Message as StoreMessage, Role, ManagerType } from '@/store/useStore';
import { conversationApi } from '@/services/api';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationContentResponseDTO } from '@/types/api';
import PracticeModule from '../practice/PracticeModule';
import { BookOpen, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/axiosConfig';
import ReactMarkdown from 'react-markdown';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';

// Extended ConversationContentResponseDTO with additional fields from backend
interface ExtendedConversationDTO extends ConversationContentResponseDTO {
  userQuery?: string;
  agentResponse?: string;
  isUserMessage?: boolean;
  isLoading?: boolean;
}

// Extend the store Message type to include optional fields needed in this component
interface Message extends Omit<StoreMessage, 'role'> {
  id: string;
  role: Role;
  content: string;
  conversationId: string;
  createdAt: string;
}

// Add a new interface for the updated response format
interface MessageResponseDTO {
  messages: Message[];
}

interface APIResponse {
  messages: Message[];
}

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  renderMessage: (message: Message) => JSX.Element;
}

type SetMessagesAction = Dispatch<SetStateAction<Message[]>>;

type MessageUpdater = (messages: Message[]) => Message[];

// Add this with the other interfaces at the top
interface CreateConversationResponse {
  conversationId: string;
  title: string;
  createdAt: string;
}

// Add this interface with the other interfaces at the top
interface MessageResponse {
  messages: {
    id?: string;
    role: Role;
  content: string;
    conversationId?: string;
    createdAt?: string;
  }[];
  warning?: string;
  error?: string;
}

export const ChatWindow: React.FC = () => {
  const { 
    currentConversation, 
    messages: storeMessages, 
    setMessages, 
    setCurrentConversation,
    temperature,
    darkMode
  } = useStore();
  
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // In a production application, this function would be passed from a parent component
  // that manages the conversation list. We're omitting it here for simplicity.
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storeMessages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentConversation) {
        return;
      }
      
    // Don't fetch messages for draft conversations
    if (currentConversation.conversationId.startsWith('draft-')) {
        return;
      }

    fetchMessages();
  }, [currentConversation?.conversationId]);

  const fetchMessages = async () => {
    // Don't fetch messages for draft conversations
    if (!currentConversation || currentConversation.conversationId.startsWith('draft-')) {
        return;
      }

    setIsRefreshing(true);
    try {
      const response = await api.get(`/api/v1/conversation/message/${currentConversation.conversationId}`);
      if (Array.isArray(response.data)) {
        const messages = response.data.flatMap((msg: any) => {
          const messages: Message[] = [];
          
          // Handle old format (userQuery/agentResponse)
          if (msg.userQuery) {
            messages.push({
              id: msg.id || uuidv4(),
              role: 'user',
              content: msg.userQuery,
              conversationId: currentConversation.conversationId,
              createdAt: msg.createdAt
            });
          }
          
          if (msg.agentResponse) {
            // Filter out default/template responses
            const isDefaultResponse = 
              msg.agentResponse.includes("Hello! How can I assist you today with ethical decision-making in technology?") ||
              msg.agentResponse.includes("Greetings! I see you've chosen the 'PUPPETEER' style") ||
              msg.agentResponse.includes("It seems like you haven't entered a question or prompt") ||
              msg.agentResponse.includes("Feel free to ask me anything related to technology ethics");
            
            if (!isDefaultResponse) {
              messages.push({
                id: uuidv4(),
                role: 'assistant',
                content: msg.agentResponse,
                conversationId: currentConversation.conversationId,
                createdAt: msg.createdAt
              });
            } else {
              console.log("Filtered out default assistant response");
            }
          }
          
          // Handle new format (role/content)
          if (msg.role && msg.content) {
            // Filter out default/template responses for assistant messages
            if (msg.role === 'assistant') {
              const isDefaultResponse = 
                msg.content.includes("Hello! How can I assist you today with ethical decision-making in technology?") ||
                msg.content.includes("Greetings! I see you've chosen the 'PUPPETEER' style") ||
                msg.content.includes("It seems like you haven't entered a question or prompt") ||
                msg.content.includes("Feel free to ask me anything related to technology ethics");
              
              if (!isDefaultResponse) {
                messages.push({
                  id: msg.id || uuidv4(),
                  role: msg.role,
                  content: msg.content,
                  conversationId: currentConversation.conversationId,
                  createdAt: msg.createdAt
                });
              } else {
                console.log("Filtered out default assistant response (new format)");
              }
            } else {
              // Add non-assistant messages as normal
              messages.push({
                id: msg.id || uuidv4(),
                role: msg.role,
                content: msg.content,
                conversationId: currentConversation.conversationId,
                createdAt: msg.createdAt
              });
            }
          }
          
          return messages;
        });
        
        // Only update messages if we got new ones
        if (messages.length > 0) {
          setMessages(messages);
          setError(null); // Clear any previous errors on successful fetch
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Don't clear messages on error
      setError('Failed to fetch messages. Your previous messages are still visible.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add this after fetchMessages function
  const triggerSidebarRefresh = () => {
    // Create and dispatch a custom event to notify the sidebar to refresh conversations
    const refreshEvent = new Event('refresh-conversations');
    window.dispatchEvent(refreshEvent);
    console.log('Dispatched refresh-conversations event');
  };

  const handleSendMessage = async (content: string) => {
    if (loading || !content.trim()) return;

    const tempId = uuidv4();
    setLoading(true);
    setError(null);
    
    // Create user message to display immediately
    const userMessage: Message = {
      id: tempId,
      role: 'user',
        content: content,
      conversationId: currentConversation?.conversationId || 'draft-conversation',
      createdAt: new Date().toISOString(),
    };
    
    // Add user message immediately to UI
    setMessages([...storeMessages, userMessage]);
    
    try {
      // If this is a draft conversation, create a real conversation first
      let conversationId = currentConversation?.conversationId;
      // Generate a meaningful title from the first message
      const messageTitle = content.length > 50 ? content.substring(0, 50) + '...' : content;

      if (!conversationId || conversationId.startsWith('draft-')) {
        try {
          console.log('Creating new conversation for message');
          const response = await api.post<CreateConversationResponse>('/api/v1/conversation', {
            title: messageTitle,
            managerType: 'PUPPETEER' as ManagerType  // Default to PUPPETEER if not specified
          });
          
          if (response.data && response.data.conversationId) {
            conversationId = response.data.conversationId;
            console.log('Created new conversation:', conversationId);
            
            // Update the current conversation 
            setCurrentConversation({
              conversationId: conversationId,
              title: messageTitle,
              createdAt: response.data.createdAt || new Date().toISOString(),
              managerType: 'PUPPETEER' as ManagerType,
            });
            
            // Update user message with real conversation ID
            userMessage.conversationId = conversationId;
            
            // Update conversation title on the backend to ensure it persists
            try {
              await api.post(`/api/v1/conversation/${conversationId}/update-title`, {
                title: messageTitle
              });
              console.log('Conversation title updated to:', messageTitle);
              
              // Trigger sidebar refresh to update the conversation list
              triggerSidebarRefresh();
            } catch (titleErr) {
              console.error('Failed to update conversation title:', titleErr);
            }
          }
        } catch (err) {
          console.error('Error creating conversation:', err);
          // Continue with draft conversation if creation fails
          conversationId = 'draft-' + tempId;
        }
      } else if (storeMessages.length === 0) {
        // If this is the first message in an existing conversation, update its title
        try {
          await api.post(`/api/v1/conversation/${conversationId}/update-title`, {
            title: messageTitle
          });
          
          // Update the title in the local state too
          setCurrentConversation({
            ...currentConversation!,
            title: messageTitle
          });
          
          console.log('Updated title for existing conversation:', messageTitle);
          
          // Trigger sidebar refresh to update the conversation list
          triggerSidebarRefresh();
        } catch (titleErr) {
          console.error('Failed to update conversation title:', titleErr);
        }
      }
      
      // Whether or not we created a new conversation, ensure we have something
      if (!conversationId) {
        conversationId = 'draft-' + tempId;
      }

      // Send message to backend
      console.log('Sending message to conversation:', conversationId);
      
      // Log token information (redacted for security)
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Token available:', token.substring(0, 10) + '...');
      } else {
        console.warn('No token available for request!');
      }
      
      // Make API request
      const response = await api.post<MessageResponse>(`/api/v1/conversation/message`, {
        conversationId: conversationId,
        userQuery: content  // This is the required field name for the agent
      });
      
      console.log('Message API response status:', response.status);
      console.log('Message API response data structure:', Object.keys(response.data));
      
      if (response.status === 200 && response.data && response.data.messages) {
        // Check if we got a warning
        if (response.data.warning) {
          console.warn('API warning:', response.data.warning);
          setError(response.data.warning);
        }
        
        // The API should return both the user message and the agent response
        const messages = response.data.messages;
        console.log('Received messages:', messages.length);
        
        // Find the assistant message
        const assistantMessage = messages.find(m => m.role === 'assistant');
        
        if (assistantMessage && assistantMessage.content) {
          // Create proper message structure
          const agentMessage: Message = {
            id: assistantMessage.id || uuidv4(),
            role: 'assistant',
            content: assistantMessage.content,
            conversationId: conversationId,
            createdAt: assistantMessage.createdAt || new Date().toISOString(),
          };
          
          // Replace the temporary user message and add the agent response
          const updatedMessages: Message[] = storeMessages
            .filter(m => m.id !== userMessage.id)
            .concat([
              {
                ...userMessage,
                id: messages.find(m => m.role === 'user')?.id || userMessage.id
              },
              agentMessage
            ]);
          
          setMessages(updatedMessages);
        } else {
          console.error('No assistant message or content in response', assistantMessage);
          setError('Received an empty response from the agent.');
        }
      } else {
        console.error('Unexpected response format:', response.data);
        setError('Received an unexpected response format from the agent.');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Keep the user message visible but show an error
      let errorMessage = 'Failed to get a response from the agent.';
      
      if (error.response) {
        // Handle specific status codes
        const status = error.response.status;
        console.error('Error response status:', status);
        console.error('Error response data:', error.response.data);
        
        if (status === 401 || status === 403) {
          errorMessage = 'Authentication error. Please log in again.';
        } else if (status === 404) {
          errorMessage = 'The conversation could not be found.';
        } else if (status === 500) {
          errorMessage = 'The server encountered an error processing your request.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        errorMessage = 'No response received from the server. Check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      // Add a placeholder agent message for the error
      const errorAgentMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I'm sorry, I couldn't process your request. Please try again or contact support if the issue persists.",
        conversationId: currentConversation?.conversationId || 'draft-conversation',
        createdAt: new Date().toISOString(),
      };
      
      setMessages([...storeMessages, errorAgentMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isUserMessage = message.role === 'user';
    
    return (
      <div key={message.id} className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'} mb-4`}>
        {!isUserMessage && (
          <div className="flex-shrink-0 mr-2">
            <img src={darkMode ? logoDark : logoLight} alt="EVA" className="w-6 h-6" />
          </div>
        )}
        <div
          className={`
            max-w-[85%] md:max-w-[75%] p-4 rounded-lg
            ${isUserMessage 
              ? 'bg-blue-600 text-white user-message-bubble' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            }
          `}
        >
          <div className={`prose dark:prose-invert prose-sm sm:prose-base max-w-none ${
            isUserMessage ? 'text-white' : 'text-gray-900 dark:text-gray-100'
          }`}>
            <ReactMarkdown>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  };

  // Add this function to handle practice mode options
  const handlePracticeOption = (option: 'practice' | 'explore' | 'next') => {
    if (option === 'practice') {
      // Start practice mode with the current manager type
      navigate('/practice', { 
        state: { 
          managerType: currentConversation?.managerType || 'PUPPETEER',
          returnPath: '/chat'
        } 
      });
    } else if (option === 'explore') {
      // Send a message to explore different aspects
      handleSendMessage("I'd like to explore different aspects of this ethical challenge. Can you elaborate on potential impacts to users and organizational risks?");
    } else {
      // Just acknowledge and let the user ask something new
      const acknowledgementMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I understand you'd like to move on. Feel free to ask about any other ethical challenges or questions you have.",
        conversationId: currentConversation?.conversationId || 'draft-conversation',
        createdAt: new Date().toISOString(),
      };
      
      setMessages([...storeMessages, acknowledgementMessage]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              {error}
              {!currentConversation?.conversationId.startsWith('draft-') && (
                <button 
                  onClick={fetchMessages}
                  className="ml-2 underline text-red-600 dark:text-red-400 font-medium"
                >
                  Refresh
                </button>
              )}
            </div>
          )}
          {storeMessages.map(message => renderMessage(message))}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="flex-shrink-0 mr-2">
                <img src={darkMode ? logoDark : logoLight} alt="EVA" className="w-6 h-6" />
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <ChatInput 
        onSendMessage={handleSendMessage}
        isLoading={loading}
        disabled={loading}
      />
    </div>
  );
}; 