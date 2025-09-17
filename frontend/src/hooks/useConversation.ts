import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '@/services/api';
import { ManagerType } from '@/types';
import { useStore, Message } from '@/store/useStore';
import { ConversationContentResponseDTO } from '@/types/api';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook for handling conversation operations
 */
export const useConversation = (conversationId?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setCurrentConversation, messages, setMessages, addMessage } = useStore();
  const queryClient = useQueryClient();

  // Get conversation list
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      console.log('Fetching conversations from hook...');
      try {
        const result = await conversationApi.getConversations();
        console.log('Fetched conversations in hook:', result?.length);
        return result;
      } catch (error) {
        console.error('Error fetching conversations in hook:', error);
        setError('Failed to fetch conversations. Please try again.');
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 10000
  });

  // Get messages for current conversation
  const { data: fetchedMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      try {
        const messages = await conversationApi.getConversationMessages(conversationId);
        console.log('Fetched messages for conversation:', conversationId, messages.length);
        return messages;
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to fetch messages. Please try again.');
        return [];
      }
    },
    enabled: !!conversationId && !conversationId.startsWith('draft-'),
    retry: 3,
    retryDelay: 1000,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 10000
  });

  // Update messages in store when fetchedMessages changes
  useEffect(() => {
    if (fetchedMessages && fetchedMessages.length > 0) {
      console.log('Setting messages in store:', fetchedMessages.length);
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages, setMessages]);

  // Start a new conversation
  const startConversationMutation = useMutation({
    mutationFn: async (managerType: ManagerType) => {
      try {
        const response = await conversationApi.createConversation(managerType);
        console.log('Started new conversation:', response);
        return response;
      } catch (error) {
        console.error('Error starting conversation:', error);
        setError('Failed to start new conversation. Please try again.');
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Setting new conversation:', data);
      setCurrentConversation(data);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      refetchConversations();
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; userQuery: string }) => {
      try {
        console.log('Sending message:', data);
        const response = await conversationApi.sendMessage(data.conversationId, data.userQuery);
        console.log('Message sent successfully:', response);
        return response;
      } catch (error) {
        console.error('Error sending message:', error);
        setError('Failed to send message. Please try again.');
        throw error;
      }
    },
    onMutate: () => {
      setIsLoading(true);
      setError(null);
    },
    onSettled: () => {
      setIsLoading(false);
      if (conversationId) {
        refetchMessages();
      }
      refetchConversations();
    }
  });

  // Delete conversation mutation
  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      try {
        await conversationApi.deleteConversation(conversationId);
        console.log('Conversation deleted:', conversationId);
      } catch (error) {
        console.error('Error deleting conversation:', error);
        setError('Failed to delete conversation. Please try again.');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      refetchConversations();
    }
  });

  // Helper functions
  const sendMessage = (data: { conversationId: string; userQuery: string }) => 
    sendMessageMutation.mutate(data);

  const startConversation = (
    managerType: ManagerType, 
    callbacks?: { onSuccess?: (data: any) => void }
  ) => {
    return startConversationMutation.mutate(managerType, {
      onSuccess: (data) => {
        if (callbacks?.onSuccess) {
          callbacks.onSuccess(data);
        }
      }
    });
  };

  const deleteConversation = (conversationId: string) =>
    deleteConversationMutation.mutate(conversationId);

  return {
    conversations,
    messages: fetchedMessages,
    isLoading,
    error,
    sendMessage,
    startConversation,
    deleteConversation,
    refetchConversations,
    refetchMessages
  };
}; 