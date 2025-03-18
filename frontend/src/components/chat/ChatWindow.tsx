import React from 'react';
import { useStore } from '@/store/useStore';
import { useConversation } from '@/hooks/useConversation';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Loader2 } from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const { currentConversation, managerType } = useStore();
  const { sendMessage, isLoading } = useConversation(currentConversation?.conversationId);

  const handleSendMessage = async (message: string) => {
    if (!currentConversation) return;
    
    await sendMessage({
      conversationId: currentConversation.conversationId,
      userQuery: message,
    });
  };

  if (!currentConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Welcome to EthicAI
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Start a new conversation by clicking the "New Chat" button
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {isLoading && (
        <div className="absolute inset-0 bg-black/10 dark:bg-black/20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}
      <MessageList />
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}; 