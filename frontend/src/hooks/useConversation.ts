import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '@/services/api';
import { useStore } from '@/store/useStore';
import type { ConversationResponseDTO, ConversationContentResponseDTO } from '@/types/api';
import type { ManagerType } from '@/types';

export const useConversation = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const { user, setUser, setCurrentConversation, setMessages, addMessage, currentConversation } = useStore();

  const { data: conversations, isError: isConversationsError } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => user ? conversationApi.getUserConversations(user.id) : Promise.resolve([]),
    enabled: !!user,
    retry: false,
    onError: (error: Error) => {
      if (error.message.includes('401')) {
        setUser(null);
      }
    }
  });

  const { data: messages, isLoading: isMessagesLoading, isError: isMessagesError } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationId ? conversationApi.getConversationMessages(conversationId) : Promise.resolve([]),
    enabled: !!conversationId && !!user,
    retry: false,
    onSuccess: (data) => {
      setMessages(data);
    },
    onError: (error: Error) => {
      if (error.message.includes('401')) {
        setUser(null);
      }
    }
  });

  const startConversationMutation = useMutation({
    mutationFn: (managerType: ManagerType) => conversationApi.start(managerType),
    onSuccess: (data: ConversationResponseDTO) => {
      setCurrentConversation(data);
      queryClient.invalidateQueries(['conversations']);
    },
    onError: (error: Error) => {
      if (error.message.includes('401')) {
        setUser(null);
      }
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; userQuery: string }) => {
      // First, immediately add the user's message to the UI
      const userMessage: ConversationContentResponseDTO = {
        conversationId: data.conversationId,
        content: data.userQuery,
        role: 'user',
        createdAt: new Date().toISOString()
      };
      addMessage(userMessage);

      // Then make the API call
      const response = await conversationApi.sendMessage(data.conversationId, data.userQuery);
      
      // Add the AI response
      const aiMessage: ConversationContentResponseDTO = {
        conversationId: response.conversationId,
        content: response.content,
        role: 'assistant',
        createdAt: new Date().toISOString()
      };
      addMessage(aiMessage);

      return response;
    },
    onError: (error: Error) => {
      if (error.message.includes('401')) {
        setUser(null);
      }
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) => conversationApi.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries(['conversations']);
      // Clear current conversation if it was deleted
      if (currentConversation?.conversationId === conversationId) {
        setCurrentConversation(null);
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('401')) {
        setUser(null);
      }
      console.error('Failed to delete conversation:', error);
    }
  });

  return {
    conversations,
    messages,
    startConversation: startConversationMutation.mutate,
    sendMessage: sendMessageMutation.mutate,
    deleteConversation: deleteConversationMutation.mutate,
    isLoading: startConversationMutation.isLoading || sendMessageMutation.isLoading || isMessagesLoading,
    isError: isConversationsError || isMessagesError
  };
}; 