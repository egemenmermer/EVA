import React, { useEffect, useRef, useState } from 'react';
import { UserCircle, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore } from '@/store/useStore';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';

// Custom hook for typing effect
const useTypewriter = (text: string, speed: number = 50, shouldAnimate: boolean = true) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Reset state completely when text changes to avoid animation carry-over between conversations
  useEffect(() => {
    // If animation is disabled, just set the text directly without animating
    if (!shouldAnimate) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }
    
    // Start animation
    setIsTyping(true);
    setDisplayedText('');
    
    let isMounted = true; // Track component mounted state
    
    // Split text into words, preserving spaces and punctuation
    const words = text.match(/\S+|\s+|[.,!?;:]/g) || [];
    let currentText = '';
    let currentIndex = 0;

    const typeNextWord = () => {
      if (!isMounted) return; // Don't continue if unmounted
      
      if (currentIndex < words.length) {
        currentText += words[currentIndex];
        setDisplayedText(currentText);
        currentIndex++;
        setTimeout(typeNextWord, speed);
      } else {
        setIsTyping(false);
      }
    };

    typeNextWord();

    // Cleanup - important for switching conversations
    return () => {
      isMounted = false;
      setIsTyping(false);
      setDisplayedText('');
    };
  }, [text, speed, shouldAnimate]);

  return { displayedText, isTyping };
};

interface Message {
  id?: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  isSystemMessage?: boolean;
  isLoading?: boolean;
}

interface Props {
  messages: Message[];
  loading?: boolean;
  practiceMode?: boolean;
}

export const MessageList: React.FC<Props> = ({ messages, loading, practiceMode = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [hasRenderedMessages, setHasRenderedMessages] = useState(false);
  // Track which message IDs have already been animated
  const [animatedMessageIds, setAnimatedMessageIds] = useState<Set<string>>(new Set());
  // Track current conversation ID to detect conversation changes
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  // Track if animation is currently happening
  const [isAnimating, setIsAnimating] = useState(false);
  const { managerType, darkMode } = useStore();
  
  // Debug log the messages when they change
  useEffect(() => {
    console.log('MessageList: Received messages array:', messages.length);
    if (messages.length > 0) {
      // Log counts of each message type
      const userMsgs = messages.filter(msg => msg.role === 'user').length;
      const assistantMsgs = messages.filter(msg => msg.role === 'assistant').length;
      const loadingMsgs = messages.filter(msg => msg.isLoading === true).length;
      console.log(`MessageList: Message types - User: ${userMsgs}, Assistant: ${assistantMsgs}, Loading: ${loadingMsgs}`);
      
      // Get the conversation ID from the first message
      const conversationId = messages[0]?.conversationId;
      
      // Check if conversation has changed
      if (conversationId && conversationId !== currentConversationId) {
        console.log('MessageList: Detected conversation change from', 
                    currentConversationId || 'none', 'to', conversationId);
        
        // Reset animation state on conversation change
        setLastMessage(null);
        setIsAnimating(false);
        setCurrentConversationId(conversationId);
        setHasRenderedMessages(false);
        
        // Mark ALL messages in the new conversation as already animated to prevent animation on load
        const newIds = new Set<string>();
        messages.forEach(msg => {
          if (msg.id) newIds.add(msg.id);
        });
        setAnimatedMessageIds(newIds);
        console.log('MessageList: Marked all existing messages as animated:', newIds.size);
        setHasRenderedMessages(true);
      }
    }
  }, [messages, currentConversationId]);
  
  // Only detect and animate new messages that arrive after initial load
  useEffect(() => {
    // Only look for new messages if we've already rendered the initial messages
    if (hasRenderedMessages && messages.length > 0 && !isAnimating) {
      const lastMsg = messages[messages.length - 1];
      
      // Only animate if:
      // 1. It's an assistant message
      // 2. Not a system message
      // 3. Has an ID
      // 4. Hasn't been animated before
      // 5. Belongs to the current conversation
      if (
        lastMsg.role === 'assistant' && 
        !lastMsg.isSystemMessage && 
        lastMsg.id && 
        !animatedMessageIds.has(lastMsg.id) &&
        lastMsg.conversationId === currentConversationId
      ) {
        console.log('MessageList: New assistant message detected for animation:', lastMsg.id);
        setLastMessage(lastMsg);
        setIsAnimating(true);
        
        // Add this message ID to the set of animated messages
        setAnimatedMessageIds(prev => {
          const updated = new Set([...prev]);
          updated.add(lastMsg.id as string);
          return updated;
        });
      }
    }
  }, [messages, hasRenderedMessages, animatedMessageIds, currentConversationId, isAnimating]);
  
  // Handle loading state change: when loading becomes true, we should prepare for a new message
  useEffect(() => {
    if (loading) {
      console.log('MessageList: Loading state is now true, preparing for new message');
      // Clear animation flags to ensure we'll animate the next incoming message
      setIsAnimating(false);
    }
  }, [loading]);

  // Only animate the message if it hasn't been animated before and is the last message
  const shouldAnimateMessage = (message: Message): boolean => {
    return (
      message.role === 'assistant' &&
      !message.isSystemMessage &&
      message.id === lastMessage?.id &&
      message.conversationId === currentConversationId &&
      !animatedMessageIds.has(message.id || '')
    );
  };

  // Check if a message is in loading state
  const isMessageLoading = (message: Message): boolean => {
    return message.isLoading === true;
  };

  // Debug current message state
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      console.log('MessageList: Last message:', {
        id: lastMsg.id,
        role: lastMsg.role,
        isLoading: lastMsg.isLoading,
        contentPreview: lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : ''),
        isSystemMessage: lastMsg.isSystemMessage
      });
    }
  }, [messages]);

  // Use typewriter effect only for the message being animated
  const { displayedText, isTyping } = useTypewriter(
    lastMessage?.content || '', 
    30, // Speed in milliseconds
    isAnimating // Only animate if we're actively animating
  );
  
  // When typing animation completes, update state
  useEffect(() => {
    if (isAnimating && !isTyping && lastMessage) {
      console.log('MessageList: Animation completed for message:', lastMessage.id);
      setIsAnimating(false);
    }
  }, [isTyping, isAnimating, lastMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedText]);

  // Get the content to display for a message
  const getMessageContent = (message: Message): string => {
    // For animated messages, use the typewriter effect
    if (shouldAnimateMessage(message)) {
      return displayedText;
    } 
    // For loading messages, show an empty message (we'll show dots animation separately)
    else if (isMessageLoading(message)) {
      return ""; // Empty content instead of "Thinking..."
    } 
    // For normal messages, just show the content
    else {
      return message.content;
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-4 overflow-y-auto scrollbar-thin h-full">
      {messages.length === 0 && !loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500 dark:text-gray-400">
            No messages yet. Start a conversation!
          </div>
        </div>
      ) : (
        messages.map((message, index) => {
          // Only apply the typing animation if this message needs animation
          const shouldAnimate = shouldAnimateMessage(message);
          const messageContent = getMessageContent(message);
          const isSystemMsg = message.isSystemMessage === true;

          // Skip typing animation for system messages
          if (isSystemMsg) {
            return (
              <div key={message.id || index} className="flex justify-center my-2 px-2">
                <div className="max-w-[95%] bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  {message.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={message.id || index}
              className={`w-full py-3 sm:py-4 px-2 sm:px-1`}
            >
              {message.role === 'assistant' ? (
                // Assistant message - left side
                <div className="max-w-full md:max-w-4xl mx-auto flex items-start gap-2 sm:gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {practiceMode ? (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        M
                      </div>
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full dark:bg-transparent">
                        <img src={darkMode ? logoDark : logoLight} alt="EVA Logo" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 rounded-lg py-2 px-1 max-w-[calc(100%-40px)]">
                    {practiceMode && (
                      <div className="mb-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                        Manager ({managerType})
                      </div>
                    )}
                    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none break-words bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-gray-800 dark:text-gray-200">
                      <ReactMarkdown
                        components={{
                          code(props) {
                            const { children, className } = props;
                            const match = /language-(\w+)/.exec(className || '');
                            
                            if (!match) {
                              return <code className={className}>{children}</code>;
                            }
                            
                            return (
                              <SyntaxHighlighter
                                style={oneDark as any}
                                language={match[1]}
                                PreTag="div"
                                className="text-sm sm:text-base overflow-auto max-w-full"
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            );
                          }
                        }}
                      >
                        {messageContent}
                      </ReactMarkdown>
                      {isMessageLoading(message) && (
                        <div className="flex items-center space-x-1 mt-1">
                          <span className="h-1.5 w-1.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce"></span>
                          <span className="h-1.5 w-1.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          <span className="h-1.5 w-1.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // User message - right side
                <div className="max-w-full md:max-w-4xl mx-auto flex justify-end">
                  <div className="max-w-[85%] bg-blue-600 dark:bg-blue-600 text-white dark:text-white user-message-bubble rounded-lg py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base shadow-sm">
                    {messageContent}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}; 