import React, { useState, useEffect, useRef, Dispatch, SetStateAction, useCallback } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useStore, ManagerType, Conversation, Message } from '@/store/useStore';
import { Role } from '@/types/index';
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
import { sendMessage as apiSendMessage } from '@/services/api';

// Add custom styles for message formatting
const styles = {
  messageContent: {
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  paragraph: {
    marginBottom: '1rem',
  },
  bulletPoint: {
    marginLeft: '1.5rem',
    position: 'relative',
  },
};

// Add WebKit scrollbar styles
import './scrollbar.css';

// Extended ConversationContentResponseDTO with additional fields from backend
interface ExtendedConversationDTO extends ConversationContentResponseDTO {
  userQuery?: string;
  agentResponse?: string;
  isUserMessage?: boolean;
  isLoading?: boolean;
  managerType?: ManagerType;
  title?: string;
  preview?: string;
  modelName?: string;
  personaUsed?: string;
}

// Function to get the current persona from the store
const getCurrentPersona = (): string => {
  const managerType = useStore.getState().managerType;
  return managerType || 'PUPPETEER';
};

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
  title?: string;
  createdAt?: string;
}

// Message response interfaces
interface MessageResponse {
  content?: string;
  agentResponse?: string;
  conversationId: string;
  createdAt: string;
  messages?: Array<{
    id?: string;
    role: Role;
  content: string;
    conversationId?: string;
    createdAt?: string;
  }>;
}

interface MessagesResponse {
  messages: Message[];
  warning?: string;
  error?: string;
}

// Add this interface near the top of the file with the other interfaces
interface AgentMessagesResponse {
  messages: Array<{
    id: string;
    conversationId: string;
    role: Role;
    content: string;
    createdAt: string;
    isLoading?: boolean;
  }>;
  warning?: string | null;
  error?: string | null;
}

// Add the ApiResponseData type definition at the top of the file with other type definitions
interface ApiResponseData {
  id?: string;
  agentResponse?: string;
  content?: string;
  createdAt?: string;
  conversationId?: string;
}

// Define props for ChatWindow
interface ChatWindowProps {
  showKnowledgePanel: boolean;
  currentConversation: Conversation | null;
  setStoreMessages: Dispatch<SetStateAction<Message[]>>;
  storeMessages: Message[];
}

interface SendMessageParams {
  conversationId: string;
  userQuery: string;
  managerType: ManagerType;
  temperature: number;
}

const sendMessage = async (conversationId: string, userQuery: string, managerType: ManagerType, temperature: number) => {
  try {
    const response = await api.post<MessageResponse>('/api/v1/conversation/message', {
      conversationId,
      userQuery,
      managerType,
      temperature: temperature || 0.7
    });

    if (!response.data) {
      throw new Error('Empty response from API');
    }

    // Handle both new and old response formats
    const messageContent = response.data.content || response.data.agentResponse;
    if (!messageContent) {
      throw new Error('No message content in response');
    }

    return {
      ...response.data,
      content: messageContent
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ showKnowledgePanel, currentConversation, setStoreMessages, storeMessages }) => {
  const { 
    setCurrentConversation,
    temperature,
    darkMode,
    messages,
    setMessages,
    addMessage,
    managerType
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
  
  // Add this state and ref near the other refs and state declarations
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Track if a message is being sent to prevent auto-recovery
  const isMessageSending = useRef(false);

  // Set the ref value whenever loading changes
  useEffect(() => {
    isMessageSending.current = loading;
  }, [loading]);

  // Replace the existing scroll useEffect with this smarter version
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      // Use requestAnimationFrame to ensure DOM updates before scrolling
      requestAnimationFrame(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [storeMessages, shouldAutoScroll, loading]);

  // Update the scroll handler for better detection of user scrolling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // Only auto-scroll if user is already at or near the bottom
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollBottom = scrollTop + clientHeight;
      const isNearBottom = scrollBottom >= scrollHeight - 150; // More generous threshold
      
      if (isNearBottom !== shouldAutoScroll) {
        setShouldAutoScroll(isNearBottom);
        console.log(`Auto-scroll ${isNearBottom ? 'enabled' : 'disabled'} - user is ${isNearBottom ? 'near' : 'away from'} bottom`);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    
    // Also check scroll position after content changes
    const checkScrollPositionAfterUpdate = () => {
      requestAnimationFrame(handleScroll);
    };
    
    // Run on initial load and whenever messages change
    checkScrollPositionAfterUpdate();
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [storeMessages.length, shouldAutoScroll]);
  
  // Force scroll to bottom when sending a new message
  useEffect(() => {
    if (loading) {
      // When loading a new message, force scroll to bottom
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShouldAutoScroll(true);
      });
    }
  }, [loading]);

  // Add utility functions for state preservation
  const saveConversationState = (conversationId: string, messages: Message[]) => {
    if (!conversationId) return;
    
    try {
      // Filter out any temporary loading messages
      const cleanMessages = messages.filter(m => !m.isLoading);
      
      // Only save if we have actual messages
      if (cleanMessages.length > 0) {
        const messageData = JSON.stringify(cleanMessages);
        
        // Save to multiple formats for redundancy
        localStorage.setItem(`messages_${conversationId}`, messageData);
        localStorage.setItem(`messages-${conversationId}`, messageData);
        localStorage.setItem(`backup_messages_${conversationId}`, messageData);
        localStorage.setItem(`backup-messages-${conversationId}`, messageData);
        localStorage.setItem(`exact_messages_${conversationId}`, messageData);
        
        console.log(`Saved ${cleanMessages.length} messages for conversation ${conversationId}`);
      }
    } catch (e) {
      console.error('Failed to save conversation state:', e);
    }
  };
  
  const loadConversationState = (conversationId: string): Message[] | null => {
    if (!conversationId) return null;
    
    try {
      // Try all possible key formats for backward compatibility
      const keyFormats = [
        `messages_${conversationId}`,
        `messages-${conversationId}`,
        `backup_messages_${conversationId}`,
        `backup-messages-${conversationId}`
      ];
      
      for (const key of keyFormats) {
        const savedState = localStorage.getItem(key);
        if (savedState) {
          const messages = JSON.parse(savedState);
          if (Array.isArray(messages) && messages.length > 0) {
            console.log(`Loaded ${messages.length} messages for conversation ${conversationId} from key ${key}`);
            return messages;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load conversation state:', e);
    }
    
    return null;
  };

  // Add conversation recovery to existing useEffect
  useEffect(() => {
    // Don't fetch if feedback is being processed
    if (isProcessingFeedback.current) {
      console.log('Skipping fetchMessages because feedback is processing.');
      return;
    }
    
    if (!currentConversation) {
      console.log('No current conversation, skipping message fetch');
        return;
      }
    
    console.log('Current conversation changed to:', currentConversation.conversationId);
      
    // Try to recover messages from localStorage first
    if (currentConversation.conversationId) {
      const recoveredMessages = loadConversationState(currentConversation.conversationId);
      if (recoveredMessages && recoveredMessages.length > 0) {
        console.log('Recovered messages from localStorage for conversation', currentConversation.conversationId);
        setMessages(recoveredMessages);
        setStoreMessages(recoveredMessages); // Also update storeMessages to ensure UI reflects state
        return;
      } else {
        console.log('No messages in localStorage for conversation', currentConversation.conversationId);
      }
      }
      
    // Don't fetch messages for draft conversations
    if (currentConversation.conversationId.startsWith('draft-')) {
      console.log('Draft conversation, not fetching messages');
        return;
      }

    // For real conversations with no recovered messages, fetch from API
    console.log('Fetching messages from API for conversation', currentConversation.conversationId);
    fetchMessages();
  }, [currentConversation?.conversationId]);

  // Add debug logging
  useEffect(() => {
    console.log('Current conversation:', currentConversation);
    console.log('Store messages:', storeMessages);
    console.log('Messages length:', messages.length);
  }, [currentConversation, storeMessages, messages.length]);

  const fetchMessages = async () => {
    console.log('Fetching messages for conversation:', currentConversation?.conversationId);
    
    if (!currentConversation || currentConversation.conversationId.startsWith('draft-')) {
      console.log('Skipping message fetch - no conversation or draft conversation');
        return;
      }

    setIsRefreshing(true);
            setError(null);

    try {
      // Try to get messages from localStorage first
      const cachedMessages = loadConversationState(currentConversation.conversationId);
      if (cachedMessages && cachedMessages.length > 0) {
        console.log('Using cached messages from localStorage');
        setMessages(cachedMessages);
        setStoreMessages(cachedMessages); // Also update storeMessages to ensure UI displays correctly
        setIsRefreshing(false);
        return;
      }

      // Log API request attempt
      console.log('Attempting to fetch messages from API...');
      
      try {
        // The backend returns an array of ConversationContentResponseDTO, not a MessagesResponse object
        const response = await api.get<ConversationContentResponseDTO[]>(`/api/v1/conversation/message/${currentConversation.conversationId}`);
        console.log('API Response raw data:', response.data);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          // Add more detailed logging for debugging
          response.data.forEach((dto, index) => {
            console.log(`Message ${index + 1} fields:`, {
              id: dto.id,
              role: dto.role,
              content: dto.content ? `${dto.content.substring(0, 50)}...` : 'undefined',
              userQuery: dto.userQuery ? `${dto.userQuery.substring(0, 50)}...` : 'undefined',
              agentResponse: dto.agentResponse ? `${dto.agentResponse.substring(0, 50)}...` : 'undefined',
              conversationId: dto.conversationId
            });
          });
          
          // Direct mapping from response array to Message[]
          const formattedMessages: Message[] = response.data.map(dto => ({
            id: dto.id || uuidv4(),
            role: dto.role as Role,
            content: dto.content || dto.userQuery || dto.agentResponse || '',
            conversationId: dto.conversationId || currentConversation.conversationId,
            createdAt: dto.createdAt || new Date().toISOString()
          }));

          console.log('Formatted messages:', formattedMessages);
          setMessages(formattedMessages);
          setStoreMessages(formattedMessages);
          
          // Save to localStorage for future use
          saveConversationState(currentConversation.conversationId, formattedMessages);
            } else {
          console.warn('No messages returned from API or empty array');
          setMessages([]);
          setStoreMessages([]);
        }
      } catch (apiError) {
        console.error('Error fetching from API:', apiError);
        setError('Failed to load messages from API. Please try again.');
        
        // Try one more time to recover from localStorage before giving up
        const lastResortMessages = loadConversationState(currentConversation.conversationId);
        if (lastResortMessages && lastResortMessages.length > 0) {
          console.log('API failed but recovered messages from localStorage');
          setMessages(lastResortMessages);
          setStoreMessages(lastResortMessages);
              } else {
          setMessages([]);
          setStoreMessages([]);
        }
      }
    } catch (error) {
      console.error('Error in fetchMessages function:', error);
      setError('Failed to load messages. Please try again.');
      setMessages([]);
      setStoreMessages([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add auto-recovery for messages - run more frequently and be more aggressive
  useEffect(() => {
    // Skip recovery if feedback is being processed
    if (isProcessingFeedback.current) {
      console.log('Auto-recovery skipped: practice feedback is processing');
      return;
    }
    
    // Check periodically if messages disappeared and recover them
    const intervalId = setInterval(() => {
      // Skip recovery if loading is true (message is being sent)
      if (isMessageSending.current) {
        console.log('Auto-recovery skipped: message is being sent');
        return;
      }
      
      if (currentConversation?.conversationId) {
        // Check if messages are empty or if storeMessages are empty
        if (messages.length === 0 || storeMessages.length === 0) {
          console.log('State check: messages are empty! Attempting recovery...');
          const recoveredMessages = loadConversationState(currentConversation.conversationId);
          if (recoveredMessages && recoveredMessages.length > 0) {
            console.log('Auto-recovery: found and restored', recoveredMessages.length, 'messages');
            setMessages(recoveredMessages);
            setStoreMessages(recoveredMessages);
          } else if (!currentConversation.conversationId.startsWith('draft-')) {
            // If no messages in localStorage and not a draft, try API
            console.log('No messages in localStorage, forcing API refresh');
            fetchMessages();
          }
        } else if (messages.length > 0 && storeMessages.length === 0) {
          // Fix state sync issues between messages and storeMessages
          console.log('Syncing storeMessages with messages');
          setStoreMessages([...messages]);
        } else if (storeMessages.length > 0 && messages.length === 0) {
          // Fix state sync issues between messages and storeMessages
          console.log('Syncing messages with storeMessages');
          setMessages([...storeMessages]);
        }
      }
    }, 1000); // Check every second for more responsive recovery
    
    return () => clearInterval(intervalId);
  }, [currentConversation?.conversationId, messages.length, storeMessages.length]);

  // Update the useEffect for checking practice feedback in localStorage
  useEffect(() => {
    // Skip check if feedback is already processing
    if (isProcessingFeedback.current) {
      console.log('Practice feedback check skipped: feedback is processing');
      return;
    }
    
    // Check for practice data that needs to be displayed in the current conversation
    const checkForPracticeFeedback = () => {
      const practiceToChat = localStorage.getItem('practice_to_chat') === 'true';
      const feedbackPrompt = localStorage.getItem('feedbackRequest') || localStorage.getItem('practice_feedback_prompt');
      const returningFromPractice = localStorage.getItem('returning_from_practice') === 'true';
      
      // Log all practice-related data for debugging
      console.log('Practice feedback check:', {
        practiceToChat,
        hasFeedbackPrompt: !!feedbackPrompt,
        returningFromPractice,
        currentConversationId: currentConversation?.conversationId
      });
      
      // If we have a returning_from_practice flag and a current conversation
      if (returningFromPractice && currentConversation?.conversationId) {
        console.log('Processing returning from practice...');
        
        // Load existing messages for this conversation to ensure we don't lose them
        const existingMessages = loadConversationState(currentConversation.conversationId) || [];
        
        if (existingMessages.length > 0) {
          console.log(`Loaded ${existingMessages.length} existing messages from conversation`);
          setMessages(existingMessages);
          setStoreMessages(existingMessages);
        }
        
        // Clear the flag after processing
        localStorage.removeItem('returning_from_practice');
      }
      
      // If we find evidence of a pending practice feedback request
      if (practiceToChat && feedbackPrompt && !isProcessingFeedback.current) {
        console.log('Found practice feedback request, processing...');
        
        // Make sure we've loaded existing messages before processing feedback
        const currentConvId = currentConversation?.conversationId;
        if (currentConvId) {
          // Try to load existing messages if the current message list is empty
          if (messages.length === 0) {
            const existingMessages = loadConversationState(currentConvId);
            if (existingMessages && existingMessages.length > 0) {
              console.log(`Loaded ${existingMessages.length} existing messages before processing feedback`);
              setMessages(existingMessages);
              setStoreMessages(existingMessages);
            }
          }
        }
        
        // Trigger feedback processing
        setTimeout(() => {
          const event = new Event('practice-feedback-request');
          window.dispatchEvent(event);
        }, 500); // Small delay to ensure messages are loaded first
      }
    };
    
    // Run the check once when the component mounts or conversation changes
    checkForPracticeFeedback();
    
    // Set up interval to check for feedback requests
    const checkInterval = setInterval(checkForPracticeFeedback, 2000);
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [currentConversation?.conversationId, messages.length]);

  // Update the convertToMessage function to handle multiple content field possibilities
  const convertToMessage = (dto: ConversationContentResponseDTO): Message => {
    // First try to get content from various possible fields
    const content = dto.content || dto.agentResponse || dto.userQuery || '';
    
    return {
      id: dto.id || uuidv4(),
      role: dto.role || (dto.userQuery ? 'user' : 'assistant'),
      content: content,
      conversationId: dto.conversationId,
      createdAt: dto.createdAt || new Date().toISOString()
    };
  };

  // Enhance the triggerSidebarRefresh function to include more detail
  const triggerSidebarRefresh = (details?: { type: string, conversationId?: string, title?: string }) => {
    // Include default title and conversationId from current conversation if not provided
    const enhancedDetails = {
      type: details?.type || 'general-refresh',
      conversationId: details?.conversationId || currentConversation?.conversationId,
      title: details?.title || currentConversation?.title || 'New Conversation'
    };
    
    // Create and dispatch a custom event to notify the sidebar to refresh conversations
    const refreshEvent = new CustomEvent('refresh-conversations', { 
      detail: enhancedDetails
    });
    window.dispatchEvent(refreshEvent);
    console.log('Dispatched refresh-conversations event with details:', enhancedDetails);
  };

  // Simplify message handling to ensure user messages remain visible
  const handleSendMessage = async (content: string) => {
    // Skip empty messages
    if (!content || !content.trim()) {
      return;
    }
    
    // Set loading state
    setError(null);
    setLoading(true);
    
    // Get the current conversation ID or create a draft one
    let conversationId = currentConversation?.conversationId || `draft-${uuidv4()}`;
    
    try {
      // IMPORTANT: Create a snapshot of the current messages to avoid state issues
      const currentMessagesSnapshot = [...storeMessages];
      
      // 1. Create and immediately display the user message
    const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user' as Role,
        content: content,
        conversationId: conversationId,
        createdAt: new Date().toISOString()
      };
      
      // Add to both message lists - append to existing messages
      const updatedMessagesWithUser = [...currentMessagesSnapshot, userMessage];
      setMessages(updatedMessagesWithUser);
      setStoreMessages(updatedMessagesWithUser);
      
      // Save to localStorage immediately to preserve user message
      saveConversationState(conversationId, updatedMessagesWithUser);
      
      // 2. Add a loading message - append to the messages that already include the user message
      const loadingMessage: Message = {
        id: `loading-${Date.now()}`,
        role: 'assistant' as Role,
        content: 'Thinking...',
        conversationId: conversationId,
        createdAt: new Date().toISOString(),
      isLoading: true
    };
    
      // Add loading message to UI - make sure to use the latest state that includes the user message
      const messagesWithoutLoading = messages.filter(m => 
        m.role !== 'system' || !m.content.includes('loading'));
        
        // Make sure we don't have duplicate messages
        const alreadyHasLoadingMessage = messagesWithoutLoading.some(
          m => m.id === loadingMessage.id || 
          (m.role === 'assistant' && m.content === loadingMessage.content)
        );
        
        if (!alreadyHasLoadingMessage) {
          // Add the loading message to the existing messages
          setMessages([...messagesWithoutLoading, loadingMessage]);
        } else {
          // Just use the messages without loading indicators
          setMessages(messagesWithoutLoading);
        }
      
      // 3. Send message to the API
      const activeManagerType = managerType || 'PUPPETEER' as ManagerType;
      
      interface ApiMessageResponse {
        id?: string;
        agentResponse?: string;
        conversationId: string;
        createdAt?: string;
        role?: string;
      }
      
      console.log('Sending message to API:', {
        conversationId,
        content,
        activeManagerType,
        temperature
      });
      
      const response = await apiSendMessage(
            conversationId,
        content,
        activeManagerType,
        temperature
      ) as ApiMessageResponse;
      
      console.log('API response:', response);
      
      // 4. Handle new conversation creation if needed
      if (response.conversationId && response.conversationId !== conversationId) {
        console.log('Server created a new conversation:', response.conversationId);
        conversationId = response.conversationId;
        
        // Update the current conversation
        if (setCurrentConversation) {
          const newConversation: Conversation = {
            conversationId: conversationId,
            title: 'New Conversation',
            managerType: activeManagerType,
            createdAt: new Date().toISOString()
          };
          setCurrentConversation(newConversation);
          localStorage.setItem('current-conversation-id', conversationId);
        }
      }
      
      // 5. Create the agent response message
      if (response.agentResponse) {
        const agentMessage: Message = {
          id: response.id || `assistant-${Date.now()}`,
          role: 'assistant' as Role,
          content: response.agentResponse,
          conversationId: conversationId,
          createdAt: response.createdAt || new Date().toISOString()
        };
        
        // 6. Get current messages without loading indicators - take a new snapshot to be safe
        const finalMessagesSnapshot = [...storeMessages].filter(m => !m.isLoading);
        
        // Make sure the user message is included
        if (!finalMessagesSnapshot.some(m => m.role === 'user' && m.content === content)) {
          finalMessagesSnapshot.push(userMessage);
        }
        
        // Add the agent response
        const finalUpdatedMessages = [...finalMessagesSnapshot, agentMessage];
        
        // Update UI and store
        const messageListWithoutLoading = messages.filter(m => 
          m.role !== 'system' || !m.content.includes('loading'));
            
            // Make sure we don't have duplicate messages
            const hasAgentMessage = messageListWithoutLoading.some(
              m => m.id === agentMessage.id || 
              (m.role === 'assistant' && m.content === agentMessage.content)
            );
            
            if (!hasAgentMessage) {
              // Only add if not already present
              setMessages([...messageListWithoutLoading, agentMessage]);
        } else {
              // Just remove the loading message
              setMessages(messageListWithoutLoading);
            }
        setStoreMessages(finalUpdatedMessages);
        
        // Save to localStorage
        saveConversationState(conversationId, finalUpdatedMessages);
        
        // Also save a backup copy of the messages
        try {
          const messagesJson = JSON.stringify(finalUpdatedMessages);
          localStorage.setItem(`backup_messages_${conversationId}`, messagesJson);
          localStorage.setItem(`exact_messages_${conversationId}`, messagesJson);
          console.log('Created backup copies of messages');
        } catch (e) {
          console.error('Error creating backup copies:', e);
        }
        
        // Log the state after processing
        console.log('Final message count after processing feedback:', finalUpdatedMessages.length);
        
        // Refresh sidebar
        triggerSidebarRefresh({
          type: 'new-message',
          conversationId: conversationId
        });
          } else {
        // If no agent response, remove loading message but keep user message and all previous messages
        const messagesWithoutLoading = storeMessages.filter(m => !m.isLoading);
        setMessages(messagesWithoutLoading);
        setStoreMessages(messagesWithoutLoading);
        setError('Failed to get a response. Please try again.');
      }
    } catch (error) {
      console.error('Message error:', error);
      
      // On error, just remove loading messages but keep user message and all previous messages
      const messagesWithoutLoading = storeMessages.filter(m => !m.isLoading);
      setMessages(messagesWithoutLoading);
      setStoreMessages(messagesWithoutLoading);
      
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update the ref whenever handleSendMessage changes
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  }, [storeMessages]);
  
  // Add a function to retrieve practice history in the ChatWindow component
  const getPracticeHistory = () => {
    try {
      const historyStr = localStorage.getItem('practice_history');
      if (!historyStr) return [];
      
      const history = JSON.parse(historyStr);
      return Array.isArray(history) ? history : [];
    } catch (e) {
      console.error('Error parsing practice history:', e);
      return [];
    }
  };

  // Update the chat window to handle practice feedback with a new conversation when needed
    const handlePracticeFeedbackRequest = async () => {
    // Set processing flag at the very beginning
      isProcessingFeedback.current = true;
    console.log('Set isProcessingFeedback to true');
    
    try {
      console.log('Handling practice feedback request');
      console.log('Current conversation:', currentConversation);
      console.log('Current messages count:', messages.length);
      console.log('Current store messages count:', storeMessages.length);
      
      const practiceToChat = localStorage.getItem('practice_to_chat');
      
      if (practiceToChat === 'true') {
        console.log('Practice to chat flag is true');
        
        // If we have existing messages, log them for debugging
        if (messages.length > 0) {
          console.log('Existing messages before processing feedback:');
          messages.forEach((msg, idx) => {
            console.log(`Message ${idx}: ${msg.role}, content: ${msg.content.substring(0, 30)}...`);
          });
        } else {
          console.log('No existing messages found before processing feedback');
        }
          
        // IMPORTANT: Get both the simple prompt (for UI) and the detailed prompt (for API)
        const simplePrompt = localStorage.getItem('practice_feedback_simple') || localStorage.getItem('feedbackRequest');
        const detailedPrompt = localStorage.getItem('practice_feedback_prompt');
        
        // Use the simple prompt for the UI, but the detailed one for the API
        const displayPrompt = simplePrompt;
        const apiPrompt = detailedPrompt || simplePrompt; // Fallback to simple if detailed not available
        
        const practiceManagerType = (localStorage.getItem('practice_manager_type') as ManagerType) || managerType;
        
        // CRITICAL: Force using the original conversation ID
        const forcedConversationId = localStorage.getItem('force_conversation_id');
        const originalConvId = localStorage.getItem('originalConversationId');
        const conversationId = forcedConversationId || originalConvId;
                                 
        console.log('Determined conversation ID for feedback:', conversationId);
        console.log('Sources:', { forcedConversationId, originalConvId });
        
        if (!conversationId) {
          console.error('CRITICAL ERROR: Could not determine original conversation ID for feedback. Aborting.');
          // Clear flags to prevent loops
          isProcessingFeedback.current = false;
          localStorage.removeItem('practice_to_chat');
          localStorage.removeItem('practice_feedback_prompt');
          localStorage.removeItem('practice_feedback_simple');
          localStorage.removeItem('feedbackRequest');
          localStorage.removeItem('force_conversation_id');
          setError('Could not link feedback to the original conversation. Please start a new chat.');
          return; // Stop execution
        }
        
        // Set the current conversation to the target ID *before* doing anything else
        if (setCurrentConversation) {
          // Try to get existing conversation details if possible
          const conversationsJSON = localStorage.getItem('conversations');
          let existingTitle = "Conversation";
          let existingManager = practiceManagerType;
          let existingCreatedAt = new Date().toISOString();
          
          if (conversationsJSON) {
            try {
              const conversations = JSON.parse(conversationsJSON);
              const existingConvData = conversations.find((conv: any) => conv.conversationId === conversationId);
              if (existingConvData) {
                existingTitle = existingConvData.title || existingTitle;
                existingManager = existingConvData.managerType || existingManager;
                existingCreatedAt = existingConvData.createdAt || existingCreatedAt;
              }
            } catch (e) { console.error('Error parsing conversations:', e); }
          }
          
          console.log('Setting current conversation to original ID:', conversationId);
          setCurrentConversation({
            conversationId: conversationId,
            title: existingTitle,
            managerType: existingManager,
            createdAt: existingCreatedAt,
          });
        } else {
          console.error('setCurrentConversation function is not available!');
          // Even if we can't set it in the store, proceed with the ID we have
        }
        
        // Load existing messages for this conversation
        // Use a temporary variable to avoid state update delays
        let loadedMessages = loadConversationState(conversationId);
        if (loadedMessages && loadedMessages.length > 0) {
          console.log('Loaded existing messages for original conversation:', loadedMessages.length);
          // Update UI immediately if messages were loaded
          setMessages(loadedMessages);
          setStoreMessages(loadedMessages);
        } else {
          console.log('No stored messages found for original conversation, starting fresh.');
          loadedMessages = []; // Ensure it's an empty array
          setMessages([]);
          setStoreMessages([]);
        }
        
        // Now proceed with adding the feedback request message and calling the API
        const temperature = 0.7;
        
        if (displayPrompt) {
          // Check if feedback message already exists in the loaded messages
          const feedbackExists = loadedMessages.some(m => 
            m.role === 'user' && 
            m.content.includes('practice scenario') && 
            m.content.includes('ethical decision-making score')
          );
          
          let messagesWithUserRequest = loadedMessages;
          
          if (!feedbackExists) {
            console.log('Adding new user feedback request message to UI');
            // Create a new user message with the SIMPLE feedback prompt for UI display
            const newUserMessage: Message = {
              id: crypto.randomUUID(),
                    conversationId: conversationId,
              role: 'user' as Role,
              content: displayPrompt, // Use simple prompt for display
              createdAt: new Date().toISOString(),
            };
            
            messagesWithUserRequest = [...loadedMessages, newUserMessage];
            
            // Update UI and store immediately
            setMessages(messagesWithUserRequest);
            setStoreMessages(messagesWithUserRequest);
            
            // Save conversation state
            saveConversationState(conversationId, messagesWithUserRequest);
          } else {
            console.log('Feedback request message already exists, not adding again.');
          }
          
          // Send the API request with the detailed prompt
          console.log('Sending detailed practice feedback directly to API...');
          try {
            const activeManagerType = practiceManagerType || managerType || 'PUPPETEER' as ManagerType;
            
            // Set loading state
            setLoading(true);
            
            // Call the API directly
            console.log('Calling API with detailed practice feedback prompt');
            const response = await apiSendMessage(
              conversationId, 
              apiPrompt || '',  // Ensure non-null string
              activeManagerType,
              temperature
            ) as {
              id?: string;
              agentResponse?: string;
              conversationId: string;
              createdAt?: string;
            };
            
            console.log('API response for practice feedback received from backend', response);
            
            // Now manually process the response and update state
            if (response && response.agentResponse) {
              // Create the agent response message
                const agentMessage: Message = {
                id: response.id || `assistant-${Date.now()}`,
                  role: 'assistant' as Role,
                content: response.agentResponse,
                conversationId: conversationId,
                createdAt: response.createdAt || new Date().toISOString()
              };
              
              console.log('Practice feedback agent message:', agentMessage);
              
              // Use the messages list that includes the user request as the base
              const baseMessages = messagesWithUserRequest.filter(m => !m.isLoading);
              console.log('Base messages count (including user request):', baseMessages.length);
              
              // Ensure we don't add a duplicate agent message
              const hasAgentResponseAlready = baseMessages.some(m => m.id === agentMessage.id);
              
              let finalMessages;
              if (!hasAgentResponseAlready) {
                console.log('Appending new agent feedback response message');
                finalMessages = [...baseMessages, agentMessage];
              } else {
                console.log('Agent feedback response already exists, not appending duplicate');
                finalMessages = baseMessages; // Use the list without the duplicate
              }
              
              // Direct update state without using functional form
              console.log('Setting final messages count:', finalMessages.length);
              setMessages(finalMessages);
              setStoreMessages(finalMessages);
              
              // Save to localStorage immediately in multiple formats for redundancy
              saveConversationState(conversationId, finalMessages);
              localStorage.setItem(`exact_messages_${conversationId}`, JSON.stringify(finalMessages));
              localStorage.setItem(`backup_messages_${conversationId}`, JSON.stringify(finalMessages));
              
              // Dispatch message update events
              try {
                const updateEvent = new CustomEvent('messages-updated', {
                  detail: { conversationId: conversationId }
                });
                window.dispatchEvent(updateEvent);
                console.log('Dispatched messages-updated event');
              } catch (e) {
                console.error('Error dispatching message update event:', e);
              }
              
              // Clean up flags after successful response
              localStorage.removeItem('practice_to_chat');
              localStorage.removeItem('practice_feedback_prompt');
              localStorage.removeItem('practice_feedback_simple');
              localStorage.removeItem('feedbackRequest');
              localStorage.removeItem('currentPracticeInfo');
              localStorage.removeItem('force_conversation_id');
          localStorage.removeItem('practice_data');
            } else {
              console.error('No agent response content found in practice feedback API response');
              setError('Failed to get feedback response content. Please try again.');
              // Clean up flags even if response content failed
              localStorage.removeItem('practice_to_chat');
              localStorage.removeItem('practice_feedback_prompt');
              localStorage.removeItem('practice_feedback_simple');
          localStorage.removeItem('feedbackRequest');
              localStorage.removeItem('force_conversation_id');
        }
            
      } catch (error) {
            console.error('Error sending practice feedback to API:', error);
            setError('Failed to get feedback response. Please try again.');
            // Clean up flags on error
            localStorage.removeItem('practice_to_chat');
            localStorage.removeItem('practice_feedback_prompt');
            localStorage.removeItem('practice_feedback_simple');
            localStorage.removeItem('feedbackRequest');
            localStorage.removeItem('force_conversation_id');
      } finally {
        setLoading(false);
            // Reset processing flag here AFTER all updates
        isProcessingFeedback.current = false;
            console.log('Set isProcessingFeedback to false after API call completion');
          }
          
          console.log('Practice feedback request processing finished');
        } else {
          console.error('No display prompt available, cannot process feedback request');
          // Clean up flags
          isProcessingFeedback.current = false; // Reset flag here too
          localStorage.removeItem('practice_to_chat');
          localStorage.removeItem('practice_feedback_prompt');
          localStorage.removeItem('practice_feedback_simple');
          localStorage.removeItem('feedbackRequest');
          localStorage.removeItem('force_conversation_id');
        }
      } // End of if (practiceToChat === 'true')
    } catch (error) {
      console.error('Error in handlePracticeFeedbackRequest:', error);
      setError('An error occurred while processing feedback.');
      // Clean up flags on outer error
      localStorage.removeItem('practice_to_chat');
      localStorage.removeItem('practice_feedback_prompt');
      localStorage.removeItem('practice_feedback_simple');
      localStorage.removeItem('feedbackRequest');
      localStorage.removeItem('force_conversation_id');
    } finally {
      // Ensure the flag is always reset if it hasn't been already
      if (isProcessingFeedback.current) {
          isProcessingFeedback.current = false;
          console.log('Set isProcessingFeedback to false in outer finally block');
      }
    }
  };

  // Add a listener for the practice-feedback-request event
  useEffect(() => {
    const handlePracticeFeedbackEvent = () => {
      console.log('🎯 Practice feedback event received, triggering feedback request handler');
      handlePracticeFeedbackRequest();
    };
    
    window.addEventListener('practice-feedback-request', handlePracticeFeedbackEvent);
    
    // Check for practice feedback request on component mount
    const practiceToChat = localStorage.getItem('practice_to_chat');
    if (practiceToChat === 'true') {
      console.log('Found practice_to_chat flag on mount, processing feedback request');
        handlePracticeFeedbackRequest();
    }
    
    return () => {
      window.removeEventListener('practice-feedback-request', handlePracticeFeedbackEvent);
    };
  }, []);

  // Check for practice feedback request from localStorage
  useEffect(() => {
    // Skip check if feedback is already processing
    if (isProcessingFeedback.current) {
      console.log('Practice feedback check skipped: feedback is processing');
      return;
    }
    
    // Check if we have a practice_to_chat flag
    const practiceToChat = localStorage.getItem('practice_to_chat');
    const feedbackPrompt = localStorage.getItem('feedbackRequest') || localStorage.getItem('practice_feedback_prompt');
    
    // IMPORTANT: Check multiple sources for the conversation ID
    const forcedConversationId = localStorage.getItem('force_conversation_id');
    const feedbackConversationId = forcedConversationId || 
                              localStorage.getItem('originalConversationId') || 
                              localStorage.getItem('current-conversation-id') || 
                              localStorage.getItem('currentConversationId');
    
    console.log('Practice feedback check in useEffect:', {
      practiceToChat,
      currentConversationId: currentConversation?.conversationId,
      feedbackConversationId,
      forcedConversationId,
      hasFeedbackPrompt: !!feedbackPrompt
    });
    
    if (practiceToChat === 'true' && feedbackPrompt && feedbackConversationId) {
      console.log('⚠️ Detected practice feedback request in useEffect, using conversation:', feedbackConversationId);
      isProcessingFeedback.current = true;
      
      // Important: Set current conversation if needed, but try to preserve existing info
      if (!currentConversation || currentConversation.conversationId !== feedbackConversationId) {
        console.log('Switching to feedback conversation:', feedbackConversationId);
        
        // Get existing conversation data from localStorage if available
        const conversationsJSON = localStorage.getItem('conversations');
        let existingTitle = "Practice Feedback";
        let existingManagerType = (localStorage.getItem('practice_manager_type') || getManagerType()) as ManagerType;
        let existingCreatedAt = new Date().toISOString();
        
        if (conversationsJSON) {
          try {
            const conversations = JSON.parse(conversationsJSON);
            const existingConversation = conversations.find((conv: any) => 
              conv.conversationId === feedbackConversationId
            );
            
            if (existingConversation) {
              console.log('Found existing conversation data:', existingConversation);
              existingTitle = existingConversation.title || existingTitle;
              existingManagerType = existingConversation.managerType || existingManagerType;
              existingCreatedAt = existingConversation.createdAt || existingCreatedAt;
            }
          } catch (e) {
            console.error('Error parsing conversations from localStorage:', e);
          }
        }
        
        // Set the current conversation with preserved data when possible
      setCurrentConversation({
        conversationId: feedbackConversationId,
          title: existingTitle,
          managerType: existingManagerType,
          createdAt: existingCreatedAt
        });
      }
      
      // First load any existing messages for this conversation - don't clear messages
      const existingMessages = loadConversationState(feedbackConversationId) || [];
      console.log('Existing conversation messages:', existingMessages.length);
      
      // Try to load pre-created feedback message from localStorage
      const exactSavedMessages = localStorage.getItem(`exact_messages_${feedbackConversationId}`);
      let feedbackMessage = null;
      
      if (exactSavedMessages) {
        try {
          const parsedMessages = JSON.parse(exactSavedMessages);
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            // Extract just the feedback message (the last one)
            feedbackMessage = parsedMessages[parsedMessages.length - 1];
            console.log('Found feedback message in localStorage:', feedbackMessage);
          }
        } catch (parseErr) {
          console.error('Error parsing saved messages for practice feedback:', parseErr);
        }
      }
      
      if (!feedbackMessage) {
        // Create a new feedback message
        feedbackMessage = {
        id: uuidv4(),
        role: 'user' as Role,
        content: feedbackPrompt,
        conversationId: feedbackConversationId,
        createdAt: new Date().toISOString()
      };
        console.log('Created new feedback message:', feedbackMessage);
      }
      
      // IMPORTANT: Don't rebuild entire message list, just add to existing messages
      // First check if we already have these messages in the UI
      if (messages.length === 0) {
        // Only load existing messages if we don't have any
        setMessages(existingMessages);
        setStoreMessages(existingMessages);
      }
      
      // Check if feedback message already exists in current messages
      const feedbackExists = messages.some(m => 
        m.role === 'user' && 
        m.content.includes('ethical decision-making score') && 
        m.content.includes('provide detailed feedback')
      );
      
      // Only add feedback message if it doesn't already exist
      if (!feedbackExists) {
        console.log('Adding feedback message to existing UI messages');
        // Add feedback message to existing messages, not replace
        const updatedMessages = [...messages, feedbackMessage];
        setMessages(updatedMessages);
        setStoreMessages(updatedMessages);
        
        // Add a loading message
        const loadingMessage: Message = {
          id: `loading-feedback-${Date.now()}`,
          role: 'assistant',
          content: 'Thinking...',
          conversationId: feedbackConversationId,
          createdAt: new Date().toISOString(),
          isLoading: true
        };
        
        // Add loading message to the UI
        const loadMessagesWithoutLoading = messages.filter(m => 
          m.role !== 'system' || !m.content.includes('loading'));
            
            // Make sure we don't have duplicate messages
            const hasLoadingMsg = loadMessagesWithoutLoading.some(
              m => m.id === loadingMessage.id || 
              (m.role === 'assistant' && m.content === loadingMessage.content)
            );
            
            if (!hasLoadingMsg) {
              // Only add if not already present
              setMessages([...loadMessagesWithoutLoading, loadingMessage]);
            } else {
              // Just remove the loading message
              setMessages(loadMessagesWithoutLoading);
            }
        setStoreMessages(updatedMessages);
        
        // Save to localStorage to prevent loss
        saveConversationState(feedbackConversationId, updatedMessages);
        
        // IMPORTANT: Send the feedback request with a more direct approach
        setTimeout(async () => {
          try {
          console.log('Sending practice feedback prompt to API');
            
            // Get the practice manager type from localStorage or use default
            const practiceManagerType = localStorage.getItem('practice_manager_type') as ManagerType | null;
            
            // We'll manually create the API call without going through the handleSendMessage function
            const activeManagerType = practiceManagerType || managerType || 'PUPPETEER' as ManagerType;
            
            // Get the detailed API prompt from localStorage
            const detailedPrompt = localStorage.getItem('practice_feedback_prompt');
            const simplePrompt = localStorage.getItem('practice_feedback_simple') || localStorage.getItem('feedbackRequest');
            
            // Use whatever prompt is available
            const apiPromptText = detailedPrompt || simplePrompt || feedbackMessage.content || '';
            
            console.log('Using API prompt with length:', apiPromptText.length);
            
            // Call the agent API using the same function as regular chat messages
            if (apiPromptText) {
              // Directly call the API to ensure the detailed data is sent
              const response = await apiSendMessage(
                feedbackConversationId,
                apiPromptText || '',
                activeManagerType,
                temperature || 0.7
              ) as {
                id?: string;
                agentResponse?: string;
                conversationId: string;
                createdAt?: string;
              };
              
              console.log('Practice feedback API response received:', response);
              
              if (response && response.agentResponse) {
                // Create the agent response message
                const agentMessage: Message = {
                  id: response.id || `assistant-${Date.now()}`,
                  role: 'assistant' as Role,
                  content: response.agentResponse,
                  conversationId: feedbackConversationId,
                  createdAt: response.createdAt || new Date().toISOString()
                };
                
                // IMPORTANT: Log the agent message
                console.log('Practice feedback agent message (secondary):', agentMessage);
                
                // IMPORTANT: Use storeMessages as the base for appending
                const baseMessages = storeMessages.filter(m => !m.isLoading);
                
                // Log the base messages count
                console.log('Base messages count (from storeMessages) (secondary):', baseMessages.length);
                
                // If base messages are empty, try recovery
                let finalBaseMessages = baseMessages;
                if (finalBaseMessages.length === 0) {
                  const recoveredMessages = loadConversationState(feedbackConversationId);
                  if (recoveredMessages && recoveredMessages.length > 0) {
                    console.log('Recovered messages again just before setting final state (secondary):', recoveredMessages.length);
                    finalBaseMessages = recoveredMessages;
                  }
                }
                
                // Ensure we don't add a duplicate agent message
                const hasAgentResponseAlready = finalBaseMessages.some(m => m.id === agentMessage.id);
                
                let finalMessages;
                if (!hasAgentResponseAlready) {
                  console.log('Appending new agent feedback response message (secondary)');
                  finalMessages = [...finalBaseMessages, agentMessage];
                } else {
                  console.log('Agent feedback response already exists, not appending duplicate (secondary)');
                  finalMessages = finalBaseMessages; // Use the list without the duplicate
                }
                
                // IMPORTANT: Direct update state
                console.log('Setting final messages count (secondary):', finalMessages.length);
                setMessages(finalMessages);
                setStoreMessages(finalMessages);
                
                // Save to localStorage immediately
                saveConversationState(feedbackConversationId, finalMessages);
                localStorage.setItem(`exact_messages_${feedbackConversationId}`, JSON.stringify(finalMessages));
                localStorage.setItem(`backup_messages_${feedbackConversationId}`, JSON.stringify(finalMessages));
                
                // Refresh sidebar
                triggerSidebarRefresh({
                  type: 'new-message',
                  conversationId: feedbackConversationId
                });
                
                // Clean up practice data
                localStorage.removeItem('practice_data');
                localStorage.removeItem('practice_feedback_prompt');
                localStorage.removeItem('practice_feedback_simple');
                localStorage.removeItem('feedbackRequest');
              } else {
                console.error('Failed to get agent response for practice feedback (secondary)');
                setError('Failed to get feedback. Please try again.');
              }
            } else {
              console.error('No API prompt available, cannot send practice feedback');
              setError('Failed to get feedback response. Please try again.');
            }
          } catch (error) {
            console.error('Error sending practice feedback:', error);
            
            // If error, remove loading messages but keep user message
            const messagesWithoutLoading = storeMessages.filter(m => !m.isLoading);
            setMessages(messagesWithoutLoading);
            setStoreMessages(messagesWithoutLoading);
            
            setError('Failed to get feedback response. Please try again.');
          } finally {
            // Clean up flags regardless of success or failure
          isProcessingFeedback.current = false;
          localStorage.removeItem('practice_to_chat');
          localStorage.removeItem('practice_feedback_prompt');
            localStorage.removeItem('practice_feedback_simple');
            localStorage.removeItem('force_conversation_id');
          }
        }, 100);
      } else {
        console.log('Feedback message already exists in UI, not adding duplicate');
        // Still clean up flags
        isProcessingFeedback.current = false;
        localStorage.removeItem('practice_to_chat');
        localStorage.removeItem('practice_feedback_prompt');
        localStorage.removeItem('practice_feedback_simple');
        localStorage.removeItem('force_conversation_id');
      }
    }
  }, [currentConversation?.conversationId, messages.length, storeMessages.length]);

  // Add a listener for forced message loading
  useEffect(() => {
    const handleForceLoadMessages = (event: Event) => {
      const customEvent = event as CustomEvent;
      const conversationId = customEvent.detail?.conversationId;
      
      console.log('Force load messages event received for conversation:', conversationId);
      
      if (conversationId && currentConversation?.conversationId === conversationId) {
        console.log('Forcing message reload from all sources');
        
        // First try to load from localStorage with all possible key formats
        const recoveredMessages = loadConversationState(conversationId);
        if (recoveredMessages && recoveredMessages.length > 0) {
          console.log('Successfully loaded messages from localStorage');
          setMessages(recoveredMessages);
        } else {
          // If no messages in localStorage, fetch from API
          console.log('No messages found in localStorage, fetching from API');
          fetchMessages();
        }
      }
    };
    
    window.addEventListener('force-load-messages', handleForceLoadMessages);
    
    return () => {
      window.removeEventListener('force-load-messages', handleForceLoadMessages);
    };
  }, [currentConversation]);

  // Add a listener for the clear-messages event
  useEffect(() => {
    const handleClearMessages = (event: Event) => {
      const customEvent = event as CustomEvent;
      const newConversationId = customEvent.detail?.conversationId;
      
      console.log('Clear messages event received for conversation:', newConversationId);
      
      // Clear both state objects
      setMessages([]);
      setStoreMessages([]);
      
      // Reset any error state
      setError(null);
      
      // If we have the new conversation ID from the event, update our state
      if (newConversationId && (!currentConversation || currentConversation.conversationId !== newConversationId)) {
        console.log('Setting up UI for new draft conversation');
      }
    };
    
    window.addEventListener('clear-messages', handleClearMessages);
    
    return () => {
      window.removeEventListener('clear-messages', handleClearMessages);
    };
  }, []);

  // Add a listener for conversation deletion events
  useEffect(() => {
    const handleConversationDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      const deletedConversationId = customEvent.detail?.conversationId;
      
      console.log('Conversation deleted event received for:', deletedConversationId);
      
      // If this is the current conversation we're viewing, clear the messages
      if (currentConversation?.conversationId === deletedConversationId) {
        console.log('Clearing messages for deleted conversation');
        setMessages([]);
        setStoreMessages([]);
        setError('This conversation has been deleted.');
      }
    };
    
    window.addEventListener('conversation-deleted', handleConversationDeleted);
    
    return () => {
      window.removeEventListener('conversation-deleted', handleConversationDeleted);
    };
  }, [currentConversation]);

  // Add new useEffect to keep track of current conversation ID in localStorage
  useEffect(() => {
    // Only update localStorage if we have a valid non-draft conversation
    if (currentConversation?.conversationId && !currentConversation.conversationId.startsWith('draft-')) {
      console.log('Setting current-conversation-id in localStorage:', currentConversation.conversationId);
      localStorage.setItem('current-conversation-id', currentConversation.conversationId);
    }
  }, [currentConversation?.conversationId]);

  // Add an additional useEffect to ensure message persistence
  useEffect(() => {
    // Skip recovery if feedback is being processed
    if (isProcessingFeedback.current) {
      console.log('Auto-recovery skipped: practice feedback is processing');
      return;
    }
    
    // This function will ensure messages don't disappear during transitions
    const ensureMessagesLoaded = () => {
      if (currentConversation?.conversationId && messages.length === 0) {
        console.log('Messages empty but conversation exists, attempting recovery');
        
        // Try to recover from localStorage first
        const storedMessages = loadConversationState(currentConversation.conversationId);
        if (storedMessages && storedMessages.length > 0) {
          console.log('Recovered messages from localStorage');
          setMessages(storedMessages);
          setStoreMessages(storedMessages);
        } else if (!currentConversation.conversationId.startsWith('draft-')) {
          // If not in localStorage and not a draft, try to fetch from API
          console.log('No stored messages found, fetching from API');
          fetchMessages();
        }
      }
    };
    
    // Run immediately
    ensureMessagesLoaded();
    
    // And set up an interval to run occasionally
    const intervalId = setInterval(ensureMessagesLoaded, 2000);
    
    return () => clearInterval(intervalId);
  }, [currentConversation?.conversationId, messages.length]);

  // Add a special effect to handle returning from practice mode
  useEffect(() => {
    // Skip check if feedback is already processing
    if (isProcessingFeedback.current) {
      console.log('Returning from practice check skipped: feedback is processing');
      return;
    }
    
    const handleReturnFromPractice = () => {
      const returningFromPractice = localStorage.getItem('returning_from_practice') === 'true';
      
      if (returningFromPractice && currentConversation?.conversationId) {
        console.log('Detected return from practice mode, reloading messages');
        
        // Try to load from localStorage first
        const storedMessages = loadConversationState(currentConversation.conversationId);
        if (storedMessages && storedMessages.length > 0) {
          console.log(`Loaded ${storedMessages.length} messages from localStorage after practice`);
          setMessages(storedMessages);
          setStoreMessages(storedMessages);
        } else if (!currentConversation.conversationId.startsWith('draft-')) {
          // If not in localStorage and not a draft, try API
          console.log('Fetching messages from API after practice');
          fetchMessages();
        }
        
        // Clear the flag
        localStorage.removeItem('returning_from_practice');
      }
    };
    
    // Run on mount and when currentConversation changes
    handleReturnFromPractice();
  }, [currentConversation?.conversationId]);

  // Add a special effect to check for pending practice feedback responses
  useEffect(() => {
    // Skip check if feedback is already processing
    if (isProcessingFeedback.current) {
      console.log('Pending response check skipped: feedback is processing');
      return;
    }
    
    const checkForPendingResponses = () => {
      // Check if we have any pending agent responses from practice feedback
      const pendingResponseStr = localStorage.getItem('last_practice_feedback_response');
      
      if (pendingResponseStr && currentConversation?.conversationId) {
        try {
          console.log('Found pending practice feedback response');
          const pendingResponse = JSON.parse(pendingResponseStr);
          
          // Make sure this response belongs to the current conversation
          if (pendingResponse.conversationId === currentConversation.conversationId) {
            console.log('Processing pending practice feedback response for current conversation');
            
            // Check if we already have a matching agent response
            const hasMatchingResponse = messages.some(msg => 
              msg.role === 'assistant' && 
              msg.id === pendingResponse.id
            );
            
            if (!hasMatchingResponse && pendingResponse.agentResponse) {
              console.log('Adding missing agent response to UI');
              
              // Create the agent message
              const agentMessage: Message = {
                id: pendingResponse.id || `assistant-${Date.now()}`,
                role: 'assistant' as Role,
                content: pendingResponse.agentResponse,
                conversationId: currentConversation.conversationId,
                createdAt: pendingResponse.createdAt || new Date().toISOString()
              };
              
              // Update messages without loading indicators
              const messagesWithoutLoading = messages.filter(m => !m.isLoading);
              
              // Add the agent message
              const updatedMessages = [...messagesWithoutLoading, agentMessage];
              setMessages(updatedMessages);
              setStoreMessages(updatedMessages);
              
              // Save to localStorage
              saveConversationState(currentConversation.conversationId, updatedMessages);
              
              // Clear the pending response
              localStorage.removeItem('last_practice_feedback_response');
            } else {
              // We already have this response or it's invalid - clear it
              localStorage.removeItem('last_practice_feedback_response');
            }
          }
        } catch (e) {
          console.error('Error processing pending response:', e);
          localStorage.removeItem('last_practice_feedback_response');
        }
      }
    };
    
    // Run immediately
    checkForPendingResponses();
    
    // And set up an interval to check periodically
    const intervalId = setInterval(checkForPendingResponses, 2000);
    
    return () => clearInterval(intervalId);
  }, [currentConversation?.conversationId, messages]);

  // Add a listener for message update events
  useEffect(() => {
    // Skip check if feedback is already processing
    if (isProcessingFeedback.current) {
      console.log('Messages updated listener skipped: feedback is processing');
      return;
    }
    
    const handleMessagesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const updatedConversationId = customEvent.detail?.conversationId;
      
      console.log('Messages updated event received for conversation:', updatedConversationId);
      
      if (updatedConversationId && currentConversation?.conversationId === updatedConversationId) {
        console.log('Messages updated for current conversation - reloading');
        
        // First try to load from localStorage with all possible key formats
        const recoveredMessages = loadConversationState(updatedConversationId);
        if (recoveredMessages && recoveredMessages.length > 0) {
          console.log('Successfully loaded updated messages from localStorage');
          setMessages(recoveredMessages);
          setStoreMessages(recoveredMessages);
        } else {
          // If no messages in localStorage, fetch from API
          console.log('No updated messages found in localStorage, fetching from API');
          fetchMessages();
        }
      }
    };
    
    window.addEventListener('messages-updated', handleMessagesUpdated);
    
    return () => {
      window.removeEventListener('messages-updated', handleMessagesUpdated);
    };
  }, [currentConversation]);

  // Add a final check for practice feedback after a delay
  useEffect(() => {
    // Skip check if feedback is already processing
    if (isProcessingFeedback.current) {
      console.log('Final feedback check skipped: feedback is processing');
      return;
    }
    
    // If we have a practice feedback request in the UI but no response, re-check after a delay
    const checkForMissingFeedbackResponse = () => {
      const hasFeedbackRequest = messages.some(m => 
        m.role === 'user' && 
        m.content.includes('practice scenario') && 
        m.content.includes('ethical decision-making score')
      );
      
      const hasFeedbackResponse = messages.some(m => 
        m.role === 'assistant' && 
        messages.findIndex(msg => 
          msg.role === 'user' && 
          msg.content.includes('practice scenario') && 
          msg.content.includes('ethical decision-making score')
        ) < messages.indexOf(m)
      );
      
      if (hasFeedbackRequest && !hasFeedbackResponse && currentConversation) {
        console.log('Found practice feedback request without response - attempting to recover');
        
        // Force load messages to ensure we have the latest state
        const forceLoadEvent = new CustomEvent('force-load-messages', {
          detail: { conversationId: currentConversation.conversationId }
        });
        window.dispatchEvent(forceLoadEvent);
      }
    };
    
    // Check after 3 seconds to allow time for the API to respond
    const timeoutId = setTimeout(checkForMissingFeedbackResponse, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [messages, currentConversation]);

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    const isSystemMessage = message.role === 'system';
    const isAssistant = message.role === 'assistant';
    const isLoading = message.isLoading === true;
    
    // Expand the condition for detecting practice feedback messages
    // Check if this is a practice feedback response
    const isPracticeFeedback = isAssistant && message.content && (
      message.content.includes("ethical decision-making score") || 
      message.content.includes("practice scenario") || 
      message.content.includes("Ethical Principles Applied") ||
      message.content.includes("Areas for Improvement") ||
      message.content.includes("Your reasoning reflects") ||
      // Look for patterns in the feedback response
      (message.content.includes("ethical") && 
       message.content.includes("score") && 
       message.content.includes("performance")) ||
      // Look for thank you messages after practice
      (message.content.includes("Thank you for sharing your practice scenario") ||
       (message.content.includes("practice") && 
        message.content.includes("scenario") && 
        message.content.includes("performance")))
    );
    
    // Check if the message contains the practice prompt question
    const hasPracticePrompt = isAssistant && 
      typeof message.content === 'string' && (
      message.content.includes("Would you like to practice this scenario with simulated manager responses?") ||
      message.content.includes("Would practicing a discussion around this be helpful?") ||
      message.content.includes("Would practicing a discussion") ||
      message.content.includes("Would you like to practice how to") ||
      message.content.includes("Would you like to try a practice scenario") ||
      (message.content.includes("practice this scenario") && message.content.includes("simulated manager")) ||
      message.content.includes("Would it help to discuss it with your team first?") ||
      message.content.includes("Have you considered bringing up these concerns")
    );
    
    // Get score value if this is a practice feedback message
    let practiceScore = 0;
    if (isPracticeFeedback) {
      const scoreMatch = message.content.match(/ethical decision-making score (?:was |is |of )(\d+)\/100/i);
      if (scoreMatch && scoreMatch[1]) {
        practiceScore = parseInt(scoreMatch[1]);
      }
    }
    
    // Only show Practice Again button for feedback responses with scores less than 100
    const shouldShowPracticeAgain = isPracticeFeedback && practiceScore > 0 && practiceScore < 100;
    
    // Format content for display
    let displayContent = '';
    
    if (typeof message.content === 'string') {
      displayContent = message.content || 'No response content';
      
      // If it's an assistant message with empty content, try to check for fallback content
      if (isAssistant && !displayContent.trim()) {
        console.warn('Empty content detected in assistant message, message ID:', message.id);
      }
      
      // For messages with practice prompts, strip out the question
    if (hasPracticePrompt) {
      displayContent = message.content
          .replace(/Would you like to practice this scenario with simulated manager responses\? \(yes\/no\)/g, "")
          .replace(/Would you like to practice this scenario with simulated manager responses\?/g, "")
          .replace(/Would practicing a discussion around this be helpful\?/g, "")
        .replace(/\n*Would practicing a discussion.*be helpful\?/g, "")
        .replace(/\n*Would you like to try a practice scenario.*\?/g, "")
        .replace(/\n*Would you like to practice how to.*\?/g, "")
        .replace(/\n*If needed, would you like to practice this scenario with simulated manager responses\?/g, "")
        .trim();
      }
      
      // Clean up practice option text that appears at the end of messages
      if (isAssistant) {
        // Remove practice option text that appears at the end
        displayContent = displayContent
          .replace(/\s*\[Yes,\s*practice\]\s*\[No,\s*not now\]\s*$/g, "")
          .replace(/\s*\[Yes, practice\]$/g, "")
          .replace(/\s*\[No, not now\]$/g, "")
          .trim();

        // Improve paragraph separation for better readability
        displayContent = displayContent
          // Add proper double line breaks between sentences that should be paragraphs
          .replace(/\.(\s*)([A-Z])/g, ".\n\n$2")
          // Remove excessive line breaks
          .replace(/\n{3,}/g, "\n\n")
          // Add space after bullet points for better formatting
          .replace(/•(\S)/g, "• $1")
          // Fix common formatting issues
          .replace(/(\d+\.)(\S)/g, "$1 $2");
      }
    } else {
      displayContent = String(message.content || 'No response content');
    }

    // Format practice feedback for better readability if this is a practice feedback message
    if (isPracticeFeedback && typeof displayContent === 'string') {
      // Add spacing between sections and make headings stand out
      displayContent = displayContent
        // Format section headers with proper spacing
        .replace(/(\n|^)(Ethical Principles Applied|Areas for Improvement|Communication Engagement|Feedback on Reasoning Process|Practical Advice|Balancing Professional Obligations|Proactive Ethical Advocacy|Your reasoning reflects)(\s*:?)/g, 
          '\n\n### $2$3')
        // Add spacing before numbered items and make them bold
        .replace(/(\n|^)([0-9]+\.\s+)([A-Z][a-z]+\s+[a-z]+\s+[A-Za-z\s]+)(:|\.)/g, 
          '\n\n**$2$3**$4')
        // Format subsections like "Concern for User Privacy:" with proper styling
        .replace(/(\n|^)([A-Z][a-z]+\s+for\s+[A-Z][a-z]+\s+[A-Z][a-z]+)(:|\.)/g, 
          '\n\n**$2**$3')
        // Add spacing before bullet points
        .replace(/(\n|^)(-\s+)/g, '\n$2')
        // Ensure double line breaks before new sections that start with capitalized words
        .replace(/(\n)([A-Z][a-z]+ [A-Za-z\s]+:)/g, '\n\n$2')
        // Add proper spacing after section titles
        .replace(/(###[^\n]+|^\s*[A-Z][^:\n]+:)(\s*)(\n?)/g, '$1\n')
        // Add paragraph breaks for readability in longer text sections
        .replace(/(\.)(\s+)([A-Z])/g, '$1\n\n$3')
        // Remove excessive line breaks to clean up
        .replace(/\n{3,}/g, '\n\n');
    }
    
    return (
      <div key={index} className="mb-6">
        {/* Message content */}
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          {!isUser && !isSystemMessage && (
            <div className="flex-shrink-0 mr-2">
              <img src={darkMode ? logoDark : logoLight} alt="EVA" className="w-6 h-6" />
            </div>
          )}
          
          <div className={`${isUser ? 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-100' : isSystemMessage ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 italic' : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'} rounded-lg p-4 ${isLoading ? 'min-w-[45px]' : isUser ? 'max-w-[85%]' : 'max-w-[90%]'} ${isPracticeFeedback ? 'practice-feedback' : ''}`}>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            ) : (
              <div className={`${isPracticeFeedback ? 'feedback-markdown' : 'message-content'} prose prose-headings:text-blue-700 dark:prose-headings:text-blue-400 prose-headings:font-bold prose-headings:text-lg prose-strong:font-semibold prose-p:mb-4 prose-p:leading-relaxed`}>
                <ReactMarkdown remarkPlugins={[]}>{displayContent}</ReactMarkdown>
          </div>
            )}
        </div>
        
          {isUser && (
            <div className="flex-shrink-0 ml-2 bg-blue-500 text-white rounded-full h-6 w-6 flex items-center justify-center">
              {/* First letter of user's name or a default icon */}
              <span className="text-xs">{localStorage.getItem('firstName')?.charAt(0) || 'U'}</span>
            </div>
          )}
        </div>
        
        {/* Practice buttons - moved outside of message bubble */}
        {hasPracticePrompt && (
          <div className="mt-3 flex gap-2 ml-8">
            <button
              onClick={() => handlePracticeResponse('yes')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
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
        
        {/* Practice Again button for practice feedback with score < 100 */}
        {shouldShowPracticeAgain && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                // Save the current conversation ID as original
                if (currentConversation && currentConversation.conversationId) {
                  console.log('Saving original conversation ID for Practice Again:', currentConversation.conversationId);
                  localStorage.setItem('originalConversationId', currentConversation.conversationId);
                }
                
                // Get the saved practice data
                const practiceData = localStorage.getItem('practice_data');
                if (practiceData) {
                  try {
                    const parsedData = JSON.parse(practiceData);
                    const managerType = parsedData.managerType || "PUPPETEER";
                    
                    // Set up for practice module
                    localStorage.setItem('practice_manager_type', managerType);
                    setActiveManagerType(managerType);
                    
                    // Enter practice mode
                    setPracticeMode(true);
                  } catch (e) {
                    console.error('Error parsing practice data for retry:', e);
                  }
                } else {
                  // Fallback if no data found
                  setActiveManagerType('PUPPETEER');
                  setPracticeMode(true);
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
            >
              Practice Again
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
        
        // Save the current conversation ID as the original - this is crucial for returning to the same conversation
        if (currentConversation && currentConversation.conversationId) {
          console.log('Saving original conversation ID:', currentConversation.conversationId);
          localStorage.setItem('originalConversationId', currentConversation.conversationId);
        }
        
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
      // User chose not to practice - just hide the practice buttons by updating the message content
      // Instead of adding a new message, just update the current state to rerender without buttons
      // Force a rerender by making a shallow copy of the messages array
      setStoreMessages([...storeMessages]);
      
      // Trigger a sidebar refresh to update the conversation list
      triggerSidebarRefresh();
    }
  };

  // Add a handler for exiting practice mode
  const handleExitPracticeMode = () => {
    setPracticeMode(false);
    setActiveManagerType(undefined);
    
    // Set the flag that we're returning from practice
    localStorage.setItem('returning_from_practice', 'true');
    
    // Get the original conversation ID if it exists
    const originalConversationId = localStorage.getItem('originalConversationId');
    console.log('Exiting practice mode, original conversation ID:', originalConversationId);
    
    if (originalConversationId) {
      // Check if we already have this conversation
      if (currentConversation?.conversationId !== originalConversationId) {
        // Set the conversation to the original one
        setCurrentConversation({
          conversationId: originalConversationId,
          title: currentConversation?.title || 'Conversation',
          managerType: currentConversation?.managerType || getManagerType() as ManagerType,
          createdAt: currentConversation?.createdAt || new Date().toISOString()
        });
      }
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
          {/* Enhanced styles for messages container */}
          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 w-full custom-scrollbar"
            ref={messagesContainerRef}
          >
            <div className="w-full max-w-5xl mx-auto pt-6 pb-8">
              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 flex items-center justify-between">
                  <div>{error}</div>
                  <div className="flex items-center">
                    {/* @ts-ignore - we know this exists when needed */}
                    {window.retryButton && window.retryButton}
                  {!currentConversation?.conversationId.startsWith('draft-') && (
                    <button 
                      onClick={fetchMessages}
                        className="ml-2 px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Refresh
                    </button>
                  )}
                  </div>
                </div>
              )}
              {/* Render all messages - this already handles loading states for individual messages */}
              {storeMessages.map((message, index) => renderMessage(message, index))}
              
              {/* Only show this loading indicator if we don't have any messages with isLoading set */}
              {loading && !storeMessages.some(msg => msg.isLoading) && (
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
              {/* Extra space at the bottom to make sure new messages are visible */}
              <div className="h-4"></div>
              <div ref={messagesEndRef} className="pt-2"></div>
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