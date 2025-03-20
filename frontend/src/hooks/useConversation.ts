import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '@/services/api';
import { ManagerType } from '@/types';
import { useStore } from '@/store/useStore';
import { ConversationContentResponseDTO, ConversationResponseDTO } from '@/types/api';
import { v4 as uuidv4 } from 'uuid';

/**
 * Hook for handling conversation operations
 */
export const useConversation = (conversationId?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const { setCurrentConversation, messages, setMessages, addMessage } = useStore();
  const queryClient = useQueryClient();

  // Get conversation list
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      console.log('Fetching conversations from hook...');
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('No token available, cannot fetch conversations');
          return [];
        }
        
        const result = await conversationApi.getConversations();
        console.log('Fetched conversations in hook:', result?.length);
        return result;
      } catch (error) {
        console.error('Error fetching conversations in hook:', error);
        return [];
      }
    },
    retry: 3,
    retryDelay: 1000,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 10000,
    onError: (error: Error) => {
      console.error('Error fetching conversations:', error);
    }
  });

  // Periodically refresh conversations
  useEffect(() => {
    console.log('Setting up conversation refresh interval');
    const intervalId = setInterval(() => {
      console.log('Refresh interval triggered');
      refetchConversations();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [refetchConversations]);

  // Force initial fetch
  useEffect(() => {
    // Short timeout to let things initialize
    setTimeout(() => {
      console.log('Forcing initial conversation fetch');
      refetchConversations();
    }, 500);
  }, [refetchConversations]);

  // Get messages for current conversation
  const { data: fetchedMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationId ? conversationApi.getConversationMessages(conversationId) : Promise.resolve([]),
    enabled: !!conversationId,
    retry: 3,
    retryDelay: 1000,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 10000,
    onSuccess: (data) => {
      if (data && Array.isArray(data)) {
        console.log('Fetched messages:', data.length);
        setMessages(data);
      }
    },
    onError: (error: Error) => {
      console.error('Error fetching messages:', error);
    }
  });

  // Set messages in store when fetchedMessages changes
  useEffect(() => {
    if (fetchedMessages && fetchedMessages.length > 0) {
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages, setMessages]);

  // Start a new conversation
  const startConversationMutation = useMutation({
    mutationFn: (managerType: ManagerType) => conversationApi.createConversation(managerType),
    onSuccess: (data) => {
      console.log('Started new conversation:', data);
      setCurrentConversation(data);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setTimeout(() => refetchConversations(), 300);
    },
    onError: (error: Error) => {
      console.error('Error starting conversation:', error);
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; userQuery: string }) => {
      console.log('Sending message:', data);
      
      // Add user message to UI immediately
      const userMessage: ConversationContentResponseDTO = {
        id: uuidv4(),
        conversationId: data.conversationId,
        userQuery: data.userQuery,
        createdAt: new Date().toISOString()
      };
      addMessage(userMessage);

      try {
        // Make API call
        const response = await conversationApi.sendMessage(data.conversationId, data.userQuery);
        console.log('Received AI response:', response);
        
        // Add AI response to UI
        const aiMessage: ConversationContentResponseDTO = {
          id: uuidv4(),
          conversationId: response.conversationId,
          agentResponse: response.agentResponse,
          createdAt: new Date().toISOString()
        };
        addMessage(aiMessage);

        return response;
      } catch (error) {
        console.error('Error sending message:', error);
        throw error;
      }
    },
    onMutate: () => {
      setIsLoading(true);
    },
    onSettled: () => {
      setIsLoading(false);
      if (conversationId) {
        refetchMessages();
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: Error) => {
      console.error('Error in message mutation:', error);
    }
  });

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

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) => conversationApi.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setTimeout(() => refetchConversations(), 300);
    }
  });

  return {
    conversations,
    messages,
    isLoading,
    sendMessage,
    startConversation,
    deleteConversation: deleteConversationMutation.mutate,
    refetchConversations
  };
}; 