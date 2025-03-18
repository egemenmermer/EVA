import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Message } from '@/types';
import { format } from 'date-fns';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageItemProps {
  message: Message;
  isLast: boolean;
}

interface CustomCodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isLast }) => {
  const isUser = !!message.userQuery;
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLast && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLast]);

  return (
    <div
      ref={messageRef}
      className={`flex gap-4 p-4 ${isUser ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}
                animate-in fade-in slide-in-from-bottom-4 duration-300`}
    >
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {isUser ? 'You' : 'AI Assistant'}
          </span>
          <span className="text-sm text-gray-500">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
        </div>
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              code: ({ inline, className, children, ...props }: CustomCodeProps) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    {...props}
                    style={vscDarkPlus as any}
                    language={match[1]}
                    PreTag="div"
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
            {isUser ? message.userQuery : message.agentResponse}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export const MessageList: React.FC = () => {
  const { messages } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {messages.map((message, index) => (
        <MessageItem
          key={message.id}
          message={message}
          isLast={index === messages.length - 1}
        />
      ))}
    </div>
  );
}; 