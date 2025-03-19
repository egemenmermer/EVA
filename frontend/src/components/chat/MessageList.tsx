import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { format } from 'date-fns';
import { Bot, User, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ConversationContentResponseDTO } from '@/types/api';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MessageItemProps {
  message: ConversationContentResponseDTO;
  index: number;
}

interface CustomCodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

const TypingIndicator: React.FC = () => (
  <div className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-300">
    <div className="flex-shrink-0">
      <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
        <Bot className="h-5 w-5 text-white" />
      </div>
    </div>
    <div className="flex items-center">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

const TypeWriter = ({ text, onComplete }: { text: string; onComplete: () => void }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const words = useMemo(() => text.split(/(\s+)/), [text]); // Split by whitespace but keep separators

  useEffect(() => {
    if (currentIndex < words.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + words[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 30); // Faster speed for word-by-word
      return () => clearTimeout(timeout);
    } else {
      onComplete();
    }
  }, [currentIndex, words, onComplete]);

  return <ReactMarkdown>{displayText}</ReactMarkdown>;
};

const MessageItem = ({ message, index }: MessageItemProps) => {
  const [isTyping, setIsTyping] = useState(true);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [message]);

  const isUser = message.role === 'user';

  return (
    <div
      ref={messageRef}
      className={cn(
        'flex w-full mb-4 animate-fade-in',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'flex gap-3 max-w-[80%]',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={isUser ? '/user-avatar.png' : '/ai-avatar.png'} />
          <AvatarFallback>{isUser ? 'U' : 'AI'}</AvatarFallback>
        </Avatar>

        <div
          className={cn(
            'flex flex-col rounded-lg p-4',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          )}
        >
          <div className="text-sm font-semibold mb-1">
            {isUser ? 'You' : 'AI Assistant'}
          </div>
          <div className="text-sm">
            {isUser || !isTyping ? (
              <div className="flex flex-col gap-2">
                {message.content.split('\n').map((line, i) => (
                  <div key={i} className="text-gray-700 dark:text-gray-300">
                    {line.trim().startsWith('```') ? (
                      <SyntaxHighlighter
                        language="javascript"
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, padding: '1rem', borderRadius: '0.5rem' }}
                      >
                        {line.replace(/```/g, '')}
                      </SyntaxHighlighter>
                    ) : (
                      line
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <TypeWriter
                text={message.content}
                onComplete={() => setIsTyping(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MessageList: React.FC<{ isLoading?: boolean }> = ({ isLoading }) => {
  const { messages } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-col justify-end min-h-full">
        {messages.map((message, index) => (
          <MessageItem
            key={`${message.conversationId}-${index}`}
            message={message}
            index={index}
          />
        ))}
        {isLoading && <TypingIndicator />}
      </div>
    </div>
  );
}; 