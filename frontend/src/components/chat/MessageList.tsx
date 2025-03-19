import React, { useEffect, useRef } from 'react';
import { UserCircle, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col space-y-4 p-4 overflow-y-auto scrollbar-thin h-full">
      {messages.map((message, index) => (
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
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ))}
      {loading && (
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