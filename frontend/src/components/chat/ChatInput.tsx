import React, { useState, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading = false }) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4
                  animate-in slide-in-from-bottom duration-300">
      <div className="max-w-4xl mx-auto flex items-end gap-4">
        <div className="flex-1 relative">
          <textarea
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type your message..."
            className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 
                     bg-white dark:bg-gray-900 p-3 pr-10
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                     text-gray-900 dark:text-gray-100 transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          />
          <div className={`absolute right-3 bottom-3 text-sm text-gray-400 transition-opacity duration-200
                        ${message.length > 0 ? 'opacity-100' : 'opacity-0'}`}>
            Press Enter ↵
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || isLoading}
          className={`rounded-lg bg-blue-500 p-3 text-white
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                   disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all duration-200 transform
                   ${message.trim() && !isLoading 
                     ? 'hover:bg-blue-600 hover:scale-105' 
                     : 'cursor-not-allowed'}`}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className={`h-5 w-5 transition-transform duration-200
                          ${message.trim() ? 'scale-100' : 'scale-90'}`} />
          )}
        </button>
      </div>
    </div>
  );
}; 