import React, { useEffect, useRef, useState } from 'react';
import { UserCircle, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore } from '@/store/useStore';

// Custom hook for typing effect
const useTypewriter = (text: string, speed: number = 50, shouldAnimate: boolean = true) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // If animation is disabled, just set the text directly
    if (!shouldAnimate) {
      setDisplayedText(text);
      return;
    }
    
    setIsTyping(true);
    setDisplayedText('');
    
    // Split text into words, preserving spaces and punctuation
    const words = text.match(/\S+|\s+|[.,!?;:]/g) || [];
    let currentText = '';
    let currentIndex = 0;

    const typeNextWord = () => {
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

    return () => {
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
  const { managerType } = useStore();
  
  // Debug log the messages when they change
  useEffect(() => {
    console.log('MessageList: Received messages array:', messages.length);
    if (messages.length > 0) {
      // Log counts of each message type
      const userMsgs = messages.filter(msg => msg.role === 'user').length;
      const assistantMsgs = messages.filter(msg => msg.role === 'assistant').length;
      console.log(`MessageList: Message types - User: ${userMsgs}, Assistant: ${assistantMsgs}`);
      
      // Log the last few messages for debugging
      if (messages.length > 0) {
        const lastFewMessages = messages.slice(-3);
        console.log('MessageList: Last few messages:', lastFewMessages);
      }
    }
  }, [messages]);
  
  // Reset state when conversation changes
  useEffect(() => {
    if (messages.length > 0) {
      // Check if we've switched to a new conversation
      if (lastMessage && lastMessage.conversationId !== messages[0].conversationId) {
        console.log('MessageList: Conversation changed, resetting state');
        setLastMessage(null);
        setHasRenderedMessages(false);
        // Reset animated message IDs when conversation changes
        setAnimatedMessageIds(new Set());
      }
      
      // Mark all initially loaded messages as already animated
      if (!hasRenderedMessages) {
        console.log('MessageList: Marking initial messages as already animated');
        const initialIds = new Set<string>();
        messages.forEach(msg => {
          if (msg.id) initialIds.add(msg.id);
        });
        setAnimatedMessageIds(initialIds);
        setHasRenderedMessages(true);
      }
    } else {
      // If there are no messages, reset the state
      setLastMessage(null);
      setHasRenderedMessages(false);
      setAnimatedMessageIds(new Set());
    }
  }, [messages, hasRenderedMessages, lastMessage]);
  
  // When new messages come in, only animate them if they're truly new
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      // Only animate if: it's an assistant message, not a system message, and hasn't been animated before
      if (
        lastMsg.role === 'assistant' && 
        !lastMsg.isSystemMessage && 
        lastMsg.id && 
        !animatedMessageIds.has(lastMsg.id)
      ) {
        console.log('MessageList: New assistant message detected for animation:', lastMsg.id);
        setLastMessage(lastMsg);
        // Add this message ID to the set of animated messages
        setAnimatedMessageIds(prev => new Set([...prev, lastMsg.id as string]));
      }
    }
  }, [messages, animatedMessageIds]);

  // Only animate the last message if it hasn't been animated before
  const shouldAnimateLastMessage = !!(lastMessage?.id && !animatedMessageIds.has(lastMessage.id));
  const { displayedText, isTyping } = useTypewriter(
    lastMessage?.content || '', 
    50,
    shouldAnimateLastMessage
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedText]);

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
          // Only apply the typing animation if this is the last message and it needs animation
          const isLastAssistantMessage = message === lastMessage && shouldAnimateLastMessage;
          const messageContent = isLastAssistantMessage ? displayedText : message.content;
          const isSystemMsg = message.isSystemMessage === true;

          // Skip typing animation for system messages
          if (isSystemMsg) {
            return (
              <div key={message.id || index} className="flex justify-center">
                <div className="max-w-[90%] bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  {message.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={message.id || index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`flex max-w-[80%] md:max-w-[70%] rounded-lg p-4 animate-in slide-in-from-bottom-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : practiceMode
                      ? 'bg-purple-100 dark:bg-purple-900 text-gray-900 dark:text-gray-100 border border-purple-200 dark:border-purple-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="mr-2 flex-shrink-0 self-end">
                  {message.role === 'user' ? (
                    <UserCircle className="h-6 w-6" />
                  ) : (
                    practiceMode ? (
                      <div className="h-6 w-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        M
                      </div>
                    ) : (
                      <Bot className="h-6 w-6" />
                    )
                  )}
                </div>
                <div className="flex-1">
                  {practiceMode && message.role === 'assistant' && (
                    <div className="mb-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                      Manager ({managerType})
                    </div>
                  )}
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
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        );
                      }
                    }}
                  >
                    {messageContent}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })
      )}
      {(loading || isTyping) && (
        <div className="flex justify-start">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 animate-pulse flex items-center space-x-2">
            <Bot className="h-6 w-6" />
            <div className="h-4 w-28 bg-gray-300 dark:bg-gray-600 rounded" />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}; 