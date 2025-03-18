import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '@/services/api';
import { useStore } from '@/store/useStore';
import type { ConversationResponseDTO, ConversationContentResponseDTO } from '@/types/api';
import type { ManagerType } from '@/types';

export const useConversation = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const { user, setUser, setCurrentConversation, setMessages, addMessage } = useStore();

  const { data: conversations, isError: isConversationsError } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => user ? conversationApi.getUserConversations(user.id) : Promise.resolve([]),
    enabled: !!user,
    retry: false,
    onError: (error: Error) => {
      if (error.message.includes('401')) {
        // Clear user state if unauthorized
        setUser(null);
      }
    }
  });

  const { data: messages, isError: isMessagesError } = useQuery({
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
    mutationFn: (data: { conversationId: string; userQuery: string }) =>
      conversationApi.sendMessage(data.conversationId, data.userQuery),
    onSuccess: (data: ConversationContentResponseDTO) => {
      addMessage(data);
      queryClient.invalidateQueries(['messages', conversationId]);
    },
    onError: (error: Error) => {
      if (error.message.includes('401')) {
        setUser(null);
      }
    }
  });

  return {
    conversations,
    messages,
    startConversation: startConversationMutation.mutate,
    sendMessage: sendMessageMutation.mutate,
    isLoading: startConversationMutation.isLoading || sendMessageMutation.isLoading,
    isError: isConversationsError || isMessagesError
  };
}; 