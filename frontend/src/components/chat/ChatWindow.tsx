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
    managerType,
    setCurrentConversation,
    temperature
  } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [showPracticeBanner, setShowPracticeBanner] = useState(false);

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
          
          // Use these messages initially
          setMessages(parsedMessages);
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
            
            setMessages(parsedMessages);
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

  const fetchMessages = async (conversationId: string) => {
    try {
      console.log('Fetching messages for conversation:', conversationId);

      // Skip API call for draft or invalid conversation IDs
      if (!conversationId || conversationId.startsWith('draft-') || conversationId.includes('mock-')) {
        console.log('Skipping server fetch for draft/invalid conversation:', conversationId);
        return;
      }

      // First check for locally stored messages
      let hasLocalMessages = false;
      try {
        const savedMessages = localStorage.getItem(`messages-${conversationId}`);
        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages) as Message[];
          if (parsedMessages.length > 0) {
            console.log('Using locally stored messages:', parsedMessages.length);
            setMessages(parsedMessages);
            hasLocalMessages = true;
          }
        }
      } catch (localError) {
        console.error('Error loading local messages:', localError);
      }
      
      // Then try to fetch from server
      try {
        const serverMessages = await conversationApi.getConversationMessages(conversationId);
        console.log('Fetched messages from server, count:', serverMessages.length);
        console.log('Raw server messages:', serverMessages);
        
        if (serverMessages.length > 0) {
          // Server has messages, use them
          const messagesArray: Message[] = [];
          
          // Process each server message and convert to our format
          // The server returns a single object for each exchange (userQuery + agentResponse)
          for (const msg of serverMessages) {
            // Add message with correct properties
            messagesArray.push({
              id: msg.id,
              conversationId: msg.conversationId,
              role: msg.role,
              content: msg.content,
              createdAt: msg.createdAt
            });
          }
          
          console.log('Processed message array:', messagesArray);
          
          // Sort messages by createdAt date
          messagesArray.sort((a, b) => {
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          });
          
          setMessages(messagesArray);
          
          // Update local storage with server messages
          localStorage.setItem(`messages-${conversationId}`, JSON.stringify(messagesArray));
          console.log('Updated localStorage with server messages');
        } else if (!hasLocalMessages) {
          // No messages on server or locally - could be a new conversation
          console.log('No messages found for conversation (new conversation)');
          
          // Initialize empty array in localStorage
          localStorage.setItem(`messages-${conversationId}`, JSON.stringify([]));
        }
      } catch (serverError) {
        console.error('Error fetching messages from server:', serverError);
        if (!hasLocalMessages) {
          // If we don't have local messages and server failed, show error
          setError('Failed to load message history from server. Using locally stored messages if available.');
        }
      }
    } catch (error) {
      console.error('Fatal error in fetchMessages:', error);
      setError('Failed to load conversation. Please try refreshing the page.');
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
    if (!currentConversation || !content.trim()) return;

    try {
      setLoading(true);
      console.log('ChatWindow: Sending message to conversation:', currentConversation.conversationId);
      
      let actualConversationId = currentConversation.conversationId;
      let isNewConversation = false;
      
      // Check if this is a draft conversation that needs to be created on the server
      if (currentConversation.isDraft || currentConversation.conversationId.startsWith('draft-')) {
        console.log('Creating real conversation from draft');
        isNewConversation = true;
        
        try {
          // Create the conversation on the server
          const newConversation = await conversationApi.createConversation(currentConversation.managerType);
          
          if (!newConversation || !newConversation.conversationId) {
            throw new Error('Failed to create conversation on server');
          }
          
          console.log('Created real conversation on server:', newConversation);
          // Make sure we're using the actual UUID from the server response
          actualConversationId = newConversation.conversationId.toString();
          
          // Update the conversation object
          const realConversation = {
            conversationId: actualConversationId,
            title: '', // Will be set after title generation
            lastMessage: content,
            lastMessageDate: new Date().toISOString(),
            managerType: newConversation.managerType,
            isDraft: false
          };
          
          // Update current conversation in store
          setCurrentConversation(realConversation);
          
          // Also update the sidebar list in the local state
          // Get the sidebar component to refresh its list
          try {
            const sidebarState = window.localStorage.getItem('app-storage');
            if (sidebarState) {
              const parsedState = JSON.parse(sidebarState);
              if (parsedState && parsedState.state && parsedState.state.currentConversation) {
                parsedState.state.currentConversation = realConversation;
                window.localStorage.setItem('app-storage', JSON.stringify(parsedState));
              }
            }
          } catch (error) {
            console.error('Error updating localStorage with real conversation:', error);
          }
        } catch (error) {
          console.error('Error creating real conversation:', error);
          setError('Failed to create conversation. Please try again.');
          setLoading(false);
          return;
        }
      }
      
      // Add user message immediately
      const userMessage = {
        id: uuidv4(),
        conversationId: actualConversationId,
        role: 'user' as const,
        content: content,
        createdAt: new Date().toISOString()
      };
      addMessage(userMessage);
      console.log('ChatWindow: Added user message to UI');
      
      // Check if this is the first message and update conversation title if needed
      if (isNewConversation || messages.length === 0) {
        console.log('Generating title for new conversation');
        // Default title in case title generation fails
        let title = content.length > 30 ? content.substring(0, 30) + '...' : content;
        
        try {
          // Generate title using Gemini Pro
          const generatedTitle = await conversationApi.updateConversationTitle(actualConversationId || '', content);
          console.log('Generated conversation title:', generatedTitle);
          
          if (generatedTitle && generatedTitle !== title) {
            title = generatedTitle;
            console.log('Using generated title:', title);
          } else {
            console.warn('Using fallback title:', title);
          }
          
          // Update conversation object with new title
          const updatedConversation = {
            ...currentConversation,
            conversationId: actualConversationId,
            title: title,
            lastMessage: content,
            lastMessageDate: new Date().toISOString(),
            isDraft: false
          };
          
          // Update current conversation in store
          setCurrentConversation(updatedConversation);
          
          // Also update conversation in localStorage to ensure sidebar shows updated title
          try {
            // Get current conversations list from localStorage
            const storedConversationsJson = localStorage.getItem('app-storage');
            if (storedConversationsJson) {
              const storedData = JSON.parse(storedConversationsJson);
              if (storedData && storedData.state && storedData.state.currentConversation) {
                // Update the conversation in the stored currentConversation
                storedData.state.currentConversation = updatedConversation;
                localStorage.setItem('app-storage', JSON.stringify(storedData));
                console.log('Updated conversation title in localStorage:', title);
              }
            }
          } catch (storageError) {
            console.error('Error updating conversation title in localStorage:', storageError);
          }
        } catch (error) {
          console.error('Error generating title:', error);
          // Fall back to default title already set
          console.warn('Using default title due to error:', title);
          
          // Still update conversation with the default title
          const updatedConversation = {
            ...currentConversation,
            conversationId: actualConversationId,
            title: title,
            lastMessage: content,
            lastMessageDate: new Date().toISOString(),
            isDraft: false
          };
          
          setCurrentConversation(updatedConversation);
        }
      }

      // Always save user message to localStorage for redundancy
      try {
        const allMessages = [...messages, userMessage];
        localStorage.setItem(`messages-${actualConversationId}`, JSON.stringify(allMessages.slice(-50)));
        console.log('ChatWindow: Saved user message to localStorage');
      } catch (error) {
        console.error('Error saving message to localStorage:', error);
      }

      // Send message to backend
      try {
        console.log('ChatWindow: Sending message to backend API');
        // Keep loading state true while waiting for response
        setLoading(true);
        
        const response = await conversationApi.sendMessage(
          actualConversationId,
          content,
          temperature
        );
        console.log('ChatWindow: Received response from backend:', response);
        
        // Verify we have a response
        if (!response.content) {
          console.error('Response content is missing from API response:', response);
          throw new Error('Missing response content from server');
        }
        
        console.log('ChatWindow: Agent response content:', response.content);

        // Add AI response
        const aiMessage = {
          id: response.id,
          conversationId: actualConversationId,
          role: 'assistant' as const,
          content: response.content,
          createdAt: response.createdAt || new Date().toISOString()
        };
        console.log('ChatWindow: Creating AI message:', aiMessage);
        addMessage(aiMessage);
        console.log('ChatWindow: Added AI message to UI');
        
        // If this was a new conversation, update the sidebar to show it
        if (isNewConversation) {
          // Request the sidebar to refresh conversations
          try {
            // Manually trigger a refetch of conversations by dispatching a custom event
            window.dispatchEvent(new CustomEvent('refresh-conversations'));
            console.log('ChatWindow: Triggered conversation refresh event for new conversation');
            
            // Also update local storage to ensure the conversation appears correctly
            const storedConversationsJson = localStorage.getItem('app-storage');
            if (storedConversationsJson) {
              try {
                const storedData = JSON.parse(storedConversationsJson);
                if (storedData && storedData.state) {
                  // Make sure the current conversation is up to date
                  const currentTitle = currentConversation.title || 'New conversation';
                  storedData.state.currentConversation = {
                    ...currentConversation,
                    conversationId: actualConversationId,
                    title: currentTitle,
                    lastMessage: content,
                    lastMessageDate: new Date().toISOString(),
                    isDraft: false
                  };
                  localStorage.setItem('app-storage', JSON.stringify(storedData));
                }
              } catch (err) {
                console.error('Error updating app storage for new conversation:', err);
              }
            }
          } catch (error) {
            console.error('Error triggering conversation refresh:', error);
          }
        }
        
        // Save AI response to localStorage too
        try {
          const allMessages = [...messages, userMessage, aiMessage];
          localStorage.setItem(`messages-${actualConversationId}`, JSON.stringify(allMessages.slice(-50)));
          console.log('ChatWindow: Saved AI response to localStorage');
        } catch (storageError) {
          console.error('Error saving AI response to localStorage:', storageError);
        }
      } catch (apiError: any) {
        console.error('Error sending message to backend:', apiError);
        console.error('Error details:', apiError.response?.data || apiError.message);
        
        // Add error message to chat
        const errorMessage = {
          id: uuidv4(),
          conversationId: actualConversationId,
          role: 'assistant' as const,
          content: 'Sorry, there was an error processing your message. Please check the console for more details.',
          createdAt: new Date().toISOString(),
          isSystemMessage: true
        };
        addMessage(errorMessage);
        
        // Still save error message to localStorage
        try {
          const allMessages = [...messages, userMessage, errorMessage];
          localStorage.setItem(`messages-${actualConversationId}`, JSON.stringify(allMessages.slice(-50)));
        } catch (storageError) {
          console.error('Error saving error message to localStorage:', storageError);
        }
      } finally {
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error in handleSendMessage:', error);
      setError('There was an error sending your message. Please try again.');
      setLoading(false);
    }
  };

  // Welcome message for new conversation
  const getWelcomeMessage = () => {
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