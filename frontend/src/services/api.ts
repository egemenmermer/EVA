import axios from 'axios';
import { 
  LoginResponseDTO, 
  RegisterResponseDTO, 
  ConversationResponseDTO, 
  ConversationContentResponseDTO,
  FeedbackResponseDTO
} from '@/types/api';
import { ManagerType } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5173/api/v1';

// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// Axios instance with authorization header
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Set a very long timeout to prevent quick failures
  timeout: 60000, // 60 seconds
});

// Add interceptor to add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) {
      // Make sure token has Bearer prefix
      const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      config.headers.Authorization = formattedToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle token errors - NEVER log out automatically
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error?.response?.status, error?.response?.data);
    // Never log out automatically
    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponseDTO> => {
    try {
      const response = await apiClient.post<LoginResponseDTO>('/auth/login', { email, password });
      // Store token directly here as well
      const token = response.data.accessToken.startsWith('Bearer ') 
        ? response.data.accessToken 
        : `Bearer ${response.data.accessToken}`;
      localStorage.setItem('token', token);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (email: string, password: string, fullName: string): Promise<RegisterResponseDTO> => {
    try {
      const response = await apiClient.post<RegisterResponseDTO>('/auth/register', { email, password, fullName });
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  oauth2Callback: async (provider: string, code: string) => {
    try {
      const response = await apiClient.post<{ token: string; user: any }>(`/auth/oauth2/${provider}/callback`, { code });
      // Store token directly here as well
      const token = response.data.token.startsWith('Bearer ') 
        ? response.data.token 
        : `Bearer ${response.data.token}`;
      localStorage.setItem('token', token);
      return response.data;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  },

  activate: async (token: string) => {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/activate', { token });
      return response.data;
    } catch (error) {
      console.error('Activation error:', error);
      throw error;
    }
  }
};

// Conversation API
export const conversationApi = {
  createConversation: async (managerType: ManagerType): Promise<ConversationResponseDTO> => {
    try {
      const response = await apiClient.post<ConversationResponseDTO>('/conversation', { managerType });
      return response.data;
    } catch (error) {
      console.error('Create conversation error:', error);
      throw error;
    }
  },

  getConversations: async () => {
    try {
      const response = await apiClient.get<ConversationResponseDTO[]>('/conversation');
      return response.data;
    } catch (error) {
      console.error('Get conversations error:', error);
      throw error;
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      const response = await apiClient.delete<{ message: string }>(`/conversation/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Delete conversation error:', error);
      throw error;
    }
  },

  sendMessage: async (conversationId: string, userQuery: string): Promise<ConversationContentResponseDTO> => {
    try {
      interface MessageResponse {
        conversationId: string;
        userQuery: string;
        agentResponse: string;
        createdAt: string;
      }
      
      const response = await apiClient.post<MessageResponse>('/conversation/message', {
        conversationId,
        userQuery
      });
      
      // Map the response to the expected DTO format
      return {
        conversationId: response.data.conversationId,
        content: response.data.agentResponse,
        role: 'assistant',
        createdAt: response.data.createdAt,
        userQuery: response.data.userQuery,
        agentResponse: response.data.agentResponse
      };
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },

  getConversationMessages: async (conversationId: string): Promise<ConversationContentResponseDTO[]> => {
    try {
      interface MessageDTO {
        conversationId: string;
        userQuery: string;
        agentResponse: string;
        createdAt: string;
      }
      
      const response = await apiClient.get<MessageDTO[]>(`/conversation/message/${conversationId}`);
      
      // Create two messages from each response - one for user and one for assistant
      const messages: ConversationContentResponseDTO[] = [];
      
      response.data.forEach((msg: MessageDTO) => {
        // Add user message
        messages.push({
          conversationId: msg.conversationId,
          role: 'user',
          content: msg.userQuery,
          createdAt: msg.createdAt
        });
        
        // Add assistant response
        messages.push({
          conversationId: msg.conversationId,
          role: 'assistant',
          content: msg.agentResponse,
          createdAt: msg.createdAt
        });
      });
      
      return messages;
    } catch (error) {
      console.error('Get conversation messages error:', error);
      throw error;
    }
  }
};

// Feedback API
export const feedbackApi = {
  submitFeedback: async (
    conversationId: string,
    userFeedback: string,
    rating: number
  ): Promise<FeedbackResponseDTO> => {
    try {
      const response = await apiClient.post<FeedbackResponseDTO>('/feedback', {
        conversationId,
        userFeedback,
        rating
      });
      return response.data;
    } catch (error) {
      console.error('Submit feedback error:', error);
      throw error;
    }
  },

  getFeedback: async (conversationId: string): Promise<FeedbackResponseDTO> => {
    try {
      const response = await apiClient.get<FeedbackResponseDTO>(`/feedback/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Get feedback error:', error);
      throw error;
    }
  }
}; 