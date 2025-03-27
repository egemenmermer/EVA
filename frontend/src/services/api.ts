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
import { v4 as uuid } from 'uuid';
import { useStore } from '@/store/useStore';

// Default manager type to use for mock conversations
const DEFAULT_MANAGER_TYPE: ManagerType = 'PUPPETEER';

// Get the current manager type from the store, or use default
const getManagerType = (): ManagerType => {
  try {
    // Try to get from localStorage first (this approach doesn't depend on React hooks)
    const storedState = localStorage.getItem('eva-store');
    if (storedState) {
      const parsedState = JSON.parse(storedState);
      if (parsedState?.state?.managerType) {
        return parsedState.state.managerType;
      }
    }
  } catch (e) {
    console.error('Error getting manager type from store:', e);
  }
  
  // Return default if not found
  return DEFAULT_MANAGER_TYPE;
};

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

// Add a function to handle API fallbacks to direct backend calls
const AGENT_BASE_URL = 'http://localhost:5001';
const BACKEND_BASE_URL = 'http://localhost:8443';

// Helper function for making requests with fallback to direct backend call
const apiRequestWithFallback = async (
  url: string, 
  options: any,
  fallbackUrl?: string
): Promise<any> => {
  try {
    // First try the agent server
    const response = await axios({
      url: `${AGENT_BASE_URL}${url}`,
      ...options,
      timeout: 5000 // 5 second timeout
    });
    return response.data;
  } catch (error: any) {
    // Check if agent server is down or timed out
    const isAgentDown = 
      error.code === 'ECONNREFUSED' || 
      error.code === 'ECONNABORTED' ||
      error.message?.includes('timeout') ||
      error.message?.includes('Network Error');
    
    // If agent server is down and we have a fallback URL
    if (isAgentDown && fallbackUrl) {
      console.log('Agent server is down, falling back to direct backend call');
      try {
        // Try direct backend call
        const fallbackResponse = await axios({
          url: `${BACKEND_BASE_URL}${fallbackUrl}`,
          ...options,
          timeout: 8000 // 8 second timeout for backend
        });
        return fallbackResponse.data;
      } catch (backendError: any) {
        console.error('Backend fallback also failed:', backendError);
        throw backendError;
      }
    }
    
    // If no fallback or other error
    throw error;
  }
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
    debugRequest('GET', '/api/v1/conversation');
    
    try {
      const conversations = await apiRequestWithFallback(
        '/api/v1/conversation',
        { method: 'GET' },
        '/api/v1/conversation' // Same endpoint for fallback
      );
      
      debugResponse('GET', '/api/v1/conversation', 200, conversations);
      
      // If we received no conversations or an empty array, return mock data
      if (!conversations || (Array.isArray(conversations) && conversations.length === 0)) {
        console.log('No conversations returned, falling back to mock data');
        const currentManagerType = getManagerType();
        return [createMockConversation(currentManagerType)];
      }
      
      // Otherwise, return the conversations from the API
      return conversations;
    } catch (error) {
      console.error('Error getting conversations:', error);
      // Return mock data as fallback
      const currentManagerType = getManagerType();
      return [createMockConversation(currentManagerType)];
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
  
  sendMessage: async (
    conversationId: string, 
    content: string,
    temperature?: number
  ): Promise<any> => {
    debugRequest('POST', '/api/v1/conversation/message', { conversationId, content, temperature });
    
    try {
      const payload = {
        conversationId,
        content,
        temperature: temperature || 0.7
      };

      // Make the request to our agent
      const response = await api.post('/api/v1/conversation/message', payload);
      debugResponse('POST', '/api/v1/conversation/message', response.status, response.data);
      
      // Log the complete response
      console.log('Complete response from sendMessage:', JSON.stringify(response.data));
      
      return response.data; // New format will have messages array with loading indicator
    } catch (error) {
      console.error('Error calling sendMessage:', error);
      
      // Return a fallback response format with loading indicator
      const timestamp = new Date().toISOString();
      
      return {
        messages: [
          {
            id: generateId(),
            conversationId,
            role: 'assistant',
            content: 'I encountered an error processing your request. Please try again.',
            createdAt: timestamp,
            isLoading: false
          }
        ]
      };
    }
  },
  
  getConversationMessages: async (conversationId: string): Promise<ConversationContentResponseDTO[]> => {
    debugRequest('GET', `/api/v1/conversation/message/${conversationId}`);
    
    try {
      const messages = await apiRequestWithFallback(
        `/api/v1/conversation/message/${conversationId}`, 
        { method: 'GET' },
        `/api/v1/conversation/message/${conversationId}` // Same endpoint for fallback
      );
      
      debugResponse('GET', `/api/v1/conversation/message/${conversationId}`, 200, messages);
      return messages;
    } catch (error) {
      console.error(`Error getting messages for conversation ${conversationId}:`, error);
      
      // Try to get messages from localStorage as a last resort
      try {
        const savedMessages = localStorage.getItem(`messages-${conversationId}`);
        if (savedMessages) {
          return JSON.parse(savedMessages);
        }
      } catch (localStorageError) {
        console.error('Error getting messages from localStorage:', localStorageError);
      }
      
      // Return empty array if all else fails
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
  },

  getMessages: async (conversationId: string): Promise<any> => {
    debugRequest('GET', `/api/v1/conversation/message/${conversationId}`);
    
    try {
      const response = await api.get(`/api/v1/conversation/message/${conversationId}`);
      debugResponse('GET', `/api/v1/conversation/message/${conversationId}`, response.status, response.data);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching messages for conversation ${conversationId}:`, error);
      return [];
    }
  },

  getAllMessages: async (): Promise<ConversationContentResponseDTO[]> => {
    // Implementation needed
    throw new Error("Method not implemented");
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

// Helper function to generate IDs
const generateId = () => {
  return crypto.randomUUID?.() || `msg-${Date.now()}`;
}; 