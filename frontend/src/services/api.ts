import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  LoginResponseDTO, 
  RegisterResponseDTO, 
  ConversationResponseDTO, 
  ConversationContentResponseDTO,
  FeedbackResponseDTO
} from '@/types/api';
import { ManagerType } from '@/types';

// Configure API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8443/api/v1';
console.log('Using API URL:', API_URL);

// Debug mode
const DEBUG = true;

// Helper function to get token from localStorage
const getToken = (): string | null => {
  const token = localStorage.getItem('token');
  if (DEBUG) console.log(`Token retrieved from localStorage: ${token ? 'exists' : 'null'}`);
  return token;
};

// Debug token - use this to prevent failures during development
const TEMP_DEBUG_TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNjQ5NjU0MDM3LCJleHAiOjE3MDQwMDAwMDB9.dummy_token_for_testing';

// Create a standalone testing token - modify as needed for your backend
const getFallbackToken = () => {
  const hardcodedToken = TEMP_DEBUG_TOKEN;
  console.log('⚠️ Using fallback token for testing');
  return hardcodedToken;
};

// API instance with interceptors
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      // Make sure the token has the 'Bearer ' prefix
      const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      config.headers.Authorization = formattedToken;
      if (DEBUG) console.log('Request with auth token:', config.url);
    } else {
      if (DEBUG) console.log('Request without auth token:', config.url);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (DEBUG) console.log('Response success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error.config?.url, error.response?.status, error.message);
    
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response?.status === 401) {
      console.warn('Authentication error. Redirecting to login.');
      // You might want to clear token and redirect to login here
    }
    
    return Promise.reject(error);
  }
);

// Auth API methods
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponseDTO> => {
    try {
      console.log('Attempting login for:', email);
      const response: AxiosResponse<LoginResponseDTO> = await api.post('/auth/login', { email, password });
      console.log('Login successful:', response.data.userDetails.email);
      
      // Store token in localStorage
      const token = response.data.accessToken;
      localStorage.setItem('token', token);
      
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },
  
  register: async (email: string, password: string, fullName: string): Promise<RegisterResponseDTO> => {
    try {
      console.log('Attempting registration for:', email);
      const response: AxiosResponse<RegisterResponseDTO> = await api.post('/auth/register', { 
        email, 
        password, 
        fullName 
      });
      console.log('Registration response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },
  
  logout: async (): Promise<void> => {
    console.log('Logging out user');
    localStorage.removeItem('token');
  },
  
  activate: async (token: string): Promise<any> => {
    try {
      console.log('Activating account with token');
      const response = await api.post('/auth/activate', { token });
      return response.data;
    } catch (error) {
      console.error('Activation failed:', error);
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
    conversationId: 'mock-' + Date.now(),
    userId: 'mock-user',
    managerType: managerType,
    createdAt: new Date().toISOString()
  };
};

// Conversation API methods
export const conversationApi = {
  createConversation: async (managerType: ManagerType): Promise<ConversationResponseDTO> => {
    try {
      console.log('Creating conversation with manager type:', managerType);
      const response = await api.post('/conversation', { managerType });
      console.log('Conversation created:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  },
  
  getConversations: async (): Promise<ConversationResponseDTO[]> => {
    try {
      console.log('Fetching conversations');
      const response = await api.get('/conversation');
      console.log('Fetched conversations:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      throw error;
    }
  },
  
  deleteConversation: async (conversationId: string): Promise<void> => {
    try {
      console.log('Deleting conversation:', conversationId);
      await api.delete(`/conversation/${conversationId}`);
      console.log('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw error;
    }
  },
  
  sendMessage: async (conversationId: string, userQuery: string): Promise<any> => {
    try {
      console.log('Sending message to conversation:', conversationId);
      const response = await api.post('/conversation/message', {
        conversationId,
        userQuery
      });
      console.log('Message sent, response received');
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },
  
  getConversationMessages: async (conversationId: string): Promise<any[]> => {
    try {
      console.log('Fetching messages for conversation:', conversationId);
      const response = await api.get(`/conversation/message/${conversationId}`);
      console.log('Fetched messages:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
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
      const response = await api.post<FeedbackResponseDTO>('/feedback', {
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
      const response = await api.get<FeedbackResponseDTO>(`/feedback/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Get feedback error:', error);
      throw error;
    }
  }
}; 