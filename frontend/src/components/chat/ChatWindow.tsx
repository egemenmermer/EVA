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

  // Add utility functions for state preservation
  const saveConversationState = (conversationId: string, messages: Message[]) => {
    if (!conversationId) return;
    
    try {
      // Save both backup and recovery copies
      localStorage.setItem(`backup_messages_${conversationId}`, JSON.stringify(messages));
      localStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages));
      console.log(`Saved ${messages.length} messages for conversation ${conversationId}`);
    } catch (e) {
      console.error('Failed to save conversation state:', e);
    }
  };
  
  const loadConversationState = (conversationId: string): Message[] | null => {
    if (!conversationId) return null;
    
    try {
      // Try recovery copy first, then backup
      const savedState = localStorage.getItem(`messages_${conversationId}`);
      if (savedState) {
        const messages = JSON.parse(savedState);
        if (Array.isArray(messages) && messages.length > 0) {
          console.log(`Loaded ${messages.length} messages for conversation ${conversationId}`);
          return messages;
        }
      }
      
      // Try backup if recovery failed
      const backupState = localStorage.getItem(`backup_messages_${conversationId}`);
      if (backupState) {
        const messages = JSON.parse(backupState);
        if (Array.isArray(messages) && messages.length > 0) {
          console.log(`Loaded ${messages.length} messages from backup for conversation ${conversationId}`);
          return messages;
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
      return;
    }
    
    // Try to recover messages from localStorage first
    if (currentConversation.conversationId) {
      const recoveredMessages = loadConversationState(currentConversation.conversationId);
      if (recoveredMessages) {
        setMessages(recoveredMessages);
        console.log('Recovered messages from localStorage for conversation', currentConversation.conversationId);
        return;
      }
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

  // Enhance the triggerSidebarRefresh function to include more detail
  const triggerSidebarRefresh = (details?: { type: string, conversationId?: string, title?: string }) => {
    // Create and dispatch a custom event to notify the sidebar to refresh conversations
    const refreshEvent = new CustomEvent('refresh-conversations', { 
      detail: details || { type: 'general-refresh' }
    });
    window.dispatchEvent(refreshEvent);
    console.log('Dispatched refresh-conversations event', details);
  };

  const handleSendMessage = async (
    content: string, 
    temperature: number = 0.7,
    hideFromUI: boolean = false
  ) => {
    if (!content.trim()) {
      return;
    }

    // Auto-select a conversation if needed
    if (!currentConversation) {
      // Create a new conversation
      const newConversationId = uuidv4();
      
      // Generate a meaningful title from the message content
      let title = '';
      if (content.length <= 30) {
        title = content; // Use the whole message if it's short
      } else {
        // Extract first sentence or first 30 chars
        const firstSentenceMatch = content.match(/^[^.!?]*[.!?]/);
        title = firstSentenceMatch 
          ? firstSentenceMatch[0].substring(0, 50) 
          : content.substring(0, 50) + '...';
      }
      
      const newConversation = {
        conversationId: newConversationId,
        title: title,
        managerType: getManagerType(),
        createdAt: new Date().toISOString()
      };
      console.log('Creating new draft conversation:', newConversationId);
      setCurrentConversation(newConversation);
      
      // Add a slight delay to ensure conversation state is updated
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('Using conversation for message:', {
      id: currentConversation?.conversationId,
      isDraft: currentConversation?.conversationId.startsWith('draft-'),
      title: currentConversation?.title
    });

    setLoading(true);
    setError(null);

    try {
      // Create a user message
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: content,
        conversationId: currentConversation?.conversationId || '',
        createdAt: new Date().toISOString()
      };

      // Only add the user message to the UI if not marked as a background message
      if (!hideFromUI) {
        // Get fresh state from the store
        const currentMessages = useStore.getState().messages;
        console.log('Adding user message, current message count:', currentMessages.length);
        
        // Add user message to the store
        const updatedMessages = [...currentMessages, userMessage];
        setMessages(updatedMessages);
        
        // Save conversation state
        if (currentConversation?.conversationId) {
          saveConversationState(currentConversation.conversationId, updatedMessages);
        }
      }

      // Create a placeholder for the bot's response
      const botMessageId = uuidv4();
      const botPlaceholder: Message = {
        id: botMessageId,
        role: 'assistant',
        content: '',
        conversationId: currentConversation?.conversationId || '',
        createdAt: new Date().toISOString(),
        isLoading: true
      };

      // Only add the placeholder if not a background message
      if (!hideFromUI) {
        // Get fresh state after user message was added
        const messagesWithUser = useStore.getState().messages;
        const messagesWithPlaceholder = [...messagesWithUser, botPlaceholder];
        setMessages(messagesWithPlaceholder);
        
        // Save conversation state with placeholder
        if (currentConversation?.conversationId) {
          saveConversationState(currentConversation.conversationId, messagesWithPlaceholder);
        }
      }

      // Send the message to the backend
      const response = await api.post('/api/v1/conversation/message', {
        content: content,
        conversationId: currentConversation?.conversationId,
        managerType: currentConversation?.managerType || 'PUPPETEER',
        temperature: temperature
      });

      console.log('Response received from API:', {
        status: response.status,
        dataLength: typeof response.data === 'string' ? response.data.length : 'not a string',
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        isObject: typeof response.data === 'object' && response.data !== null,
        sampleData: typeof response.data === 'object' ? JSON.stringify(response.data).substring(0, 100) : 'not an object',
        conversationId: currentConversation?.conversationId,
        isDraftConversation: currentConversation?.conversationId.startsWith('draft-')
      });

      // If the response is successful, update the bot's message
      if (response.data) {
        let botContent = '';
        
        // Handle different response formats
        if (typeof response.data === 'object' && response.data !== null) {
          try {
            // Check if response is in the format {messages: [...]}
            const responseObj = response.data as any;
            if (responseObj.messages && Array.isArray(responseObj.messages)) {
              // Find the assistant message
              const assistantMessage = responseObj.messages.find((m: any) => m.role === 'assistant');
              if (assistantMessage && assistantMessage.content) {
                botContent = assistantMessage.content;
              } else {
                botContent = "Sorry, I couldn't process the response properly.";
              }
            } else {
              // Try to extract content directly
              botContent = responseObj.content || JSON.stringify(response.data);
            }
          } catch (e) {
            console.error('Error processing response:', e);
            botContent = JSON.stringify(response.data);
          }
        } else {
          // If it's already a string, use it directly
          botContent = String(response.data || '');
        }
        
        const botMessage: Message = {
          id: botMessageId,
          role: 'assistant',
          content: botContent,
          conversationId: currentConversation?.conversationId || '',
          createdAt: new Date().toISOString(),
          isLoading: false
        };
        
        // Only update the UI if not a background message
        if (!hideFromUI) {
          // Get the current state of messages to ensure we have the latest
          const currentMessages = useStore.getState().messages;
          console.log('Current message store state count:', currentMessages.length);
          
          // Replace the loading message with the real one
          // Use the filter-then-add approach for more reliability
          const messagesWithoutLoading = currentMessages.filter(msg => msg.id !== botMessageId);
          const updatedMessages = [...messagesWithoutLoading, botMessage];
          
          console.log('Updated messages count after filter-add:', updatedMessages.length);
          
          // Save the final conversation state
          if (currentConversation?.conversationId) {
            saveConversationState(currentConversation.conversationId, updatedMessages);
          }
          
          setMessages(updatedMessages);
          
          // Save the conversation to the backend if it's a draft
          if (currentConversation?.conversationId.startsWith('draft-')) {
            try {
              // Create a non-draft conversation to store these messages
              console.log('Creating permanent conversation for draft messages');
              
              // Extract a good title from the first user message
              const userMessages = updatedMessages.filter(msg => msg.role === 'user');
              const firstUserMessage = userMessages.length > 0 ? userMessages[0] : null;
              
              // Create a title from the first message or use current title
              const messageTitle = firstUserMessage 
                ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '')
                : currentConversation.title || 'New conversation';
                
              const createResponse = await api.post<CreateConversationResponse>('/api/v1/conversation', {
                title: messageTitle,
                managerType: currentConversation.managerType
              });
              
              if (createResponse.data && createResponse.data.conversationId) {
                const permanentId = createResponse.data.conversationId;
                console.log('Created permanent conversation:', permanentId);
                
                // Update the current conversation reference
                const updatedConversation = {
                  ...currentConversation,
                  conversationId: permanentId,
                  title: messageTitle // Make sure the title is set correctly
                };
                
                // Update all messages with the new conversation ID
                const messagesWithNewId = updatedMessages.map(msg => ({
                  ...msg,
                  conversationId: permanentId
                }));
                
                // Save to the store
                setCurrentConversation(updatedConversation);
                setMessages(messagesWithNewId);
                
                // Save to localStorage
                saveConversationState(permanentId, messagesWithNewId);
                
                // Trigger sidebar refresh to show the new conversation with specific details
                triggerSidebarRefresh({
                  type: 'new-conversation',
                  conversationId: permanentId,
                  title: messageTitle
                });
              }
            } catch (err) {
              console.error('Error saving draft conversation to backend:', err);
            }
          }
          
          // Check if messages were updated correctly
          setTimeout(() => {
            const stateAfterUpdate = useStore.getState().messages;
            console.log('Messages state after update:', stateAfterUpdate.length);
            
            // If messages are lost, try to recover them
            if (stateAfterUpdate.length === 0 && currentConversation?.conversationId) {
              console.log('Message state is empty! Trying to recover...');
              const recoveredMessages = loadConversationState(currentConversation.conversationId);
              if (recoveredMessages) {
                console.log('Successfully recovered messages, re-applying them');
                setMessages(recoveredMessages);
              }
            }
          }, 100);
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      // Remove the loading placeholder if there was an error
      if (!hideFromUI) {
        const filteredMessages = storeMessages.filter((msg: Message) => !msg.isLoading);
        setMessages(filteredMessages);
      }
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

  // Modify the handlePracticeFeedbackRequest function to include history
  useEffect(() => {
    const handlePracticeFeedbackRequest = async () => {
      // Prevent running if already processing
      if (isProcessingFeedback.current) {
        console.log('Feedback request already in progress, skipping.');
        return;
      }
      
      console.log('⚠️ Practice feedback processing starting, current conversation:', 
        currentConversation?.conversationId);
      isProcessingFeedback.current = true;
      console.log('Practice feedback request event received and processing started.');
      
      // Create a local ref to the current messages to ensure we can restore them if needed
      const currentMessages = [...useStore.getState().messages];
      
      // Get the complete practice data from localStorage
      const practiceData = localStorage.getItem('practice_data');
      const feedbackRequest = localStorage.getItem('feedbackRequest');
      console.log('DEBUG - localStorage keys:', Object.keys(localStorage));
      console.log('DEBUG - practice_data exists:', !!practiceData);
      console.log('DEBUG - feedbackRequest exists:', !!feedbackRequest);
      
      try {
        if (feedbackRequest) {
          console.log('Found feedback request:', feedbackRequest);
          
          // Check if this is a new practice session
          const isNewSession = localStorage.getItem('practice_is_new_session') === 'true';
          
          // If this is a new session and we already have messages, preserve them as context
          let priorSessionMessage: Message | null = null;
          if (isNewSession && storeMessages.length > 0) {
            // Create a summary message of the previous session
            const practiceHistory = getPracticeHistory();
            if (practiceHistory.length > 1) { // More than 1 means we have previous sessions
              const previousSession = practiceHistory[practiceHistory.length - 2]; // Get second-to-last
              
              if (previousSession) {
                priorSessionMessage = {
                  id: `history-${Date.now()}`,
                  role: 'system' as Role,
                  content: `Note: You previously completed a practice session with a score of ${previousSession.score}/100.`,
                  conversationId: currentConversation?.conversationId || '',
                  createdAt: new Date().toISOString()
                };
              }
            }
            
            // Clear the new session flag after handling it
            localStorage.removeItem('practice_is_new_session');
          }
          
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
          
          // Important: Preserve existing messages instead of resetting them
          // Only add the new user message with the feedback request
          const updatedMessages = [...storeMessages];
          
          // Add prior session message if it exists
          if (priorSessionMessage) {
            updatedMessages.push(priorSessionMessage);
          }
          
          // Add the user message to the UI
          updatedMessages.push(userMessage);
          
          // Update the UI with all messages
          setMessages(updatedMessages);
          
          // Save this state immediately in case of crashes
          if (currentConversation?.conversationId) {
            saveConversationState(currentConversation.conversationId, updatedMessages);
          }
          
          // Update messages state to include the loading indicator
          const loadingMessage: Message = {
            id: `assistant-loading-${Date.now()}`,
            role: 'assistant' as Role,
            content: 'Processing your practice feedback... This may take up to 30 seconds for a detailed response.',
            conversationId: currentConversation?.conversationId || '',
            createdAt: new Date().toISOString(),
            isLoading: true
          };
          
          // Add loading indicator to message list
          const messagesWithLoading = [...updatedMessages, loadingMessage];
          setMessages(messagesWithLoading);
          
          // Save this state with loading indicator
          if (currentConversation?.conversationId) {
            saveConversationState(currentConversation.conversationId, messagesWithLoading);
          }
          
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
                const newConversation = {
                  conversationId: conversationId,
                  title: title,
                  createdAt: createResponse.data.createdAt || new Date().toISOString(),
                  managerType: getManagerType(),
                };
                setCurrentConversation(newConversation);
                
                // Update user message with real conversation ID
                userMessage.conversationId = conversationId;
                
                // Make sure we save in localStorage to prevent losing messages
                saveConversationState(conversationId, messagesWithLoading);
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
          
          // Try direct message route first, then fall back to conversation/message
          while (retryCount <= maxRetries && !success) {
            if (retryCount > 0) {
              console.log(`Retry attempt ${retryCount} of ${maxRetries}...`);
            }
            
            try {
              // Try the messages endpoint first
              try {
                response = await Promise.race([
                  api.post<MessageResponse>(
                    `/api/v1/messages`, 
                    {
                      conversationId: conversationId,
                      role: 'user',
                      content: queryContent
                    }
                  ),
                  new Promise<null>((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 30000)
                  )
                ]);
                success = true;
              } catch (messageError) {
                // If messages endpoint fails, try the conversation/message endpoint
                console.log('Messages endpoint failed, trying conversation/message endpoint');
                response = await Promise.race([
                  api.post<MessageResponse>(
                    `/api/v1/conversation/message`, 
                    {
                      conversationId: conversationId,
                      content: queryContent,
                      userQuery: queryContent,
                      temperature: 0.7
                    }
                  ),
                  new Promise<null>((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 30000)
                  )
                ]);
                success = true;
              }
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
              
              // Get the current messages again to make sure we haven't lost state
              const currentMessagesBeforeUpdate = useStore.getState().messages;
              let messagesForUpdate = currentMessagesBeforeUpdate;
              
              // If somehow messages were lost, restore from our local reference
              if (currentMessagesBeforeUpdate.length === 0) {
                console.warn('Messages were lost during API call, restoring from reference');
                messagesForUpdate = currentMessages;
                // Temporarily set them back
                setMessages(messagesForUpdate);
              }
              
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
                
                // Get the latest state again for safety
                const currentMessagesNow = useStore.getState().messages;
                const messagesToUse = currentMessagesNow.length > 0 ? currentMessagesNow : messagesForUpdate;
                
                // Remove any loading messages
                const messagesWithoutLoading = messagesToUse.filter(m => !m.isLoading);
                
                // Update state: Remove loading message and add agent response
                const finalMessages = [...messagesWithoutLoading, agentMessage];
                setMessages(finalMessages);
                
                // Save final state
                if (conversationId) {
                  saveConversationState(conversationId, finalMessages);
                }
              } else {
                throw new Error('No assistant message or empty content in response');
              }
            } catch (error) {
              console.error('Error processing successful API response:', error);
              setError('Error processing the agent response. Please try again.');
              
              // Handle error case - remove loading messages but keep user message
              const currentMessagesNow = useStore.getState().messages;
              const messagesWithoutLoading = currentMessagesNow.filter(m => !m.isLoading);
              setMessages(messagesWithoutLoading);
              
              if (currentConversation?.conversationId) {
                saveConversationState(currentConversation.conversationId, messagesWithoutLoading);
              }
            }
          } else {
            console.error('API request failed after retries');
            setError('Failed to get a response from the agent. Please try again.');
            
            // Handle error case - remove loading messages but keep user message
            const currentMessagesNow = useStore.getState().messages;
            const messagesWithoutLoading = currentMessagesNow.filter(m => !m.isLoading);
            setMessages(messagesWithoutLoading);
            
            if (currentConversation?.conversationId) {
              saveConversationState(currentConversation.conversationId, messagesWithoutLoading);
            }
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

  // Check for practice feedback request from localStorage
  useEffect(() => {
    // Check if we have a practice_to_chat flag
    const practiceToChat = localStorage.getItem('practice_to_chat');
    const feedbackPrompt = localStorage.getItem('practice_feedback_prompt');
    const feedbackConversationId = localStorage.getItem('currentConversationId');
    
    if (practiceToChat === 'true' && feedbackPrompt && feedbackConversationId) {
      console.log('⚠️ Detected practice feedback request in second useEffect, might override conversation:', 
        currentConversation?.conversationId, 'with:', feedbackConversationId);
      isProcessingFeedback.current = true;
      
      // Set the current conversation
      setCurrentConversation({
        conversationId: feedbackConversationId,
        title: `Practice Feedback - ${localStorage.getItem('practice_manager_type') || 'Default'} Manager`,
        managerType: (localStorage.getItem('practice_manager_type') || getManagerType()) as ManagerType,
        createdAt: new Date().toISOString()
      });
      
      // Try to load messages from localStorage first
      const exactSavedMessages = localStorage.getItem(`exact_messages_${feedbackConversationId}`);
      if (exactSavedMessages) {
        try {
          const parsedMessages = JSON.parse(exactSavedMessages);
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            console.log('Found saved messages for practice feedback in localStorage');
            setMessages(parsedMessages);
            
            // Now wait a moment and then send the message to the API
            setTimeout(() => {
              if (handleSendMessageRef.current) {
                console.log('Sending practice feedback prompt to API');
                handleSendMessageRef.current(feedbackPrompt);
              }
              isProcessingFeedback.current = false;
              localStorage.removeItem('practice_to_chat');
              localStorage.removeItem('practice_feedback_prompt');
            }, 500);
            return;
          }
        } catch (parseErr) {
          console.error('Error parsing saved messages for practice feedback:', parseErr);
        }
      }
      
      // If we couldn't load from localStorage, set up the conversation from scratch
      console.log('No saved messages found, setting up conversation from scratch');
      const userMessage = {
        id: uuidv4(),
        role: 'user' as Role,
        content: feedbackPrompt,
        conversationId: feedbackConversationId,
        createdAt: new Date().toISOString()
      };
      
      // Set the message immediately so user sees something
      setMessages([userMessage]);
      
      // Send the message to the API
      setTimeout(() => {
        if (handleSendMessageRef.current) {
          console.log('Sending practice feedback prompt to API');
          handleSendMessageRef.current(feedbackPrompt);
          isProcessingFeedback.current = false;
          localStorage.removeItem('practice_to_chat');
          localStorage.removeItem('practice_feedback_prompt');
        }
      }, 500);
    }
  }, []);

  // Add auto-recovery for messages
  useEffect(() => {
    // Check periodically if messages disappeared and recover them
    const intervalId = setInterval(() => {
      if (currentConversation?.conversationId && storeMessages.length === 0) {
        console.log('State check: messages are empty! Attempting recovery...');
        const recoveredMessages = loadConversationState(currentConversation.conversationId);
        if (recoveredMessages && recoveredMessages.length > 0) {
          console.log('Auto-recovery: found and restored', recoveredMessages.length, 'messages');
          setMessages(recoveredMessages);
        }
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(intervalId);
  }, [currentConversation?.conversationId, storeMessages.length]);

  // Add a check for practice data on component mount
  useEffect(() => {
    // Check localStorage for practice feedback request on component mount
    const checkForPracticeFeedback = () => {
      const practiceToChat = localStorage.getItem('practice_to_chat');
      const feedbackPrompt = localStorage.getItem('feedbackRequest') || localStorage.getItem('practice_feedback_prompt');
      
      // If we find evidence of a pending practice feedback request
      if (practiceToChat === 'true' && feedbackPrompt && !isProcessingFeedback.current) {
        console.log('Found practice feedback request on component mount, processing...');
        // Trigger feedback processing
        const event = new Event('practice-feedback-request');
        window.dispatchEvent(event);
      }
    };
    
    // Run the check
    checkForPracticeFeedback();
    
    // Set up interval to check for feedback requests
    const checkInterval = setInterval(checkForPracticeFeedback, 2000);
    
    return () => {
      clearInterval(checkInterval);
    };
  }, []);

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
      displayContent = message.content;
      
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
    } else {
      displayContent = String(message.content || '');
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
          
          <div className={`${isUser ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : isSystemMessage ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 italic' : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'} rounded-lg p-4 ${isLoading ? 'min-w-[45px]' : isUser ? 'max-w-[85%]' : 'max-w-[90%]'} ${isPracticeFeedback ? 'practice-feedback' : ''}`}>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            ) : (
              <div className={isPracticeFeedback ? 'feedback-markdown prose prose-headings:text-blue-700 dark:prose-headings:text-blue-400 prose-headings:font-bold prose-headings:text-lg prose-strong:font-semibold' : ''}>
                <ReactMarkdown>{displayContent}</ReactMarkdown>
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
      setMessages([...storeMessages]);
      
      // Trigger a sidebar refresh to update the conversation list
      triggerSidebarRefresh();
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