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

      if (!conversationId || conversationId.startsWith('draft-')) {
        try {
          console.log('Creating new conversation for message');
          const response = await api.post<CreateConversationResponse>('/api/v1/conversation', {
            title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            managerType: 'PUPPETEER' as ManagerType  // Default to PUPPETEER if not specified
          });
          
          if (response.data && response.data.conversationId) {
            conversationId = response.data.conversationId;
            console.log('Created new conversation:', conversationId);
            
            // Update the current conversation 
            setCurrentConversation({
              conversationId: conversationId,
              title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
              createdAt: response.data.createdAt || new Date().toISOString(),
              managerType: 'PUPPETEER' as ManagerType,
            });
            
            // Update user message with real conversation ID
            userMessage.conversationId = conversationId;
          }
        } catch (err) {
          console.error('Error creating conversation:', err);
          // Continue with draft conversation if creation fails
          conversationId = 'draft-' + tempId;
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
    const isUser = message.role === 'user';
    
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        {!isUser && (
          <div className="flex-shrink-0 mr-2">
            <img src={darkMode ? logoDark : logoLight} alt="EVA" className="w-6 h-6" />
          </div>
        )}
        <div
          className={`max-w-[80%] p-4 rounded-lg ${
            isUser
              ? 'bg-blue-500 text-white user-message-bubble'
              : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className={`prose dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-ul:text-gray-800 dark:prose-ul:text-gray-200 prose-ol:text-gray-800 dark:prose-ol:text-gray-200 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-900 prose-pre:text-gray-800 dark:prose-pre:text-gray-200 prose-code:text-gray-800 dark:prose-code:text-gray-200 max-w-none`}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 py-2 px-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {currentConversation?.title || 'New Conversation'}
        </h2>
        <button
          onClick={fetchMessages}
          disabled={isRefreshing || !currentConversation || currentConversation.conversationId.startsWith('draft-')}
          className={`p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${isRefreshing ? 'animate-spin' : ''}`}
          title="Refresh messages"
        >
          <RefreshCw size={18} />
        </button>
      </div>
    
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