import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading = false, disabled = false }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !isLoading && !disabled) {
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

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white dark:from-gray-900 dark:via-gray-900 pt-8 pb-4 px-4 z-10">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end bg-white dark:bg-gray-800 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(0,0,0,0.3)]">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message EVA..."
            disabled={isLoading || disabled}
            className="w-full resize-none rounded-xl border-0 bg-transparent py-4 pl-5 pr-14
                     focus:ring-0 focus-visible:ring-0 dark:bg-transparent
                     text-base md:text-[16px] text-gray-900 dark:text-gray-100
                     placeholder:text-gray-500 dark:placeholder:text-gray-400
                     disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              minHeight: '56px',
              maxHeight: '120px',
              height: 'auto',
            }}
            rows={1}
          />
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading || disabled}
            className="absolute right-3 bottom-3 p-2.5 rounded-lg
                     text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-200"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}; 