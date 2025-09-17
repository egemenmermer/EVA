import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '@/services/api';
import { ManagerType } from '@/types';
import { useStore } from '@/store/useStore';

/**
 * Hook for handling conversation operations
 */
export const useConversation = (conversationId?: string) => {
  const { setMessages, addMessage, setCurrentConversation, setUser } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch messages for a conversation (if ID is provided)
  const messagesQuery = useQuery(
    ['messages', conversationId],
    () => conversationApi.getConversationMessages(conversationId!),
    {
      enabled: !!conversationId,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        setMessages(data);
      },
      onError: (error: Error) => {
        console.error('Error fetching messages:', error);
        if (error.message.includes('401')) {
          setUser(null);
        }
      }
    }
  );

  // Start a new conversation
  const startConversationMutation = useMutation({
    mutationFn: async (managerType: ManagerType) => {
      console.log('Starting conversation with manager type:', managerType);
      return conversationApi.createConversation(managerType);
    },
    onSuccess: (data) => {
      console.log('Conversation created:', data);
      // Set the isNew flag when creating a new conversation
      setCurrentConversation({
        ...data,
        isNew: true // Mark as new conversation
      });
      // Clear messages when starting new conversation
      setMessages([]);
      queryClient.invalidateQueries(['conversations']);
    },
    onError: (error: Error) => {
      console.error('Error starting conversation:', error);
      if (error.message.includes('401')) {
        setUser(null);
      }
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; userQuery: string }) => {
      console.log('Sending message:', data);
      
      // First, immediately add the user's message to the UI
      const userMessage = {
        conversationId: data.conversationId,
        content: data.userQuery,
        role: 'user',
        createdAt: new Date().toISOString()
      };
      addMessage(userMessage);

      try {
        // Then make the API call
        const response = await conversationApi.sendMessage(data.conversationId, data.userQuery);
        console.log('Received AI response:', response);
        
        // Add the AI response
        const aiMessage = {
          conversationId: response.conversationId,
          content: response.content,
          role: 'assistant',
          createdAt: new Date().toISOString()
        };
        addMessage(aiMessage);

        return response;
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },
    onMutate: () => {
      setIsLoading(true);
    },
    onSettled: () => {
      setIsLoading(false);
      queryClient.invalidateQueries(['messages', conversationId]);
    },
    onError: (error: Error) => {
      console.error('Error sending message:', error);
      if (error.message.includes('401')) {
        setUser(null);
      }
    }
  });

  const sendMessage = (data: { conversationId: string; userQuery: string }) => 
    sendMessageMutation.mutate(data);
  
  const startConversation = (
    managerType: ManagerType, 
    callbacks?: { onSuccess?: (data: any) => void }
  ) => {
    startConversationMutation.mutate(managerType, {
      onSuccess: (data) => {
        if (callbacks?.onSuccess) {
          callbacks.onSuccess(data);
        }
      }
    });
  };

  return {
    sendMessage,
    startConversation,
    isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    error: messagesQuery.error || sendMessageMutation.error
  };
}; 