import React, { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (message.trim()) {
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
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white dark:from-gray-900 pt-6 pb-3">
      <div className="max-w-3xl mx-auto px-4">
        <div className="relative flex items-end bg-white dark:bg-gray-800 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(0,0,0,0.3)]">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message EVA..."
            className="w-full resize-none rounded-xl border-0 bg-transparent py-[14px] pl-5 pr-12
                     focus:ring-0 focus-visible:ring-0 dark:bg-transparent
                     text-base md:text-[16px] text-gray-900 dark:text-gray-100
                     placeholder:text-gray-500 dark:placeholder:text-gray-400"
            style={{
              maxHeight: '200px',
              minHeight: '52px',
              overflowY: 'hidden',
              height: 'auto'
            }}
            rows={1}
          />
          <button
            onClick={handleSubmit}
            disabled={!message.trim()}
            className="absolute right-3 bottom-3 p-1.5 rounded-lg
                     text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-200"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}; 