import React, { useState, useEffect, Dispatch, SetStateAction, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useStore, ManagerType } from '@/store/useStore';
import { Role } from '@/types/index';
import { Message } from '@/types/conversation';
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
import { getManagerType } from '@/services/api';

// Extended ConversationContentResponseDTO with additional fields from backend
interface ExtendedConversationDTO extends ConversationContentResponseDTO {
  userQuery?: string;
  agentResponse?: string;
  isUserMessage?: boolean;
  isLoading?: boolean;
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

// Define props for ChatWindow
interface ChatWindowProps {
  showKnowledgePanel: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ showKnowledgePanel }) => {
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
  // Add state for practice mode
  const [practiceMode, setPracticeMode] = useState(false);
  const [activeManagerType, setActiveManagerType] = useState<string | undefined>(undefined);
  
  // Add a ref to track if feedback is being processed
  const isProcessingFeedback = useRef(false);
  
  // Create a ref to the handleSendMessage function to use in the useEffect
  const handleSendMessageRef = useRef<(content: string) => Promise<void>>();
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storeMessages]);

  // Load messages when conversation changes
  useEffect(() => {
    // Don't fetch if feedback is being processed
    if (isProcessingFeedback.current) {
      console.log('Skipping fetchMessages because feedback is processing.');
      return;
    }
    
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
      // ALWAYS check for exact saved messages in localStorage first
      const exactSavedMessages = localStorage.getItem(`exact_messages_${currentConversation.conversationId}`);
      if (exactSavedMessages) {
        try {
          const parsedMessages = JSON.parse(exactSavedMessages);
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            console.log('Using exact saved messages from localStorage - these will not change after refresh');
            setMessages(parsedMessages);
            setIsRefreshing(false);
            setError(null);
            return; // Exit early - don't fetch from API
          }
        } catch (parseErr) {
          console.error('Error parsing exact saved messages:', parseErr);
        }
      }
      
      // If we get here, no exact messages were found, proceed with API fetch
      console.log('No exact saved messages found in localStorage, fetching from API');
      const response = await api.get(`/api/v1/conversation/message/${currentConversation.conversationId}`);
      if (Array.isArray(response.data)) {
        console.log("Raw messages from API:", response.data); // Log raw API data
        const messages = response.data.flatMap((msg: any) => {
          const messageArray: Message[] = []; // Renamed inner variable
          
          // Handle old format (userQuery/agentResponse)
          if (msg.userQuery) {
            messageArray.push({
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
              const assistantMsg: Message = {
                id: uuidv4(),
                role: 'assistant',
                content: msg.agentResponse,
                conversationId: currentConversation.conversationId,
                createdAt: msg.createdAt,
              };
              messageArray.push(assistantMsg);
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
                const assistantMsg: Message = {
                  id: msg.id || uuidv4(),
                  role: msg.role,
                  content: msg.content,
                  conversationId: currentConversation.conversationId,
                  createdAt: msg.createdAt,
                };
                messageArray.push(assistantMsg);
              } else {
                console.log("Filtered out default assistant response (new format)");
              }
            } else {
              // Add non-assistant messages as normal
              const otherMsg: Message = {
                id: msg.id || uuidv4(),
                role: msg.role,
                content: msg.content,
                conversationId: currentConversation.conversationId,
                createdAt: msg.createdAt
              };
              messageArray.push(otherMsg);
            }
          }
          
          return messageArray;
        });
        
        console.log("Processed messages to set in state:", messages); // Log messages before setting state
        // Only update messages if we got new ones and they're different
        if (messages.length > 0) {
          // Check if the new messages are different from existing ones
          const currentMessageContents = storeMessages.map(m => `${m.role}:${m.content}`).join('|');
          const newMessageContents = messages.map(m => `${m.role}:${m.content}`).join('|');
          
          // Only update the UI if the messages have actually changed
          if (currentMessageContents !== newMessageContents) {
            console.log('Updating messages with new content from server');
            setMessages(messages);
          } else {
            console.log('Messages unchanged, preserving current state');
          }
          setError(null); // Clear any previous errors on successful fetch
        } else {
          console.log('No messages received from server');
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
    const updatedMessages = [...storeMessages, userMessage];
    setMessages(updatedMessages);
    
    try {
      // If this is a draft conversation, create a real conversation first
      let conversationId = currentConversation?.conversationId;
      // Generate a meaningful title from the first message
      const messageTitle = content.length > 50 ? content.substring(0, 50) + '...' : content;

      // For better persistence, always create a new conversation if we're in a draft state
      if (!conversationId || conversationId.startsWith('draft-')) {
        try {
          console.log('Creating new conversation for message');
          // Log token information (redacted for security)
          const token = localStorage.getItem('token');
          if (token) {
            console.log('Token available for conversation creation:', token.substring(0, 10) + '...');
          } else {
            console.warn('No token available for conversation creation!');
          }
          
          const response = await api.post<CreateConversationResponse>('/api/v1/conversation', {
            title: messageTitle,
            managerType: getManagerType() 
          });
          
          if (response.data && response.data.conversationId) {
            conversationId = response.data.conversationId;
            console.log('Created new conversation:', conversationId);
            
            // Save conversation ID to localStorage as backup
            try {
              localStorage.setItem('current_conversation_id', conversationId);
              console.log('Saved conversation ID to localStorage:', conversationId);
            } catch (e) {
              console.error('Error saving conversation ID to localStorage:', e);
            }
            
            // Update the current conversation 
            setCurrentConversation({
              conversationId: conversationId,
              title: messageTitle,
              createdAt: response.data.createdAt || new Date().toISOString(),
              managerType: getManagerType(),
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
          } else {
            console.error('Conversation creation response missing conversation ID:', response.data);
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

      // Send message to backend only if content is not empty
      if (content.trim()) {
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
          userQuery: content,
          content: content
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
                  id: messages.find(m => m.role === 'user')?.id || userMessage.id,
                  conversationId: conversationId // Ensure the conversation ID is set correctly
                },
                agentMessage
              ]);
            
            setMessages(updatedMessages);
            
            // Store messages in localStorage as backup to ensure consistency on page refresh
            try {
              // Store with a special "exact" key prefix to indicate these shouldn't change
              localStorage.setItem(`exact_messages_${conversationId}`, JSON.stringify(updatedMessages));
              console.log(`Saved exact response to localStorage for conversation ${conversationId}`);
            } catch (e) {
              console.error('Error storing messages in localStorage:', e);
            }
          } else {
            console.error('No assistant message or content in response', assistantMessage);
            setError('Received an empty response from the agent.');
          }
        } else {
          console.error('Unexpected response format:', response.data);
          setError('Received an unexpected response format from the agent.');
        }
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

  // Update the ref whenever handleSendMessage changes
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [storeMessages]);
  
  // Use useEffect to check for practice feedback requests
  useEffect(() => {
    const handlePracticeFeedbackRequest = async () => {
      // Prevent running if already processing
      if (isProcessingFeedback.current) {
        console.log('Feedback request already in progress, skipping.');
        return;
      }
      
      isProcessingFeedback.current = true;
      console.log('Practice feedback request event received and processing started.');
      
      // Get the complete practice data from localStorage
      const practiceData = localStorage.getItem('practice_data');
      const feedbackRequest = localStorage.getItem('feedbackRequest');
      console.log('DEBUG - localStorage keys:', Object.keys(localStorage));
      console.log('DEBUG - practice_data exists:', !!practiceData);
      console.log('DEBUG - feedbackRequest exists:', !!feedbackRequest);
      
      try {
        if (feedbackRequest) {
          console.log('Found feedback request:', feedbackRequest);
          
          // Create properly typed messages
          const userMessage: Message = {
            id: `user-practice-${Date.now()}`,
            role: 'user' as Role,
            content: feedbackRequest,
            conversationId: currentConversation?.conversationId || '',
            createdAt: new Date().toISOString()
          };
          
          // Parse practice data if available
          let parsedData = null;
          let managerType = "unknown";
          let finalScore = 0;
          let completeFeedbackPrompt = null;
          
          if (practiceData) {
            try {
              parsedData = JSON.parse(practiceData);
              managerType = parsedData.managerType || "unknown";
              finalScore = parsedData.finalScore || 0;
              completeFeedbackPrompt = parsedData.completeFeedbackPrompt || null;
              console.log('Parsed full feedback prompt:', completeFeedbackPrompt?.substring(0, 100) + '...');
              console.log('Actual practice score:', finalScore);
            } catch (e) {
              console.error('Error parsing practice data:', e);
            }
          }
          
          // Add the user message to the UI first - DO THIS IMMEDIATELY
          // This ensures the user's message appears even if the rest fails
          const updatedMessages = [...storeMessages, userMessage];
          setMessages(updatedMessages);
          
          // Update messages state to include the loading indicator
          const loadingMessage: Message = {
            id: `assistant-loading-${Date.now()}`,
            role: 'assistant' as Role,
            content: 'Processing your practice feedback... This may take up to 30 seconds for a detailed response.',
            conversationId: currentConversation?.conversationId || '',
            createdAt: new Date().toISOString(),
            isLoading: true
          };
          
          // Update messages state to include the loading indicator
          const messagesWithLoading = [...updatedMessages, loadingMessage];
          setMessages(messagesWithLoading);
          
          // Show loading indicator visually
          setLoading(true); 
          
          // Use the API to send the complete feedback prompt to the agent
          let maxRetries = 2;
          let retryCount = 0;
          let success = false;
          let errorMsg = '';
          let response = null;
          
          // Ensure we have a valid conversation ID
          let conversationId = currentConversation?.conversationId;
          
          // If this is a draft conversation, create a real conversation first
          if (!conversationId || conversationId.startsWith('draft-')) {
            const title = `Practice Feedback - ${managerType} Manager`;
            try {
              const createResponse = await api.post<CreateConversationResponse>('/api/v1/conversation', {
                title: title,
                managerType: getManagerType()
              });
              
              if (createResponse.data && createResponse.data.conversationId) {
                conversationId = createResponse.data.conversationId;
                console.log('Created new conversation for practice feedback:', conversationId);
                
                // Update the current conversation
                setCurrentConversation({
                  conversationId: conversationId,
                  title: title,
                  createdAt: createResponse.data.createdAt || new Date().toISOString(),
                  managerType: getManagerType(),
                });
                
                // Update user message with real conversation ID
                userMessage.conversationId = conversationId;
              }
            } catch (err) {
              console.error('Error creating conversation for practice feedback:', err);
              // Continue with existing conversation ID
            }
          }
          
          // Verify we have a valid query to send
          const queryContent = completeFeedbackPrompt || feedbackRequest;
          if (!queryContent || queryContent.trim() === '') {
            throw new Error('No valid content to send to the agent');
          }
          
          console.log('Sending to agent API, prompt length:', queryContent.length);
          console.log('First 100 chars of prompt:', queryContent.substring(0, 100) + '...');
          
          // Try making the request with retries
          while (retryCount <= maxRetries && !success) {
            if (retryCount > 0) {
              console.log(`Retry attempt ${retryCount} of ${maxRetries}...`);
            }
            
            try {
              // Make the actual API request with a longer timeout
              response = await Promise.race([
                api.post<MessageResponse>(
                  `/api/v1/conversation/message`, 
                  {
                    conversationId: conversationId,
                    userQuery: queryContent,
                    content: queryContent
                  }
                ),
                new Promise<null>((_, reject) => 
                  setTimeout(() => reject(new Error('Request timeout')), 30000)
                )
              ]);
              
              // If we reach here, the request succeeded
              success = true;
            } catch (error) {
              console.error(`API request attempt ${retryCount + 1} failed:`, error);
              errorMsg = error instanceof Error ? error.message : 'Unknown error';
              retryCount++;
              
              // Wait before retrying (exponential backoff)
              if (retryCount <= maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
          
          // Process the response or show error
          if (success && response && response.status === 200 && response.data) {
            try {
              console.log('Agent API response received:', response.status);
              
              if (!response.data.messages || !Array.isArray(response.data.messages)) {
                console.error('Response missing messages array:', response.data);
                throw new Error('Invalid response format from agent API');
              }
              
              // Find the assistant message
              const assistantMessage = response.data.messages.find(m => m.role === 'assistant');
              
              if (assistantMessage && assistantMessage.content) {
                console.log('Received agent message content length:', assistantMessage.content.length);
                console.log('First 100 chars of response:', assistantMessage.content.substring(0, 100) + '...');
                
                // Create proper message structure for the agent response
                const agentMessage: Message = {
                  id: assistantMessage.id || `assistant-practice-${Date.now() + 1}`,
                  role: 'assistant' as Role,
                  content: assistantMessage.content,
                  conversationId: conversationId || '',
                  createdAt: assistantMessage.createdAt || new Date().toISOString(),
                };
                
                // Update state: Remove loading message and add agent response
                setMessages([...messagesWithLoading, agentMessage]);
              } else {
                throw new Error('No assistant message or empty content in response');
              }
            } catch (error) {
              console.error('Error processing successful API response:', error);
              setError('Error processing the agent response. Please try again.');
            }
          } else {
            console.error('API request failed after retries');
            setError('Failed to get a response from the agent. Please try again.');
          }
          
          // Clean up localStorage whether or not the API request succeeded
          localStorage.removeItem('practice_data');
          localStorage.removeItem('feedbackRequest');
        }
      } catch (error) {
        console.error('Error handling practice feedback:', error);
        setError('There was an error processing your practice feedback. Please try again.');
      } finally {
        // Always reset loading and processing flags
        setLoading(false);
        isProcessingFeedback.current = false;
      }
    };

    // Check on mount if there's a pending feedback request
    const practiceData = localStorage.getItem('practice_data');
    const feedbackRequest = localStorage.getItem('feedbackRequest');
    
    if ((practiceData || feedbackRequest) && handleSendMessageRef.current) {
      console.log('Found practice data or feedback request on mount');
      // Give more time on initial load to ensure everything is initialized
      setTimeout(() => {
        handlePracticeFeedbackRequest();
      }, 1500);
    }

    // Listen for future feedback requests
    window.addEventListener('practice-feedback-request', handlePracticeFeedbackRequest);
    
    return () => {
      window.removeEventListener('practice-feedback-request', handlePracticeFeedbackRequest);
    };
  }, []);

  const renderMessage = (message: Message, index: number) => {
    const isUserMessage = message.role === 'user';
    const isFirstMessage = index === 0;
    
    // Check if the message contains the practice prompt question - improve detection with more flexibility
    const hasPracticePrompt = !isUserMessage && (
      message.content.includes("Would you like to practice this scenario with simulated manager responses? (yes/no)") ||
      message.content.includes("Would you like to practice this scenario with simulated manager responses?") ||
      message.content.includes("Would practicing a discussion around this be helpful?") ||
      message.content.includes("Would practicing a discussion") ||
      message.content.includes("Would you like to practice how to") ||
      message.content.includes("Would you like to try a practice scenario") ||
      (message.content.includes("practice this scenario") && message.content.includes("simulated manager"))
    );
    
    // If it has the practice prompt, remove it from the displayed content
    let displayContent = message.content;
    
    if (hasPracticePrompt) {
      // Remove all variations of the practice prompt question
      displayContent = message.content
        .replace("Would you like to practice this scenario with simulated manager responses? (yes/no)", "")
        .replace("Would you like to practice this scenario with simulated manager responses?", "")
        .replace("Would practicing a discussion around this be helpful?", "")
        .replace(/\n*Would practicing a discussion.*be helpful\?/g, "")
        .replace(/\n*Would you like to try a practice scenario.*\?/g, "")
        .replace(/\n*Would you like to practice how to.*\?/g, "")
        .replace(/\n*If needed, would you like to practice this scenario with simulated manager responses\?/g, "")
        .trim();
    }
    
    return (
      <div 
        key={message.id} 
        className={`flex flex-col ${isUserMessage ? 'items-end' : 'items-start'} mb-4 ${isFirstMessage ? 'mt-6' : ''}`}
      >
        <div className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'} w-full`}>
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
                {displayContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
        
        {/* Add practice module buttons if this is an assistant message with the practice prompt */}
        {hasPracticePrompt && (
          <div className="mt-3 ml-8 flex gap-2">
            <button
              onClick={() => handlePracticeResponse('yes')}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm"
            >
              Yes, practice with simulated manager
            </button>
            <button
              onClick={() => handlePracticeResponse('no')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md transition-colors text-sm"
            >
              No, not now
            </button>
          </div>
        )}
      </div>
    );
  };

  // Update the handlePracticeResponse function
  const handlePracticeResponse = (response: 'yes' | 'no') => {
    if (response === 'yes') {
      // Get the most recent user message and agent response
      const recentUserMessage = storeMessages.find(m => m.role === 'user');
      const recentAgentMessage = storeMessages.find(m => m.role === 'assistant');
      
      if (recentUserMessage && recentAgentMessage) {
        console.log('Setting up practice mode with:', recentUserMessage.content);
        
        // Store the query and response in localStorage for the practice module to use
        localStorage.setItem('practice_user_query', recentUserMessage.content);
        localStorage.setItem('practice_agent_response', recentAgentMessage.content);
        
        // Set active manager type based on conversation
        const activeManagerType = currentConversation?.managerType || 'PUPPETEER';
        localStorage.setItem('practice_manager_type', activeManagerType);
        setActiveManagerType(activeManagerType);
        
        // Enter practice mode
        setPracticeMode(true);
      } else {
        // Handle edge case - no prior messages found
        console.error('No recent messages found for practice mode');
        setError('Could not find conversation content for practice. Please try sending a message first.');
      }
    } else {
      // User chose not to practice, acknowledge their choice
      handleSendMessage('I understand, let me know if you need any further ethical guidance.');
    }
  };

  // Add a handler for exiting practice mode
  const handleExitPracticeMode = () => {
    setPracticeMode(false);
    setActiveManagerType(undefined);
    
    // Refresh messages when returning to chat
    if (currentConversation && !currentConversation.conversationId.startsWith('draft-')) {
      fetchMessages();
    }
  };

  // Render practice module or chat interface based on practice mode state
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {practiceMode && activeManagerType ? (
        <div className="flex-1 overflow-y-auto">
          <PracticeModule 
            onExit={handleExitPracticeMode}
            managerType={activeManagerType}
          />
        </div>
      ) : (
        <>
          {/* Give messages container even more width */}
          <div className="flex-1 overflow-y-auto px-4 w-full">
            <div className="w-full max-w-5xl mx-auto">
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
              {storeMessages.map((message, index) => renderMessage(message, index))}
              {loading && (
                <div className="flex justify-start mb-4">
                  <div className="flex-shrink-0 mr-2">
                    <img src={darkMode ? logoDark : logoLight} alt="EVA" className="w-6 h-6" />
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 w-auto">
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
            showKnowledgePanel={showKnowledgePanel}
          />
        </>
      )}
    </div>
  );
}; 