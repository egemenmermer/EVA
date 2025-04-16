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
import { Message } from '@/types/conversation';
import { generateConversationTitle } from '@/utils/titleGenerator';
import { v4 as uuid } from 'uuid';
import { useStore } from '@/store/useStore';
import api from './axiosConfig';
import { agentApi, backendApi } from './axiosConfig';
import { Conversation } from '@/types/conversation';

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
      // Ensure auth header is set
      setAuthHeader();
      
      const response = await backendApi.get<ConversationResponseDTO[]>('/api/v1/conversation');
      const conversations = response.data;
      
      debugResponse('GET', '/api/v1/conversation', 200, conversations);
      
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
      
      const response = await backendApi.post<ConversationResponseDTO>('/api/v1/conversation', {
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
  
  getConversationMessages: async (conversationId: string): Promise<Message[]> => {
    debugRequest('GET', `/api/v1/conversation/message/${conversationId}`);
    
    try {
      setAuthHeader();
      
      // Expecting an array of DTOs, each representing a single message
      const response = await backendApi.get<ConversationContentResponseDTO[]>(`/api/v1/conversation/message/${conversationId}`);
      
      if (!Array.isArray(response.data)) {
        console.error("Invalid response format: expected an array", response.data);
        return [];
      }
      
      // Map the DTOs directly to the Message format
      const messages: Message[] = response.data.map(dto => ({
        id: dto.id || uuid(), // Use ID from DTO if available
        role: dto.role as 'user' | 'assistant', // Assert the role type
        content: dto.content || dto.userQuery || dto.agentResponse || '', // Use content field primarily
        conversationId: dto.conversationId,
        createdAt: dto.createdAt || new Date().toISOString()
      }));
      
      // Sort messages by createdAt just in case they are out of order
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      debugResponse('GET', `/api/v1/conversation/message/${conversationId}`, 200, messages);
      return messages;
    } catch (error) {
      console.error(`Error getting messages for conversation ${conversationId}:`, error);
      // Return empty array on error to prevent UI crashes
      return []; 
    }
  },
  
  sendMessage: async (
    conversationId: string, 
    content: string,
    temperature?: number
  ): Promise<any> => {
    debugRequest('POST', '/api/v1/conversation/message', { conversationId, content, temperature });
    
    try {
      setAuthHeader();
      
      const payload = {
        conversationId,
        userQuery: content,
        managerType: getManagerType(),
        temperature: temperature || 0.7
      };

      // Make the request to our agent
      const response = await backendApi.post('/api/v1/conversation/message', payload);
      debugResponse('POST', '/api/v1/conversation/message', response.status, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error calling sendMessage:', error);
      throw error; // Let the UI handle the error
    }
  },
  
  updateConversationTitle: async (conversationId: string, title: string): Promise<string> => {
    try {
      console.log('Updating title for conversation:', conversationId);
      setAuthHeader();
      
      // Don't update title for draft conversations
      if (!conversationId || conversationId.startsWith('draft-')) {
        return title;
      }
      
      const response = await backendApi.post<{title: string}>(`/api/v1/conversation/${conversationId}/update-title`, {
        title
      });
      
      console.log('Title updated:', response.data.title);
      return response.data.title;
    } catch (error) {
      console.error('Failed to update title:', error);
      throw error;
    }
  },
  
  deleteConversation: async (conversationId: string): Promise<void> => {
    try {
      console.log('Deleting conversation:', conversationId);
      setAuthHeader();
      
      // Delete the conversation
      await backendApi.delete(`/api/v1/conversation/${conversationId}`);
      console.log('Successfully deleted conversation:', conversationId);
      
      // Clear local storage for this conversation
      localStorage.removeItem(`messages_${conversationId}`);
      localStorage.removeItem(`messages-${conversationId}`);
      localStorage.removeItem(`backup_messages_${conversationId}`);
      localStorage.removeItem(`exact_messages_${conversationId}`);
    } catch (error) {
      console.error('Error in deleteConversation:', error);
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:5001';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

// Agent API calls
export const createConversation = async (title: string, managerType?: ManagerType) => {
  setAuthHeader();
  const response = await axios.post(`${API_URL}/api/v1/conversation`, {
    title,
    managerType: managerType || getManagerType()
  });
  return response.data;
};

export const getConversations = async () => {
  setAuthHeader();
  const response = await axios.get(`${API_URL}/api/v1/conversation`);
  return response.data;
};

export const getConversationMessages = async (conversationId: string) => {
  setAuthHeader();
  const response = await axios.get(`${API_URL}/api/v1/conversation/message/${conversationId}`);
  return response.data;
};

export const sendMessage = async (
  conversationId: string,
  content: string,
  managerType?: ManagerType,
  temperature?: number
) => {
  try {
    console.log(`Sending message to conversation ${conversationId}`);
    
    // Check if the conversation exists
    const conversationExists = await checkConversationExists(conversationId);
    
    // If conversation doesn't exist, create a new one
    if (!conversationExists) {
      console.log(`Conversation ${conversationId} not found, creating a new one`);
      const title = `Chat with ${managerType || 'EVA'}`;
      const newConversation = await createConversation(title, managerType) as unknown as { conversationId: string };
      console.log('Created new conversation:', newConversation);
      conversationId = newConversation.conversationId;
    }
    
    const payload = {
      conversationId,
      userQuery: content,
      managerType: managerType || getManagerType(),
      temperature: temperature || 0.7
    };

    console.log('Sending message payload:', payload);
    
    const response = await backendApi.post(
      '/api/v1/conversation/message',
      payload
    );

    console.log('Message sent, response:', response);
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const togglePracticeMode = async (conversationId: string, enter: boolean) => {
  setAuthHeader();
  const response = await axios.post(`${API_URL}/practice-mode`, {
    conversationId,
    enter
  });
  return response.data;
};

export const startScenario = async (conversationId: string, scenarioId: string) => {
  setAuthHeader();
  const response = await axios.post(`${API_URL}/practice/scenarios/start`, {
    conversation_id: conversationId,
    scenario_id: scenarioId
  });
  return response.data;
};

export const submitResponse = async (conversationId: string, scenarioId: string, choiceIndex: number) => {
  setAuthHeader();
  const response = await axios.post(`${API_URL}/practice/scenarios/respond`, {
    conversation_id: conversationId,
    scenario_id: scenarioId,
    choice_index: choiceIndex
  });
  return response.data;
};

export const getAvailableScenarios = async () => {
  setAuthHeader();
  const response = await axios.get(`${API_URL}/practice/scenarios`);
  return response.data;
};

interface KnowledgeArtifactsResponse {
  guidelines: Array<{
    id: string;
    title: string;
    description: string;
    source: string;
    category: string;
    relevance: number;
  }>;
  caseStudies: Array<{
    id: string;
    title: string;
    summary: string;
    outcome: string;
    source: string;
    relevance: number;
  }>;
}

// UPDATED getKnowledgeArtifacts function
export const getKnowledgeArtifacts = async (conversationId: string): Promise<KnowledgeArtifactsResponse> => {
  try {
    // Skip invalid conversation IDs
    if (!conversationId || conversationId.startsWith('draft-') || conversationId.includes('mock')) {
      console.log(`Skipping knowledge artifacts fetch for invalid conversationId: ${conversationId}`);
      return { guidelines: [], caseStudies: [] };
    }
    
    // Check local cache first
    try {
      const cachedData = localStorage.getItem(`artifacts-${conversationId}`);
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        const cacheAge = new Date().getTime() - new Date(parsedCache.timestamp).getTime();
        if (cacheAge < 10 * 60 * 1000 && 
            (parsedCache.guidelines?.length > 0 || parsedCache.caseStudies?.length > 0)) { // Check if cache has any content
          console.log(`Using cached artifacts for ${conversationId}, cache age: ${Math.round(cacheAge/1000)}s`);
          return {
            guidelines: parsedCache.guidelines || [],
            caseStudies: parsedCache.caseStudies || []
          };
        }
      }
    } catch (cacheError) {
      console.warn('Failed to read artifact cache:', cacheError);
    }
    
    // Validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidPattern.test(conversationId);
    if (!isUuid) {
        console.warn(`Cannot fetch artifacts for non-UUID conversation ID: ${conversationId}`);
        // Do not call generateKnowledgeArtifacts here
        return { guidelines: [], caseStudies: [] }; 
    }

    // Setup headers with token
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    const token = getToken();
    if (token) {
      headers['Authorization'] = token;
    } else {
      console.warn('No authentication token available for artifact fetch');
      // Cannot fetch from backend without token
      return { guidelines: [], caseStudies: [] }; 
    }
    
    // Fetch from backend database
    console.log(`Fetching knowledge artifacts from database for UUID: ${conversationId}`);
    const timestamp = new Date().getTime(); // Cache buster
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for fetch
    
    try {
      // Use the correct API_URL (pointing to backend 8443) and endpoint
      const response = await fetch(`${API_URL}/api/v1/knowledge-artifacts/${conversationId}?_=${timestamp}`, { 
        method: 'GET',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log(`Artifact fetch status: ${response.status}`);
        
        if (data && Array.isArray(data.guidelines) && Array.isArray(data.caseStudies)) {
            // Cache the results from backend
            try {
              localStorage.setItem(`artifacts-${conversationId}`, JSON.stringify({
                guidelines: data.guidelines || [],
                caseStudies: data.caseStudies || [],
                timestamp: new Date().toISOString()
              }));
            } catch (err) {
              console.warn('Failed to cache artifacts to localStorage');
            }
            return {
              guidelines: data.guidelines || [],
              caseStudies: data.caseStudies || []
            };
        } else {
           console.warn('Received malformed artifact data from backend');
           return { guidelines: [], caseStudies: [] }; // Return empty on malformed data
        }
      } else {
        // Handle non-OK responses (like 404 if backend hasn't generated yet, or 401)
        console.warn(`Backend artifact fetch failed: Status ${response.status}`);
        // Do not call generateKnowledgeArtifacts here
        return { guidelines: [], caseStudies: [] }; // Return empty on fetch error
      }
    } catch (error) {
      clearTimeout(timeoutId); // Clear timeout in case of non-fetch error
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Artifact fetch timed out after 5 seconds');
      } else {
        console.error('Error fetching artifacts from backend API:', error);
      }
      // Do not call generateKnowledgeArtifacts here
      return { guidelines: [], caseStudies: [] }; // Return empty on error
    }

  } catch (error) {
    // Catch any unexpected errors in the outer try
    console.error('Unexpected error in getKnowledgeArtifacts:', error);
    return { guidelines: [], caseStudies: [] };
  }
};

interface TokenVerificationResponse {
  valid?: boolean;
  status?: string;
}

// Auth API calls
export const login = authApi.login;
export const logout = authApi.logout;
export const verifyToken = async (): Promise<boolean> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const response = await axios.get<TokenVerificationResponse>('/api/v1/auth/verify-token', {
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

// Helper function to check if a conversation exists
export const checkConversationExists = async (conversationId: string): Promise<boolean> => {
  try {
    const response = await backendApi.get<Conversation>(`/api/v1/conversation/${conversationId}`);
    return response?.data?.conversationId === conversationId;
  } catch (error) {
    console.error('Error checking conversation:', error);
    return false;
  }
};