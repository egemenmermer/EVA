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
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const deleteMessage = useStore(state => state.deleteMessage);
  const messageRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [message]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default browser context menu
    e.stopPropagation(); // Stop event from bubbling up
    
    // Calculate position relative to viewport
    const x = e.clientX;
    const y = e.clientY;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get context menu dimensions (approximate if not yet rendered)
    const menuWidth = 150; // Approximate width of context menu
    const menuHeight = 40; // Approximate height of context menu
    
    // Adjust position if it would render outside viewport
    const adjustedX = Math.min(x, viewportWidth - menuWidth);
    const adjustedY = Math.min(y, viewportHeight - menuHeight);
    
    setContextMenuPosition({ x: adjustedX, y: adjustedY });
    setShowContextMenu(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteMessage(`${message.conversationId}-${index}`);
    setShowContextMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };

    const handleScroll = () => {
      setShowContextMenu(false);
    };

    // Add event listeners
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('scroll', handleScroll);
    document.addEventListener('contextmenu', (e) => {
      if (!messageRef.current?.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    });

    return () => {
      // Remove event listeners
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('contextmenu', (e) => {
        if (!messageRef.current?.contains(e.target as Node)) {
          setShowContextMenu(false);
        }
      });
    };
  }, []);

  const isUser = message.role === 'user';

  return (
    <div
      ref={messageRef}
      className={cn(
        'flex w-full mb-4 animate-fade-in',
        isUser ? 'justify-end' : 'justify-start'
      )}
      onContextMenu={handleContextMenu}
    >
      <div
        className={cn(
          'flex gap-3 max-w-[80%] relative', // Added relative positioning
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={isUser ? '/user-avatar.png' : '/ai-avatar.png'} />
          <AvatarFallback>{isUser ? 'U' : 'AI'}</AvatarFallback>
        </Avatar>

        <div
          className={cn(
            'flex flex-col rounded-lg p-4 relative', // Added relative positioning
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
              <ReactMarkdown
                components={{
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        language={match[1]}
                        PreTag="div"
                        style={vscDarkPlus}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <TypeWriter
                text={message.content}
                onComplete={() => setIsTyping(false)}
              />
            )}
          </div>

          {/* Context Menu */}
          {showContextMenu && (
            <div
              ref={contextMenuRef}
              className="fixed bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2 z-50"
              style={{
                top: contextMenuPosition.y,
                left: contextMenuPosition.x,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg w-full"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const MessageList: React.FC<{ isLoading?: boolean }> = ({ isLoading }) => {
  const { messages } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="flex flex-col min-h-full">
        <div className="flex-1" />
        {messages.map((message, index) => (
          <MessageItem
            key={`${message.conversationId}-${index}`}
            message={message}
            index={index}
          />
        ))}
      </div>
      {isLoading && <TypingIndicator />}
    </div>
  );
}; 