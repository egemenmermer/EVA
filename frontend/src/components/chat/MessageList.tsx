import React, { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { BotIcon, UserIcon } from '@/components/icons';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import type { Components } from 'react-markdown';
import type { NormalComponents } from 'react-markdown/lib/complex-types';

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

  const components: Partial<NormalComponents> = {
    p: ({ children }) => (
      <p className="whitespace-pre-wrap mb-2 last:mb-0">{children}</p>
    ),
    code: ({ node, inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          language={match[1]}
          style={oneDark as any}
          PreTag="div"
          className="rounded-md text-sm"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code
          className={`${
            inline
              ? 'bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5'
              : ''
          }`}
          {...props}
        >
          {children}
        </code>
      );
    },
    ul: ({ children }) => (
      <ul className="list-disc pl-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-4 space-y-2">{children}</ol>
    ),
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col space-y-4 pb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            } px-4 md:px-6 lg:px-8`}
          >
            <div
              className={`flex ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              } items-start gap-4 max-w-[85%]`}
            >
              <div className="flex-shrink-0 mt-1">
                {message.role === 'user' ? (
                  <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-white" />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full bg-gray-600 flex items-center justify-center">
                    <BotIcon className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              <div
                className={`flex flex-col space-y-1 overflow-hidden ${
                  message.role === 'user'
                    ? 'items-end'
                    : 'items-start'
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <ReactMarkdown components={components}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start px-4 md:px-6 lg:px-8">
            <div className="flex flex-row items-start gap-4 max-w-[85%]">
              <div className="flex-shrink-0 mt-1">
                <div className="h-7 w-7 rounded-full bg-gray-600 flex items-center justify-center">
                  <BotIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <div className="rounded-2xl px-4 py-2 bg-gray-100 dark:bg-gray-800">
                  <div className="animate-pulse flex space-x-2">
                    <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                    <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                    <div className="h-2 w-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}; 