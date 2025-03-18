import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '@/services/api';
import { useStore } from '@/store/useStore';
import type { ConversationResponseDTO } from '@/types/api';

export const useConversation = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const { user, setCurrentConversation } = useStore();

  const { data: conversations } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => user ? conversationApi.getUserConversations(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationId ? conversationApi.getConversationMessages(conversationId) : Promise.resolve([]),
    enabled: !!conversationId,
  });

  const startConversationMutation = useMutation({
    mutationFn: (managerType: string) => conversationApi.start(managerType),
    onSuccess: (data: ConversationResponseDTO) => {
      setCurrentConversation(data);
      queryClient.invalidateQueries(['conversations']);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { conversationId: string; userQuery: string }) =>
      conversationApi.sendMessage(data.conversationId, data.userQuery),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', conversationId]);
    },
  });

  return {
    conversations,
    messages,
    startConversation: startConversationMutation.mutate,
    sendMessage: sendMessageMutation.mutate,
    isLoading: startConversationMutation.isLoading || sendMessageMutation.isLoading,
  };
}; 