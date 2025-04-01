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
import api from './axiosConfig';

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

// Debug mode
const DEBUG = import.meta.env.DEV;

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

// Helper function to get token from localStorage
const getToken = (): string | null => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No token available for API request');
    return null;
  }
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
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
        console.log('Token stored with format:', 
          formattedToken.substring(0, 10) + '...' + formattedToken.substring(formattedToken.length - 5));
        
        // Log token format but mask most of it for security
        const isBearer = formattedToken.startsWith('Bearer ');
        const hasSpace = formattedToken.includes(' ');
        console.log('Token format check - starts with Bearer:', isBearer, 'contains space:', hasSpace);
      } else {
        console.warn('No token received from login response');
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
      const response = await api.get<ConversationResponseDTO[]>('/api/v1/conversation');
      const conversations = response.data;
      
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
      const response = await api.get<ConversationContentResponseDTO[]>(`/api/v1/conversation/message/${conversationId}`);
      const messages = response.data;
      
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

// Add utility function to check token validity
export const verifyToken = async (): Promise<boolean> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No token found in localStorage');
      return false;
    }
    
    // Call the token verification endpoint
    const response = await api.get<{status?: string; message?: string}>('/api/v1/auth/verify-token');
    
    if (response.data && response.data.status === 'ok') {
      return true;
    } else {
      console.warn('Token verification failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}; 