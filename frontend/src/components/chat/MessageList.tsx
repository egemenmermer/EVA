import React, { useEffect, useRef, useState } from 'react';
import { UserCircle, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Custom hook for typing effect
const useTypewriter = (text: string, speed: number = 50) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
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
  }, [text, speed]);

  return { displayedText, isTyping };
};

interface Message {
  id?: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

interface Props {
  messages: Message[];
  loading?: boolean;
}

export const MessageList: React.FC<Props> = ({ messages, loading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [lastMessage, setLastMessage] = useState<Message | null>(null);
  const [hasRenderedMessages, setHasRenderedMessages] = useState(false);
  
  // Reset the typing animation state when messages array changes completely
  useEffect(() => {
    if (messages.length > 0) {
      // Check if we've switched to a new conversation
      if (lastMessage && lastMessage.conversationId !== messages[0].conversationId) {
        console.log('MessageList: Conversation changed, resetting typing state');
        setLastMessage(null);
        setHasRenderedMessages(false);
      }
      
      // Set up typing animation for the last assistant message
      if (!hasRenderedMessages) {
        const lastAssistantMessage = [...messages].reverse().find(msg => msg.role === 'assistant');
        if (lastAssistantMessage) {
          console.log('MessageList: Setting last assistant message for typing effect');
          setLastMessage(lastAssistantMessage);
          setHasRenderedMessages(true);
        }
      }
    } else {
      // If there are no messages, reset the state
      setLastMessage(null);
      setHasRenderedMessages(false);
    }
  }, [messages, hasRenderedMessages]);
  
  // When new messages come in
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && (!lastMessage || lastMsg.id !== lastMessage.id)) {
        console.log('MessageList: New assistant message detected, animating it');
        setLastMessage(lastMsg);
      }
    }
  }, [messages, lastMessage]);

  const { displayedText, isTyping } = useTypewriter(
    lastMessage?.role === 'assistant' ? lastMessage.content : '',
    50
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
          const isLastAssistantMessage = message === lastMessage;
          const messageContent = isLastAssistantMessage ? displayedText : message.content;

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
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}
              >
                <div className="mr-2 flex-shrink-0 self-end">
                  {message.role === 'user' ? (
                    <UserCircle className="h-6 w-6" />
                  ) : (
                    <Bot className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1">
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