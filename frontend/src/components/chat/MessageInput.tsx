import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  disabled = false 
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="max-w-full md:max-w-4xl mx-auto w-full px-2 sm:px-4 pb-2 sm:pb-4">
      <form onSubmit={handleSubmit} className="relative border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400">
        <textarea
          ref={textareaRef}
          className="w-full resize-none rounded-lg bg-transparent py-2 sm:py-3 pr-10 pl-3 sm:pl-4 placeholder:text-gray-400 dark:placeholder:text-gray-300 text-gray-900 dark:text-white focus:outline-none text-sm sm:text-base"
          rows={1}
          placeholder="Message EVA..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          type="submit"
          className={`absolute right-2 bottom-2 p-1.5 rounded-md transition-colors ${
            message.trim() && !disabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-300 cursor-not-allowed'
          }`}
          disabled={!message.trim() || disabled}
          aria-label="Send message"
        >
          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </form>
      <div className="text-center mt-1 sm:mt-2 text-xs text-gray-500 dark:text-gray-300">
        Press Enter to send, Shift+Enter for a new line
      </div>
    </div>
  );
}; 