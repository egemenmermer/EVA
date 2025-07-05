import axios from 'axios';
import type { ManagerType } from '@/types';
import type {
  LoginResponseDTO,
  RegisterResponseDTO,
  ConversationResponseDTO,
  ConversationContentResponseDTO,
  SendMessageRequestDTO,
  FeedbackResponseDTO,
  ActivationResponseDTO,
  TokenVerificationResponse
} from '@/types/api';
import { Message } from '@/types/conversation';
import { generateConversationTitle } from '@/utils/titleGenerator';
import { v4 as uuid } from 'uuid';
import { useStore } from '@/store/useStore';
import api from './axiosConfig';
import { agentApi, backendApi } from './axiosConfig';
import { Conversation } from '@/types/conversation';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8443';

// Default manager type to use for mock conversations
const DEFAULT_MANAGER_TYPE: ManagerType = 'PUPPETEER';

// Get the current manager type from the store, or use default
export const getManagerType = (): ManagerType => {
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

// Check authorization status and debug tokens
export const debugAuthTokens = (): void => {
  try {
    // Log all keys in localStorage to help diagnose token issues
    console.log("Checking all localStorage keys for potential tokens:");
    const allKeys = Object.keys(localStorage);
    console.log(`Found ${allKeys.length} keys in localStorage`);
    
    // Log interesting keys
    const tokenKeys = allKeys.filter(key => 
      key.includes('token') || 
      key.includes('Token') || 
      key.includes('auth') || 
      key.includes('Auth') || 
      key.includes('jwt')
    );
    
    if (tokenKeys.length > 0) {
      console.log("Potential token keys found:", tokenKeys);
      tokenKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          const isBearerToken = value.startsWith('Bearer ');
          const isJwtFormat = value.split('.').length === 3 || 
                             (value.startsWith('Bearer ') && value.substring(7).split('.').length === 3);
          
          console.log(`Key: ${key} - Has Bearer prefix: ${isBearerToken}, Appears to be JWT format: ${isJwtFormat}`);
          console.log(`First 15 chars: ${value.substring(0, 15)}...`);
        }
      });
    } else {
      console.log("No potential token keys found in localStorage");
    }
  } catch (error) {
    console.error("Error during token debugging:", error);
  }
};

// Automatically run token debugging on import
debugAuthTokens();

// Get the authentication token from local storage with better error handling
export const getToken = (): string | null => {
  try {
    console.log("Retrieving authentication token from localStorage");
    
    // Try all possible token storage keys
    const possibleKeys = ['token', 'accessToken', 'authToken', 'jwt', 'jwtToken', 'id_token'];
    let token = null;
    
    // Try each key
    for (const key of possibleKeys) {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        console.log(`Found potential token under '${key}' key`);
        token = storedValue;
        break;
      }
    }
    
    if (!token) {
      console.warn("No token found in localStorage under any common keys");
      return null;
    }
    
    // Ensure token is properly formatted with Bearer prefix
    if (!token.startsWith('Bearer ')) {
      console.log("Adding 'Bearer ' prefix to token");
      token = `Bearer ${token}`;
    } else {
      console.log("Token already has 'Bearer ' prefix");
    }
    
    // Validate that it looks like a JWT format (for debugging)
    const tokenWithoutBearer = token.startsWith('Bearer ') ? token.substring(7) : token;
    const parts = tokenWithoutBearer.split('.');
    
    if (parts.length !== 3) {
      console.warn("Token does not have standard JWT format (should have 3 parts separated by dots)");
    }
    
    return token;
  } catch (error) {
    console.error("Error retrieving token from localStorage:", error);
    return null;
  }
};

// Set auth header for axios
const setAuthHeader = () => {
  const token = getToken();
  if (token) {
    // Ensure token is properly formatted with Bearer prefix
    axios.defaults.headers.common['Authorization'] = token;
    console.log("Set Authorization header to:", `${token.substring(0, 15)}...`);
    return true;
  } else {
    console.warn("No token available for Authorization header");
    return false;
  }
};

// Auth API methods
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponseDTO> => {
    try {
      console.log('Attempting login for:', email);
      const response = await axios.post<LoginResponseDTO>(`${BACKEND_URL}/api/v1/auth/login`, { email, password });
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
      const response = await axios.post<RegisterResponseDTO>(`${BACKEND_URL}/api/v1/auth/register`, { 
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
    console.log("Logged out, token removed, redirecting to /login");
    window.location.href = '/login';
  },
  
  activate: async (token: string): Promise<ActivationResponseDTO> => {
    try {
      console.log('Activating account with token:', token.substring(0, 10) + '...');
      const response = await axios.get(`${BACKEND_URL}/api/v1/auth/activate?token=${token}`);
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
  
  oauth2Callback: async (provider: string, code: string): Promise<{ token: string; user: any }> => {
    try {
      console.log(`Processing ${provider} OAuth callback`);
      const response = await axios.post(`${BACKEND_URL}/api/v1/auth/oauth2/${provider}/callback`, { code });
      return response.data;
    } catch (error) {
      console.error('OAuth callback failed:', error);
      throw error;
    }
  },

  submitManagerTypeQuiz: async (quizData: {
    answers: Record<string, string | number>;
  }): Promise<{ determinedManagerType: string; message: string; success: boolean }> => {
    const response = await axios.post(`${BACKEND_URL}/api/v1/manager-type-quiz/submit`, quizData);
    return response.data;
  },

  resendActivation: async (email: string): Promise<{ message: string }> => {
    try {
      const response = await axios.post<{ message: string }>(`${BACKEND_URL}/api/v1/auth/resend-activation`, { email });
      return response.data;
    } catch (error) {
      console.error('Resend activation failed:', error);
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
    debugRequest('GET', '/v1/conversation');
    
    try {
      // Ensure auth header is set
      setAuthHeader();
      
      const response = await axios.get<ConversationResponseDTO[]>(`${BACKEND_URL}/api/v1/conversation`);
      const conversations = response.data;
      
      debugResponse('GET', '/v1/conversation', 200, conversations);
      
      // Return empty array if no conversations instead of mock data
      if (!conversations || (Array.isArray(conversations) && conversations.length === 0)) {
        console.log('No conversations found');
        return [];
      }
      
      return conversations;
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error; // Don't return mock data, let the UI handle the error
    }
  },
  
  createConversation: async (managerType: string): Promise<ConversationResponseDTO> => {
    try {
      console.log('Creating conversation with manager type:', managerType);
      setAuthHeader();
      
      const response = await axios.post<ConversationResponseDTO>(`${BACKEND_URL}/api/v1/conversation`, {
        managerType,
        title: 'New Conversation' // Add a default title
      });
      
      console.log('Created conversation:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create conversation error:', error);
      throw error;
    }
  },
  
  getConversationContents: async (conversationId: string): Promise<ConversationContentResponseDTO[]> => {
    debugRequest('GET', `/v1/conversation/${conversationId}`);
    try {
      setAuthHeader();
      const response = await axios.get<ConversationContentResponseDTO[]>(`${BACKEND_URL}/api/v1/conversation/${conversationId}`);
      debugResponse('GET', `/v1/conversation/${conversationId}`, 200, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error getting contents for conversation ${conversationId}:`, error);
      throw error;
    }
  },

  sendMessage: async (conversationId: string, message: SendMessageRequestDTO): Promise<Message> => {
    try {
      console.log(`Sending message to conversation ${conversationId}`);
      setAuthHeader();
      const response = await axios.post<Message>(`${BACKEND_URL}/api/v1/conversation/${conversationId}`, message);
      console.log('Received response from send message:', response.data);
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },

  updateMessageDraft: async (conversationId: string, messageId: number, draft: string) => {
    try {
      setAuthHeader();
      const response = await axios.put(`${BACKEND_URL}/api/v1/conversation/${conversationId}/messages/${messageId}`, {
        draft,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating message draft:', error);
      throw error;
    }
  },

  submitFinalizedMessage: async (conversationId: string, messageId: number, content: string) => {
    try {
      setAuthHeader();
      const response = await axios.post(`${BACKEND_URL}/api/v1/conversation/${conversationId}/messages/${messageId}/finalize`, {
        content,
      });
      return response.data;
    } catch (error) {
      console.error('Error finalizing message:', error);
      throw error;
    }
  },

  deleteMessage: async (conversationId: string, messageId: number) => {
    try {
      setAuthHeader();
      const response = await axios.delete(`${BACKEND_URL}/api/v1/conversation/${conversationId}/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  },

  updateTitle: async (conversationId: string, title: string) => {
    try {
      setAuthHeader();
      const response = await axios.put(`${BACKEND_URL}/api/v1/conversation/${conversationId}/title`, { title });
      return response.data;
    } catch (error) {
      console.error('Error updating title:', error);
      throw error;
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      setAuthHeader();
      const response = await axios.delete(`${BACKEND_URL}/api/v1/conversation/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },
};

// Feedback API
export const feedbackApi = {
  getFeedback: async (conversationId: string): Promise<FeedbackResponseDTO> => {
    try {
      const response = await axios.get<FeedbackResponseDTO>(`${BACKEND_URL}/api/feedback/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Get feedback error:', error);
      throw error;
    }
  }
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8443';
const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:5001';

export const getKnowledgeArtifacts = async (
  conversationId: string
): Promise<{ guidelines: any[]; caseStudies: any[] }> => {
  if (!conversationId) {
    console.warn('Cannot fetch artifacts without a conversationId');
    return { guidelines: [], caseStudies: [] };
  }

  // Define the endpoint relative to the backend base URL
  const endpointPath = `/v1/knowledge-artifacts/${conversationId}`;

  try {
    // Use backendApi which already has the base URL (8443) and interceptors
    const response = await axios.get<any>(`${BACKEND_URL}/api${endpointPath}`, {
      params: { _: new Date().getTime() }, // Add cache buster as query param
    });

    console.log(`Artifact fetch from backend: Status ${response.status}`);

    if (
      response.data &&
      Array.isArray(response.data.guidelines) &&
      Array.isArray(response.data.caseStudies)
    ) {
      // Return the successful data
      return {
        guidelines: response.data.guidelines || [],
        caseStudies: response.data.caseStudies || [],
      };
    } else {
      console.warn(`Malformed artifact data from backend`, response.data);
    }
  } catch (err: any) {
    if (err.response) {
      console.error(
        `Error fetching artifacts from backend: ${err.response.status}`,
        err.response.data
      );
    } else {
      console.error('Network or other error fetching artifacts:', err.message);
    }
  }

  // Fallback to returning empty artifacts if anything goes wrong
  return { guidelines: [], caseStudies: [] };
};

export const login = authApi.login;
export const logout = authApi.logout;

export const verifyToken = async (): Promise<boolean> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const response = await axios.get<TokenVerificationResponse>(`${BACKEND_URL}/api/v1/auth/verify-token`, {
      headers: { Authorization: token }
    });

    return response.data.status === 'ok';
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
};

// Initialize axios interceptors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getAdminAnalytics = async () => {
  try {
    setAuthHeader();
    const response = await axios.get(`${BACKEND_URL}/api/v1/admin/analytics`);
    return response.data;
  } catch (error) {
    console.error('Error getting admin analytics:', error);
    throw error;
  }
};

export const getPracticeSessions = async () => {
  try {
    setAuthHeader();
    const response = await axios.get(`${BACKEND_URL}/api/v1/practice/all`);
    return response.data;
  } catch (error)
  {
    console.error('Error fetching practice sessions:', error);
    throw error;
  }
};

export const getPracticeSessionDetails = async (sessionId: string) => {
  try {
    setAuthHeader();
    const response = await axios.get(`${BACKEND_URL}/api/v1/practice/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting practice session details:', error);
    throw error;
  }
};

export const getPracticeSessionSelections = async (sessionId: string) => {
  try {
    setAuthHeader();
    const response = await axios.get(`${BACKEND_URL}/api/v1/practice/admin/practice-sessions/${sessionId}/selections`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching selections for session ${sessionId}:`, error);
    throw error;
  }
};