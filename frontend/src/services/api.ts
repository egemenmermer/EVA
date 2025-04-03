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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8443';
const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:5001';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8443';

// Agent API calls
export const createConversation = async () => {
  setAuthHeader();
  const response = await axios.post(`${API_URL}/api/v1/conversation`);
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

export const sendMessage = async (conversationId: string, message: string, temperature: number) => {
  setAuthHeader();
  const response = await axios.post(`${API_URL}/api/v1/conversation/message`, {
    conversationId,
    content: message,
    temperature
  });
  return response.data;
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

// Function to save knowledge artifacts directly to the database
const saveArtifactsToDatabase = async (
  conversationId: string, 
  guidelines: any[], 
  caseStudies: any[]
): Promise<boolean> => {
  // Skip invalid conversation IDs
  if (!conversationId || !conversationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    console.log(`Not saving artifacts for invalid UUID: ${conversationId}`);
    return false;
  }
  
  // Get the JWT token
  const token = getToken();
  if (!token) {
    console.warn('No authentication token available for database save');
    return false;
  }
  
  // Set up headers with proper authentication
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': token
  };
  
  console.log(`Saving artifacts to database for UUID: ${conversationId}`);
  console.log(`Token (first 15 chars): ${token.substring(0, 15)}...`);
  
  // Create the request body - one consistent format for all endpoints
  const requestBody = {
    conversationId,
    guidelines: guidelines || [],
    caseStudies: caseStudies || [],
    timestamp: new Date().toISOString()
  };
  
  // Log the request body for debugging
  console.log(`Request payload: ${JSON.stringify(requestBody).substring(0, 100)}...`);
  
  // Try POST to java backend /api/v1/knowledge-artifacts first
  try {
    console.log(`Attempting POST to /api/v1/knowledge-artifacts for ${conversationId}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_URL}/api/v1/knowledge-artifacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`POST to /api/v1/knowledge-artifacts response status: ${response.status}`);
    
    if (response.ok) {
      console.log(`Successfully saved artifacts to database via POST to /api/v1/knowledge-artifacts`);
      return true;
    } else {
      try {
        const errorText = await response.text();
        console.warn(`Failed to save via POST. Status: ${response.status}, Error: ${errorText}`);
      } catch (e) {
        console.warn(`Failed to save via POST. Status: ${response.status}`);
      }
      
      if (response.status === 401) {
        console.warn('Authentication error when saving. JWT token might be invalid. Token:', token.substring(0, 20) + '...');
      }
    }
  } catch (error) {
    console.error('Error saving to database via POST:', error);
  }
  
  // If the first attempt failed, try PUT to a specific ID endpoint
  try {
    console.log(`Attempting PUT to /api/v1/knowledge-artifacts/${conversationId}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_URL}/api/v1/knowledge-artifacts/${conversationId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`PUT to /api/v1/knowledge-artifacts/${conversationId} response status: ${response.status}`);
    
    if (response.ok) {
      console.log(`Successfully saved artifacts to database via PUT to /api/v1/knowledge-artifacts/${conversationId}`);
      return true;
    } else {
      try {
        const errorText = await response.text();
        console.warn(`Failed to save via PUT. Status: ${response.status}, Error: ${errorText}`);
      } catch (e) {
        console.warn(`Failed to save via PUT. Status: ${response.status}`);
      }
    }
  } catch (error) {
    console.error('Error saving to database via PUT:', error);
  }
  
  // Try agent proxy endpoint as last resort
  try {
    console.log(`Attempting POST to /api/v1/rag-artifacts as last resort`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_URL}/api/v1/rag-artifacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`POST to /api/v1/rag-artifacts response status: ${response.status}`);
    
    if (response.ok) {
      console.log(`Successfully saved artifacts to database via POST to /api/v1/rag-artifacts`);
      return true;
    } else {
      try {
        const errorText = await response.text();
        console.warn(`Failed to save via agent proxy. Status: ${response.status}, Error: ${errorText}`);
      } catch (e) {
        console.warn(`Failed to save via agent proxy. Status: ${response.status}`);
      }
    }
  } catch (error) {
    console.error('Error saving to database via agent proxy:', error);
  }
  
  console.error("All attempts to save to database failed");
  return false;
};

// Update the generateKnowledgeArtifacts function to use the new save function
export const generateKnowledgeArtifacts = async (conversationId: string): Promise<KnowledgeArtifactsResponse> => {
  console.log(`Generating knowledge artifacts for conversation: ${conversationId}`);
  
  // Skip invalid conversation IDs
  if (!conversationId || conversationId.startsWith('draft-') || conversationId.includes('mock')) {
    console.log(`Not generating artifacts for invalid conversationId: ${conversationId}`);
    return { guidelines: [], caseStudies: [] };
  }
  
  // Check if conversationId is a valid UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = uuidPattern.test(conversationId);
  
  // Set up properly formatted authentication
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Get token and ensure it's properly formatted with Bearer prefix
  const token = getToken();
  if (token) {
    headers['Authorization'] = token;
    console.log(`Using token for API call: ${token.substring(0, 15)}...`);
  }
  
  try {
    // First, try to get the last few messages for context
    let messages: any[] = [];
    
    try {
      // Only try to fetch messages if this is a valid UUID conversation
      if (isUuid) {
        console.log(`Fetching messages for context for UUID: ${conversationId}`);
        const messageResponse = await fetch(`${API_URL}/api/v1/conversation/${conversationId}/messages?limit=3`, {
          method: 'GET',
          headers
        });
        
        if (messageResponse.ok) {
          const data = await messageResponse.json();
          if (Array.isArray(data)) {
            messages = data;
            console.log(`Retrieved ${messages.length} messages for context`);
          }
        } else {
          console.warn(`Failed to get messages, status: ${messageResponse.status}`);
        }
      } else {
        console.log('Not fetching messages for non-UUID conversation ID');
      }
    } catch (messageError) {
      console.warn('Error fetching messages for artifact generation:', messageError);
    }
    
    // Now generate the artifacts
    console.log(`Calling artifact generation endpoint for: ${conversationId}`);
    
    // Add a timeout for the request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Extract the last message content or use a default if none available
    const lastMessage = messages.length > 0 ? messages[messages.length - 1].content : null;
    const messageContent = lastMessage || "Please generate relevant guidelines and case studies";
    
    // Build the request body
    const requestBody = {
      conversationId: conversationId,
      message: messageContent
    };
    
    // Make the API call to generate artifacts
    const response = await fetch(`${AGENT_URL}/api/v1/generate-artifacts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Generation API returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Generation successful, received ${data.guidelines?.length || 0} guidelines and ${data.caseStudies?.length || 0} case studies`);
    
    // Cache the results in localStorage
    try {
      localStorage.setItem(`artifacts-${conversationId}`, JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      }));
      console.log(`Cached generated artifacts for ${conversationId}`);
    } catch (cacheError) {
      console.warn('Failed to cache artifacts to localStorage:', cacheError);
    }
    
    // Save to the database if it's a valid UUID
    if (isUuid && token) {
      await saveArtifactsToDatabase(conversationId, data.guidelines, data.caseStudies);
    } else {
      console.log(`Not saving to database - ${!isUuid ? 'not a UUID' : 'no token available'}`);
    }
    
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Generation request timed out after 30 seconds');
    } else {
      console.error('Error generating knowledge artifacts:', error);
    }
    
    // Check if there are cached results we can use as fallback
    try {
      const cachedData = localStorage.getItem(`artifacts-${conversationId}`);
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        if (parsedCache.guidelines && parsedCache.caseStudies) {
          console.log(`Using cached artifacts as fallback after generation error for ${conversationId}`);
          return {
            guidelines: parsedCache.guidelines,
            caseStudies: parsedCache.caseStudies
          };
        }
      }
    } catch (cacheError) {
      console.warn('Failed to read cache after generation error:', cacheError);
    }
    
    // Return empty data structure to prevent UI crashes
    return {
      guidelines: [],
      caseStudies: []
    };
  }
};

// Update getKnowledgeArtifacts to use the new generation function as a last resort
export const getKnowledgeArtifacts = async (conversationId: string): Promise<KnowledgeArtifactsResponse> => {
  try {
    // Skip invalid conversation IDs to avoid unnecessary network requests
    if (!conversationId || conversationId.startsWith('draft-') || conversationId.includes('mock')) {
      console.log(`Skipping knowledge artifacts fetch for invalid conversationId: ${conversationId}`);
      return { guidelines: [], caseStudies: [] };
    }
    
    // Check local cache first to prevent redundant fetches
    try {
      const cachedData = localStorage.getItem(`artifacts-${conversationId}`);
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        const cacheAge = new Date().getTime() - new Date(parsedCache.timestamp).getTime();
        
        // If cache is less than 10 minutes old and has content, use it
        if (cacheAge < 10 * 60 * 1000 && 
            Array.isArray(parsedCache.guidelines) && parsedCache.guidelines.length > 0 &&
            Array.isArray(parsedCache.caseStudies) && parsedCache.caseStudies.length > 0) {
          console.log(`Using cached artifacts for ${conversationId}, cache age: ${Math.round(cacheAge/1000)}s`);
          return {
            guidelines: parsedCache.guidelines,
            caseStudies: parsedCache.caseStudies
          };
        }
      }
    } catch (cacheError) {
      console.warn('Failed to read from cache:', cacheError);
    }
    
    // Check if conversationId is in UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidPattern.test(conversationId);
    
    // If not a UUID, skip the database fetch and go straight to generation
    if (!isUuid) {
      console.log(`Conversation ID ${conversationId} is not in UUID format, using generation only`);
      return await generateKnowledgeArtifacts(conversationId);
    }
    
    // Setup headers with proper authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Get token and ensure it's properly formatted
    const token = getToken();
    if (token) {
      headers['Authorization'] = token;
      console.log(`Using token for API call: ${token.substring(0, 15)}...`);
    } else {
      console.warn('No authentication token available for database fetch');
      // Without a token, we can't access the database, so go to generation
      return await generateKnowledgeArtifacts(conversationId);
    }
    
    // First try to fetch from backend database (only if UUID and token available)
    console.log(`Fetching knowledge artifacts from database for UUID: ${conversationId}`);
    
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      
      // Add signal for abort capability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      // Use the correct endpoint to match the Java backend
      const response = await fetch(`${API_URL}/api/v1/knowledge-artifacts/${conversationId}?_=${timestamp}`, { 
        method: 'GET',
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Database response status: ${response.status}`);
        
        if (data && 
            Array.isArray(data.guidelines) && 
            Array.isArray(data.caseStudies)) {
          
          // If the database returned content, use it
          if (data.guidelines.length > 0 || data.caseStudies.length > 0) {
            console.log(`Database returned ${data.guidelines.length} guidelines and ${data.caseStudies.length} case studies`);
            
            // Cache the results
            try {
              localStorage.setItem(`artifacts-${conversationId}`, JSON.stringify({
                guidelines: data.guidelines || [],
                caseStudies: data.caseStudies || [],
                timestamp: new Date().toISOString()
              }));
              console.log("Cached database response to localStorage");
            } catch (err) {
              console.warn('Failed to cache artifacts to localStorage');
            }
            
            return {
              guidelines: data.guidelines || [],
              caseStudies: data.caseStudies || []
            };
          }
          
          console.log('Database returned empty results, generating new artifacts');
        }
      } else if (response.status === 401) {
        console.warn('Authentication error when fetching from database. Token might be invalid.');
      } else {
        console.log(`Database API returned status ${response.status}`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Database fetch timed out after 3 seconds');
      } else {
        console.log('Error fetching from database API:', error);
      }
    }
    
    // If database retrieval failed or returned empty data, generate new artifacts
    console.log('Generating new artifacts');
    const generatedData = await generateKnowledgeArtifacts(conversationId);

    // If generation gave us artifacts and we have a valid UUID with token, try harder to save to database
    if (generatedData && 
        ((generatedData.guidelines && generatedData.guidelines.length > 0) || 
         (generatedData.caseStudies && generatedData.caseStudies.length > 0)) && 
        isUuid && token) {
      console.log('Attempting multiple approaches to save artifacts to database');
      
      // Try up to three different approaches
      
      // 1. First approach: PUT to /knowledge-artifacts/{conversationId}
      try {
        console.log(`Trying PUT to /api/v1/knowledge-artifacts/${conversationId}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_URL}/api/v1/knowledge-artifacts/${conversationId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            guidelines: generatedData.guidelines || [],
            caseStudies: generatedData.caseStudies || []
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log('Successfully saved artifacts via PUT /knowledge-artifacts/{id}');
        } else {
          console.warn(`Failed with status ${response.status}, trying next approach`);
        }
      } catch (error) {
        console.warn('Error with first save approach:', error);
      }
      
      // 2. Second approach: POST to /rag-artifacts
      try {
        console.log('Trying POST to /api/v1/rag-artifacts');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${API_URL}/api/v1/rag-artifacts`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            conversationId: conversationId,
            guidelines: generatedData.guidelines || [],
            caseStudies: generatedData.caseStudies || [],
            timestamp: new Date().toISOString()
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log('Successfully saved artifacts via POST to /rag-artifacts');
        } else {
          console.warn(`Failed with status ${response.status}, trying final approach`);
        }
      } catch (error) {
        console.warn('Error with second save approach:', error);
      }
      
      // 3. Final approach: Direct SQL API (if available)
      try {
        console.log('Trying direct SQL approach via the agent API');
        // This is a hypothetical approach - would need a direct SQL endpoint
        // Use the direct save function if it exists
        await saveArtifactsToDatabase(conversationId, generatedData.guidelines, generatedData.caseStudies);
      } catch (error) {
        console.warn('Error with final save approach:', error);
        console.error('All attempts to save to database failed');
      }
    }

    return generatedData;
  } catch (error) {
    console.error('Unexpected error in getKnowledgeArtifacts:', error);
    // Return empty data to prevent UI crashes
    return {
      guidelines: [],
      caseStudies: []
    };
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