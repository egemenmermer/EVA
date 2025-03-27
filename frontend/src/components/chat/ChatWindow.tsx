import React, { useState, useEffect } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useStore, Message as StoreMessage } from '@/store/useStore';
import { conversationApi } from '@/services/api';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationContentResponseDTO } from '@/types/api';

// Extended ConversationContentResponseDTO with additional fields from backend
interface ExtendedConversationDTO extends ConversationContentResponseDTO {
  userQuery?: string;
  agentResponse?: string;
  isUserMessage?: boolean;
  isLoading?: boolean;
}

// Extend the store Message type to include optional fields needed in this component
interface Message extends StoreMessage {
  isSystemMessage?: boolean;
  userQuery?: string;
}

// Add a new interface for the updated response format
interface MessageResponseDTO {
  messages: Array<{
    id: string;
    conversationId: string;
    role: 'user' | 'assistant';
    content: string;
    userQuery?: string;
    agentResponse?: string;
    createdAt: string;
    isLoading?: boolean;
  }>;
}

export const ChatWindow: React.FC = () => {
  const { 
    currentConversation, 
    messages, 
    setMessages, 
    addMessage, 
    managerType,
    setCurrentConversation,
    temperature
  } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [showPracticeBanner, setShowPracticeBanner] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation?.conversationId) {
      // Skip fetching messages for draft conversations
      if (currentConversation.isDraft || currentConversation.conversationId.startsWith('draft-')) {
        console.log('Skipping message fetch for draft conversation:', currentConversation.conversationId);
        setMessages([]);
        setLoading(false);
        return;
      }
      
      console.log('ChatWindow: Conversation changed, fetching messages for:', currentConversation.conversationId);
      setLoading(true);
      
      // First try to load from localStorage as a fallback
      try {
        const savedMessages = localStorage.getItem(`messages-${currentConversation.conversationId}`);
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages) as Message[];
          console.log('Loaded messages from localStorage:', parsedMessages.length);
          
          // Debug log message types
          const userMsgs = parsedMessages.filter(msg => msg.role === 'user').length;
          const assistantMsgs = parsedMessages.filter(msg => msg.role === 'assistant').length;
          console.log(`Message types - User: ${userMsgs}, Assistant: ${assistantMsgs}`);
          
          // Ensure all messages have required fields
          const validMessages = parsedMessages.map(msg => ({
            ...msg,
            id: msg.id || uuidv4(),
            createdAt: msg.createdAt || new Date().toISOString()
          })) as StoreMessage[];
          
          // Use these messages initially
          setMessages(validMessages);
        }
      } catch (error) {
        console.error('Failed to load messages from localStorage:', error);
      }
      
      // Then fetch from the server to get the most up-to-date data
      fetchMessages(currentConversation.conversationId)
        .finally(() => setLoading(false));
    } else {
      // Check if we have a saved conversation ID we can restore
      const savedConversationId = localStorage.getItem('current-conversation-id');
      if (savedConversationId) {
        console.log('Attempting to restore conversation from localStorage:', savedConversationId);
        
        // Try to find saved messages for this conversation
        try {
          const savedMessages = localStorage.getItem(`messages-${savedConversationId}`);
          if (savedMessages) {
            const parsedMessages = JSON.parse(savedMessages) as Message[];
            console.log('Restored', parsedMessages.length, 'messages from localStorage');
            
            // Debug log message types
            const userMsgs = parsedMessages.filter(msg => msg.role === 'user').length;
            const assistantMsgs = parsedMessages.filter(msg => msg.role === 'assistant').length;
            console.log(`Restored message types - User: ${userMsgs}, Assistant: ${assistantMsgs}`);
            
            // Ensure all messages have required fields
            const validMessages = parsedMessages.map(msg => ({
              ...msg,
              id: msg.id || uuidv4(),
              createdAt: msg.createdAt || new Date().toISOString()
            })) as StoreMessage[];
            
            setMessages(validMessages);
          }
        } catch (error) {
          console.error('Failed to restore messages from localStorage:', error);
        }
      } else {
        // Clear messages if no conversation is selected
        setMessages([]);
      }
    }
  }, [currentConversation?.conversationId, setMessages]);

  const fetchMessages = async (conversationId: string, isPolling = false) => {
    try {
      console.log(`${isPolling ? 'Polling' : 'Fetching'} messages for conversation:`, conversationId);

      // Check if we have a valid conversation ID
      if (!conversationId) {
        console.log('No conversation ID provided, skipping fetch');
        return;
      }

      // For draft conversations, don't try to fetch from backend API
      // Instead rely on local storage and messages state
      if (conversationId.startsWith('draft-')) {
        console.log('Draft conversation, using local storage and current state');
        
        // Check if any messages in our current state are in loading state
        const anyLoading = messages.some(msg => msg.isLoading === true);
        if (anyLoading && isPolling) {
          console.log('Found messages in loading state, will poll again in 2 seconds');
          setTimeout(() => {
            fetchMessages(conversationId, true);
          }, 2000);
        }
        return;
      }

      // Regular API fetch for standard conversations
      try {
        if (!isPolling) {
          setLoading(true);
        }

        // Use a timeout to prevent the fetch from hanging indefinitely
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 8000));
        
        // Create the fetch promise
        const fetchPromise = conversationApi.getMessages(conversationId);
        
        // Race between fetch and timeout
        const serverMessages = await Promise.race([fetchPromise, timeoutPromise]);
        
        console.log(`${isPolling ? 'Polled' : 'Fetched'} messages from server:`, serverMessages);
        
        if (serverMessages && Array.isArray(serverMessages) && serverMessages.length > 0) {
          // Convert server messages to the format our app expects
          const processedMessages = serverMessages.map(msg => ({
            id: msg.id || uuidv4(),
            conversationId: msg.conversationId || conversationId,
            role: msg.role || (msg.userQuery ? 'user' : 'assistant'),
            content: msg.content || msg.agentResponse || msg.userQuery || '',
            createdAt: msg.createdAt || new Date().toISOString(),
            isLoading: msg.isLoading === true
          }));
          
          // Sort by timestamp
          processedMessages.sort((a, b) => {
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          });
          
          console.log('Processed messages for UI:', processedMessages.length);
          
          // If we're polling, carefully update only the loading message
          if (isPolling) {
            const updatedMessages = [...messages];
            
            // Find any messages that were in loading state
            const loadingMessages = updatedMessages.filter(msg => msg.isLoading);
            
            // For each loading message, check if we have a corresponding updated message
            for (const loadingMsg of loadingMessages) {
              // Find the updated message in processed messages by conversation ID
              const updatedMsg = processedMessages.find(
                msg => msg.role === 'assistant' && !msg.isLoading
              );
              
              if (updatedMsg) {
                console.log('Found update for loading message:', updatedMsg);
                
                // Replace the loading message with updated content
                const index = updatedMessages.findIndex(msg => msg.id === loadingMsg.id);
                if (index !== -1) {
                  updatedMessages[index] = {
                    ...loadingMsg,
                    content: updatedMsg.content,
                    isLoading: false
                  };
                }
              }
            }
            
            setMessages(updatedMessages);
          } else {
            // For regular fetch, just set all messages
            setMessages(processedMessages);
          }
          
          // Store in localStorage
          localStorage.setItem(`messages-${conversationId}`, JSON.stringify(
            isPolling ? messages : processedMessages
          ));
          
          // Check if any messages are still loading and continue polling if needed
          const stillLoading = (isPolling ? messages : processedMessages).some(msg => msg.isLoading === true);
          if (stillLoading) {
            console.log('Some messages are still loading, polling again in 2 seconds');
            setTimeout(() => {
              fetchMessages(conversationId, true);
            }, 2000);
          }
        }
      } catch (error) {
        console.error(`Error ${isPolling ? 'polling' : 'fetching'} messages:`, error);
        
        // For normal fetch (not polling), try loading from localStorage if API fails
        if (!isPolling) {
          try {
            const savedMessages = localStorage.getItem(`messages-${conversationId}`);
            if (savedMessages) {
              const parsedMessages = JSON.parse(savedMessages) as Message[];
              console.log('Using local storage messages:', parsedMessages.length);
              
              // Update UI with local messages
              setMessages(parsedMessages);
              
              // Check if any are in loading state
              const anyLoading = parsedMessages.some(msg => msg.isLoading === true);
              if (anyLoading) {
                console.log('Found messages in loading state, will poll again in 2 seconds');
                setTimeout(() => {
                  fetchMessages(conversationId, true);
                }, 2000);
              }
            }
          } catch (localError) {
            console.error('Error loading from localStorage:', localError);
          }
        }
      } finally {
        if (!isPolling) {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Fatal error in fetchMessages:', error);
      if (!isPolling) {
        setError('Failed to load conversation. Please try refreshing the page.');
        setLoading(false);
      }
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
  
  // Fix handleSendMessage to ensure messages are always visible and polling works reliably
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // Generate conversation ID if needed (for new drafts)
    const isDraftConversation = currentConversation?.isDraft || currentConversation?.conversationId.startsWith('draft-');
    let actualConversationId = currentConversation?.conversationId || `draft-${uuidv4()}`;
    
    // Create the user message immediately
    const userMessage: Message = {
      id: uuidv4(),
      conversationId: actualConversationId,
      role: 'user',
      content: content,
      createdAt: new Date().toISOString()
    };
    
    // Create a placeholder for the assistant's response
    const assistantPlaceholder: Message = {
      id: uuidv4(),
      conversationId: actualConversationId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      isLoading: true
    };
    
    // Update UI state immediately with both messages
    const updatedMessages = [...messages, userMessage, assistantPlaceholder];
    setMessages(updatedMessages);
    setInputValue(''); // Clear input field
    setLoading(true);
    
    try {
      // If this is a draft conversation, create a real conversation first
      if (isDraftConversation) {
        console.log('Creating new conversation to replace draft');
        try {
          const newConversation = await conversationApi.createConversation(managerType);
          
          // Update conversation ID to the real one
          if (newConversation && newConversation.conversationId) {
            console.log('Created new conversation with ID:', newConversation.conversationId);
            actualConversationId = newConversation.conversationId;
            
            // Update the current conversation in store
            setCurrentConversation({
              ...newConversation,
              lastMessage: content,
              lastMessageDate: new Date().toISOString()
            });
            
            // Add a title update after creating the conversation
            try {
              // We can update the title separately after creating conversation
              const title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
              await conversationApi.updateConversationTitle(actualConversationId, content);
            } catch (titleError) {
              console.error('Error updating conversation title:', titleError);
            }
            
            // Update message conversation IDs
            userMessage.conversationId = actualConversationId;
            assistantPlaceholder.conversationId = actualConversationId;
            
            // Update UI with new conversation ID
            const updatedMessagesWithNewId = updatedMessages.map(msg => ({
              ...msg,
              conversationId: actualConversationId
            }));
            setMessages(updatedMessagesWithNewId);
          }
        } catch (createError) {
          console.error('Error creating conversation:', createError);
          // Continue with draft ID if creation fails
        }
      }
      
      // Send the message to the backend with the possibly updated conversation ID
      console.log('ChatWindow: Sending message to backend, conversationId:', actualConversationId);
      
      const response = await conversationApi.sendMessage(
        actualConversationId,
        content,
        temperature
      );
      
      console.log('Full response from server:', JSON.stringify(response));
      
      // Process the response based on its format
      if (response && 'messages' in response && Array.isArray(response.messages)) {
        console.log('ChatWindow: Received message array response:', response.messages);
        
        // Find the assistant message - should be the last one in the response
        const assistantMessage = response.messages.find((msg: any) => msg.role === 'assistant');
        
        if (assistantMessage) {
          console.log('Found assistant message:', assistantMessage);
          
          // Create a new messages array by replacing our placeholder
          const messagesWithReplacement = updatedMessages.map(msg => 
            // Only replace our placeholder, not any other assistant messages
            msg.id === assistantPlaceholder.id ? {
              ...assistantPlaceholder,
              id: assistantMessage.id || assistantPlaceholder.id,
              content: assistantMessage.content || assistantMessage.agentResponse || 'No response',
              conversationId: actualConversationId,
              isLoading: assistantMessage.isLoading === true
            } : {
              ...msg,
              conversationId: actualConversationId
            }
          );
          
          setMessages(messagesWithReplacement);
          
          // Save updated messages to localStorage
          localStorage.setItem(`messages-${actualConversationId}`, JSON.stringify(messagesWithReplacement));
          
          // If any messages are still loading, set up polling
          if (assistantMessage.isLoading) {
            console.log('ChatWindow: Assistant message is still loading, starting polling');
            setTimeout(() => {
              fetchMessages(actualConversationId, true);
            }, 1000);
          }
        }
      } else if (response) {
        // Handle traditional response format (single message)
        console.log('ChatWindow: Received traditional response format:', response);
        
        // Replace placeholder message with actual response
        const responseContent = 
          response.content || 
          response.agentResponse || 
          (typeof response === 'string' ? response : 'No response');
        
        const messagesWithReplacement = updatedMessages.map(msg => 
          msg.id === assistantPlaceholder.id ? {
            ...assistantPlaceholder,
            content: responseContent,
            isLoading: false
          } : msg
        );
        
        setMessages(messagesWithReplacement);
        
        // Save updated messages to localStorage
        localStorage.setItem(`messages-${actualConversationId}`, JSON.stringify(messagesWithReplacement));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update placeholder with error message
      const messagesWithError = updatedMessages.map(msg => 
        msg.id === assistantPlaceholder.id ? {
          ...assistantPlaceholder,
          content: 'Sorry, there was an error processing your request. Please try again.',
          isSystemMessage: true,
          isLoading: false
        } : msg
      );
      
      setMessages(messagesWithError);
      localStorage.setItem(`messages-${actualConversationId}`, JSON.stringify(messagesWithError));
    } finally {
      setLoading(false);
      
      // Start polling for message updates with updated conversation ID
      setTimeout(() => {
        fetchMessages(actualConversationId, true);
      }, 2000);
    }
    
    // Scroll to bottom
    setTimeout(() => {
      const messagesEndRef = document.getElementById('messages-end');
      messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Welcome message for new conversation
  const getWelcomeMessage = (): Message => {
    return {
      id: 'welcome',
      conversationId: currentConversation?.conversationId || 'new',
      role: 'assistant' as const,
      content: `👋 Welcome to EthicAI! I'm your AI assistant for ethical decision-making.\n\nHow can I help you today?${currentConversation?.managerType ? `\n\nCurrent manager type: ${currentConversation.managerType}` : ''}`,
      createdAt: new Date().toISOString()
    };
  };

  // Check if we should show welcome message
  const shouldShowWelcomeMessage = () => {
    // Don't show welcome message if we have existing messages in state
    if (messages.length > 0) {
      return false;
    }
    
    // Don't show welcome message if we have locally stored messages
    if (currentConversation?.conversationId) {
      try {
        const savedMessages = localStorage.getItem(`messages-${currentConversation.conversationId}`);
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages);
          // Return false if we have stored messages
          if (parsedMessages && Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            return false;
          }
        }
      } catch (error) {
        console.error('Error checking for saved messages:', error);
      }
    }
    
    // Don't show welcome message for draft conversations 
    if (currentConversation?.isDraft) {
      return false;
    }
    
    // Show welcome message only for established (non-draft) conversations
    return true;
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
            {/* For draft conversations (new chats), don't show any message until the user sends one */}
            {currentConversation.isDraft ? (
              <div className="flex items-center justify-center h-full">
                {/* Empty state - just like ChatGPT */}
              </div>
            ) : (
              <MessageList 
                messages={messages.length > 0 ? messages : shouldShowWelcomeMessage() ? [getWelcomeMessage()] : []} 
                loading={loading}
                practiceMode={practiceMode}
              />
            )}
          </div>
          <div className="p-4 md:p-6 border-t border-gray-200 dark:border-gray-700">
            <MessageInput onSendMessage={handleSendMessage} disabled={loading} />
            {error && (
              <div className="mt-4 max-w-3xl mx-auto text-sm text-red-600 dark:text-red-400">
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