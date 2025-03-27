import axios from 'axios';
import type { ManagerType } from '@/types';
import type {
  LoginResponseDTO,
  RegisterResponseDTO,
  ConversationResponseDTO,
  ConversationContentResponseDTO,
  SendMessageRequestDTO,
  FeedbackResponseDTO
} from '@/types/api';
import { generateConversationTitle } from '@/utils/titleGenerator';

// Create API instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8443',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  validateStatus: (status) => {
    // Consider 401 as a valid status for authentication endpoints
    if (status === 401) {
      const url = window.location.pathname;
      // Don't redirect on login/register pages
      if (url === '/login' || url === '/register') {
        return true;
      }
    }
    return status >= 200 && status < 300;
  }
});

// Debug mode
const DEBUG = import.meta.env.DEV;
const BYPASS_AUTH = false; // Use real authentication

// Helper function to get token from localStorage
const getToken = (): string | null => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No token available for API request');
    return null;
  }
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

// Add request interceptor to add token to every request
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we receive a 401 Unauthorized error, clear token and user data
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Verbose debugging function
const debugRequest = (method: string, url: string, data?: any) => {
  console.log(`%c API Request: ${method} ${url}`, 'background: #222; color: #bada55');
  if (data) console.log('Request data:', data);
};

// Verbose debugging function for responses
const debugResponse = (method: string, url: string, status: number, data: any) => {
  const color = status >= 200 && status < 300 ? '#4CAF50' : '#F44336';
  console.log(`%c API Response: ${method} ${url} [${status}]`, `background: #222; color: ${color}`);
  console.log('Response data:', data);
};

// Auth API methods
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponseDTO> => {
    try {
      console.log('Attempting login for:', email);
      const response = await api.post<LoginResponseDTO>('/api/v1/auth/login', { email, password });
      console.log('Login successful:', response.data.userDetails.email);
      
      // Store token with Bearer prefix
      const token = response.data.accessToken;
      if (token) {
        const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        localStorage.setItem('token', formattedToken);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  
  register: async (email: string, password: string, fullName: string): Promise<RegisterResponseDTO> => {
    try {
      console.log('Attempting registration with:', { email, fullName });
      const response = await api.post<RegisterResponseDTO>('/api/v1/auth/register', { 
        email, 
        password, 
        fullName 
      });
      console.log('Registration successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Registration failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },
  
  logout: async (): Promise<void> => {
    console.log('Logging out user');
    localStorage.removeItem('token');
  },
  
  activate: async (token: string): Promise<any> => {
    try {
      console.log('Activating account with token:', token.substring(0, 10) + '...');
      const response = await api.post('/api/v1/auth/activate', { token });
      console.log('Activation response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Activation failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },
  
  oauth2Callback: async (provider: string, code: string): Promise<any> => {
    try {
      console.log(`Processing ${provider} OAuth callback`);
      const response = await api.post(`/auth/oauth2/${provider}`, { code });
      return response.data;
    } catch (error) {
      console.error('OAuth callback failed:', error);
      throw error;
    }
  }
};

// Debug function to simulate a conversation
const createMockConversation = (managerType: ManagerType): ConversationResponseDTO => {
  return {
    conversationId: `mock-${Date.now()}`,
    userId: 'mock-user',
    title: 'New conversation',
    managerType,
    createdAt: new Date().toISOString()
  };
};

// Conversation API methods
export const conversationApi = {
  getConversations: async (): Promise<ConversationResponseDTO[]> => {
    try {
      console.log('Fetching conversations');
      const response = await api.get<ConversationResponseDTO[]>('/api/v1/conversation');
      console.log('Fetched conversations:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      // Add more debugging info
      const err = error as any;
      console.error('Fetch conversations error details:', {
        message: err?.message || 'Unknown error',
        status: err?.response?.status,
        data: err?.response?.data
      });
      return [];
    }
  },
  
  createConversation: async (managerType: string): Promise<ConversationResponseDTO> => {
    try {
      console.log('Creating conversation with manager type:', managerType);
      const response = await api.post<ConversationResponseDTO>('/api/v1/conversation', {
        managerType
      });
      console.log('Created conversation:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create conversation error:', error);
      throw error;
    }
  },
  
  sendMessage: async (conversationId: string, userQuery: string, temperature?: number): Promise<ConversationContentResponseDTO> => {
    try {
      console.log('Sending message to conversation:', conversationId);
      console.log('Message content:', userQuery.substring(0, 50) + (userQuery.length > 50 ? '...' : ''));
      
      // Skip API call for invalid conversation IDs
      if (!conversationId || conversationId.startsWith('draft-') || conversationId.includes('mock-')) {
        throw new Error('Cannot send message to invalid conversation ID. Create a valid conversation first.');
      }
      
      if (temperature !== undefined) {
        console.log('Using temperature:', temperature);
      }
      
      const requestBody: any = {
        conversationId,
        userQuery
      };
      
      // Add temperature parameter if provided
      if (temperature !== undefined) {
        requestBody.temperature = temperature;
      }
      
      const response = await api.post<ConversationContentResponseDTO>('/api/v1/conversation/message', requestBody);
      console.log('Message sent, response received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add more debugging info
      const err = error as any;
      console.error('Send message error details:', {
        conversationId,
        messageLength: userQuery?.length,
        temperature,
        status: err?.response?.status,
        data: err?.response?.data
      });
      throw error;
    }
  },
  
  getConversationMessages: async (conversationId: string): Promise<ConversationContentResponseDTO[]> => {
    try {
      console.log('Fetching messages for conversation:', conversationId);
      
      // Skip API call for invalid conversation IDs
      if (!conversationId || conversationId.startsWith('draft-') || conversationId.includes('mock-')) {
        console.log('Skipping backend fetch for invalid conversationId:', conversationId);
        return [];
      }
      
      const response = await api.get<ConversationContentResponseDTO[]>(`/api/v1/conversation/message/${conversationId}`);
      console.log('Fetched messages:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Add more debugging info
      const err = error as any;
      console.error('Fetch messages error details:', {
        conversationId,
        status: err?.response?.status,
        data: err?.response?.data
      });
      return [];
    }
  },
  
  updateConversationTitle: async (conversationId: string, userQuery: string): Promise<string> => {
    try {
        console.log('Generating title for conversation:', conversationId);
        
        // Use a simple fallback title if the conversation is invalid or a draft
        if (!conversationId || conversationId.startsWith('draft-') || conversationId.includes('mock-')) {
            console.log('Using simple title for invalid/draft conversation');
            return userQuery.length > 25 ? userQuery.substring(0, 25) + '...' : userQuery;
        }
        
        // Create a simple title from the first message
        const simpleTitle = userQuery.length > 25 ? userQuery.substring(0, 25) + '...' : userQuery;
        
        try {
            // Try to update the title on the backend
            console.log('Updating title on backend:', simpleTitle);
            const response = await api.post<{title: string}>(`/api/v1/conversation/${conversationId}/update-title`, {
                title: simpleTitle
            });
            console.log('Title updated on backend:', response.data.title);
            return response.data.title;
        } catch (backendError) {
            console.warn('Backend title update failed, using simple title:', backendError);
            return simpleTitle;
        }
    } catch (error) {
        console.error('Failed to generate/update title:', error);
        return 'New Conversation';
    }
  },
  
  submitFeedback: async (
    conversationId: string,
    rating: number,
    comment?: string
  ): Promise<FeedbackResponseDTO> => {
    try {
      const response = await api.post<FeedbackResponseDTO>('/api/v1/feedback/submit', {
        conversationId,
        rating,
        comment
      });
      return response.data;
    } catch (error) {
      console.error('Submit feedback error:', error);
      throw error;
    }
  },

  deleteConversation: async (conversationId: string): Promise<void> => {
    try {
      console.log('Deleting conversation:', conversationId);
      
      // Skip API call for invalid conversation IDs
      if (!conversationId || conversationId.startsWith('draft-') || conversationId.includes('mock-')) {
        console.log('Skipping backend delete for invalid conversationId:', conversationId);
        return;
      }
      
      await api.delete(`/api/v1/conversation/${conversationId}`);
      console.log('Conversation deleted successfully');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  }
};

// Feedback API
export const feedbackApi = {
  getFeedback: async (conversationId: string): Promise<FeedbackResponseDTO> => {
    try {
      const response = await api.get<FeedbackResponseDTO>(`/feedback/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Get feedback error:', error);
      throw error;
    }
  }
}; 