import axios from 'axios';
import { 
  LoginResponseDTO, 
  RegisterResponseDTO, 
  ConversationResponseDTO, 
  ConversationContentResponseDTO,
  FeedbackResponseDTO
} from '@/types/api';
import { ManagerType } from '@/types';

// Configure API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8443';
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
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
  withCredentials: true, // Enable sending cookies in cross-origin requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (DEBUG) console.log('Making request to:', config.url);
    const token = getToken();
    if (token) {
      // Ensure headers object exists
      config.headers = config.headers || {};
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with improved error handling
api.interceptors.response.use(
  (response) => {
    if (DEBUG) console.log('Response success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    if (DEBUG) {
      console.error('API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
        response: error.response?.data
      });
    }
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('token');
      // Redirect to login if needed
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth API methods
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponseDTO> => {
    try {
      console.log('Attempting login for:', email);
      const response = await api.post<LoginResponseDTO>('/api/v1/auth/login', { email, password });
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
    conversationId: 'mock-' + Date.now(),
    userId: 'mock-user',
    managerType: managerType,
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
  
  sendMessage: async (conversationId: string, userQuery: string): Promise<ConversationResponseDTO> => {
    try {
      console.log('Sending message to conversation:', conversationId);
      const response = await api.post<ConversationResponseDTO>('/api/v1/conversation/message', {
        conversationId,
        userQuery
      });
      console.log('Message sent, response received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },
  
  getConversationMessages: async (conversationId: string): Promise<ConversationContentResponseDTO[]> => {
    try {
      console.log('Fetching messages for conversation:', conversationId);
      const response = await api.get<ConversationContentResponseDTO[]>(`/api/v1/conversation/message/${conversationId}`);
      console.log('Fetched messages:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return [];
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