import React from 'react';
import { useStore } from '@/store/useStore';
import { useConversation } from '@/hooks/useConversation';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export const ChatWindow: React.FC = () => {
  const { currentConversation, managerType, messages } = useStore();
  const { sendMessage, startConversation, isLoading } = useConversation(currentConversation?.conversationId);

  const handleSendMessage = async (message: string) => {
    try {
      if (!currentConversation) {
        // Create new conversation and send message
        startConversation(managerType, {
          onSuccess: (newConversation) => {
            sendMessage({
              conversationId: newConversation.conversationId,
              userQuery: message,
            });
          },
        });
      } else {
        // Send message in existing conversation
        sendMessage({
          conversationId: currentConversation.conversationId,
          userQuery: message,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-hidden relative">
        {!currentConversation ? (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-lg">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Welcome to EthicAI
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Start typing your message below to begin a new conversation
              </p>
            </div>
          </div>
        ) : (
          <MessageList messages={messages} loading={isLoading} />
        )}
      </div>
      <div className="flex-none mb-16">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}; 