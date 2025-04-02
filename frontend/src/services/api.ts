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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8443';
const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'http://localhost:5001';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8443';

// Set auth token if it exists
const setAuthHeader = () => {
  const token = localStorage.getItem('token');
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

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

// Replace the entire generateKnowledgeArtifacts function
export const generateKnowledgeArtifacts = async (conversationId: string): Promise<KnowledgeArtifactsResponse> => {
  const emptyResponse: KnowledgeArtifactsResponse = { guidelines: [], caseStudies: [] };
  
  if (!conversationId || conversationId.startsWith('draft-') || conversationId.includes('mock-')) {
    console.log('Skipping artifact generation for invalid conversationId:', conversationId);
    return emptyResponse;
  }
  
  console.log('=== DEBUG: Starting Knowledge Generation Process for conversationId:', conversationId);
  
  // Get conversation messages for context
  let messages = [];
  try {
    console.log('=== DEBUG: Attempting to fetch conversation messages');
    const messagesResponse = await getConversationMessages(conversationId);
    if (messagesResponse && Array.isArray(messagesResponse) && messagesResponse.length > 0) {
      messages = messagesResponse;
      console.log(`=== DEBUG: Retrieved ${messages.length} messages for context`);
    } else {
      console.log('=== DEBUG: No messages retrieved from conversation');
    }
  } catch (error) {
    console.warn('=== DEBUG: Failed to get conversation messages:', error);
  }
  
  const timestamp = Date.now();
  
  // Start with the POST method for direct generation
  try {
    console.log('=== DEBUG: Trying POST generation endpoint /api/v1/generate-artifacts');
    
    const token = localStorage.getItem('token');
    console.log('=== DEBUG: Token exists:', !!token);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    
    // Debug log headers (without showing full token)
    console.log('=== DEBUG: Headers:', Object.keys(headers).join(', '));
    
    // Build request body
    const requestBody = {
      conversationId,
      messages
    };
    
    console.log('=== DEBUG: Request body keys:', Object.keys(requestBody));
    console.log('=== DEBUG: Messages count:', messages.length);
    
    // POST request to agent with full logs
    const postUrl = `${AGENT_URL}/api/v1/generate-artifacts?_=${timestamp}`;
    console.log('=== DEBUG: POST URL =', postUrl);
    
    try {
      console.log('=== DEBUG: Starting fetch request to', postUrl);
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });
      
      console.log('=== DEBUG: POST response status:', response.status);
      console.log('=== DEBUG: POST response status text:', response.statusText);
      
      if (response.ok) {
        console.log('=== DEBUG: Successfully received response');
        
        // Log the raw response for debugging
        const responseText = await response.text();
        console.log('=== DEBUG: Raw response:', responseText);
        
        // Parse the text back to JSON
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('=== DEBUG: Parsed response data:', {
            hasData: !!data,
            hasGuidelines: !!data?.guidelines,
            guidelinesLength: data?.guidelines?.length || 0,
            hasCaseStudies: !!data?.caseStudies,
            caseStudiesLength: data?.caseStudies?.length || 0
          });
          
          // Ensure arrays exist
          if (!Array.isArray(data.guidelines)) {
            console.log('=== DEBUG: Guidelines is not an array, setting to empty array');
            data.guidelines = [];
          }
          
          if (!Array.isArray(data.caseStudies)) {
            console.log('=== DEBUG: CaseStudies is not an array, setting to empty array');
            data.caseStudies = [];
          }
          
          // Cache the results even if empty
          try {
            localStorage.setItem(`artifacts-${conversationId}`, JSON.stringify({
              ...data,
              timestamp: new Date().toISOString()
            }));
            console.log('=== DEBUG: Cached response to localStorage');
          } catch (cacheError) {
            console.warn('=== DEBUG: Failed to cache to localStorage:', cacheError);
          }
          
          return data;
        } catch (parseError) {
          console.error('=== DEBUG: Failed to parse JSON response:', parseError);
          console.error('=== DEBUG: Response text was:', responseText);
        }
      }
    } catch (fetchError) {
      console.error('=== DEBUG: Fetch error occurred:', fetchError);
    }
  } catch (overallError) {
    console.error('=== DEBUG: Overall POST error:', overallError);
  }
  
  // If all else fails, fall back to the direct GET endpoint
  try {
    console.log('=== DEBUG: Trying direct GET endpoint as fallback');
    const directUrl = `${AGENT_URL}/direct-knowledge-artifacts/${conversationId}?_=${timestamp}`;
    
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    
    const response = await fetch(directUrl, {
      method: 'GET',
      headers: headers
    });
    
    console.log('=== DEBUG: Direct GET response status:', response.status);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log('=== DEBUG: Raw GET response:', responseText);
      
      try {
        const data = JSON.parse(responseText);
        console.log('=== DEBUG: Parsed GET response has data:', !!data);
        
        if (data && Array.isArray(data.guidelines) && Array.isArray(data.caseStudies)) {
          // Cache this response
          try {
            localStorage.setItem(`artifacts-${conversationId}`, JSON.stringify({
              ...data,
              timestamp: new Date().toISOString()
            }));
          } catch (err) {
            console.warn('=== DEBUG: Failed to cache GET response');
          }
          
          return data;
        }
      } catch (parseErr) {
        console.error('=== DEBUG: Failed to parse GET response');
      }
    }
  } catch (getError) {
    console.error('=== DEBUG: GET endpoint error:', getError);
  }
  
  console.log('=== DEBUG: All generation attempts failed, returning empty');
  return emptyResponse;
};

// Update getKnowledgeArtifacts to use the new generation function as a last resort
export const getKnowledgeArtifacts = async (conversationId: string): Promise<KnowledgeArtifactsResponse> => {
  try {
    // Skip invalid conversation IDs to avoid unnecessary network requests
    if (!conversationId || conversationId.startsWith('draft-') || conversationId.includes('mock')) {
      console.log(`Skipping knowledge artifacts fetch for invalid conversationId: ${conversationId}`);
      return { guidelines: [], caseStudies: [] };
    }
    
    // Add timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    
    // Setup headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token if available
    const token = getToken();
    if (token) {
      headers['Authorization'] = token;
    }
    
    console.log(`Fetching knowledge artifacts for conversation: ${conversationId} from database`);
    
    // Fetch directly from the backend database
    try {
      const response = await fetch(`${API_URL}/api/v1/knowledge-artifacts/${conversationId}?t=${timestamp}`, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Successfully retrieved artifacts from database');
        
        // Validate the response
        if (data && 
            Array.isArray(data.guidelines) && 
            Array.isArray(data.caseStudies)) {
          console.log(`Got ${data.guidelines.length} guidelines and ${data.caseStudies.length} case studies from database`);
          
          // Only return if we have actual data
          if (data.guidelines.length > 0 || data.caseStudies.length > 0) {
            return data;
          } else {
            console.log('Database returned empty collections, will generate new artifacts');
          }
        } else {
          console.log('Database returned invalid data format');
        }
      } else {
        console.log(`Database API returned status ${response.status}`);
      }
    } catch (error) {
      console.log('Error fetching from database API:', error);
    }
    
    // If database retrieval failed or returned empty data, generate new artifacts
    console.log('Generating new artifacts via direct generation endpoint');
    
    // Get the most recent messages to provide context
    let messages: Array<{ role: string; content: string }> = [];
    try {
      const convoMessages = await getConversationMessages(conversationId) as Array<{
        userQuery?: string;
        agentResponse?: string;
      }>;
      
      // Only use the last 3 messages to keep context smaller
      messages = convoMessages.slice(-3).map((msg: any) => ({
        role: msg.userQuery ? 'user' : 'assistant',
        content: msg.userQuery || msg.agentResponse || ""
      }));
      console.log(`Got ${messages.length} recent messages for context`);
    } catch (error) {
      console.log('Could not fetch messages for context, using empty context');
      messages = [{ role: 'user', content: 'Please generate ethical guidance for this conversation.' }];
    }
    
    // Use a longer timeout for generation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const generateResponse = await fetch(`${AGENT_URL}/api/v1/generate-artifacts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationId,
          messages
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (generateResponse.ok) {
        const data = await generateResponse.json();
        console.log('Successfully generated new artifacts and saved to database');
        
        // Validate the response
        if (data && 
            Array.isArray(data.guidelines) && 
            Array.isArray(data.caseStudies)) {
          console.log(`Generated ${data.guidelines.length} guidelines and ${data.caseStudies.length} case studies`);
          return data;
        }
        console.log('Generate endpoint returned invalid data format');
      } else {
        console.log(`Generate endpoint returned status ${generateResponse.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Generation timed out after 30 seconds');
      } else {
        console.log('Error generating artifacts:', error);
      }
    }
    
    // If all attempts fail, return empty objects to prevent UI crashes
    console.log('All attempts to get artifacts failed, returning empty arrays');
    return {
      guidelines: [],
      caseStudies: []
    };
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