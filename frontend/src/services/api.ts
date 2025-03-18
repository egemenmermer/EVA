import axios from 'axios';
import type { 
  LoginResponseDTO, 
  RegisterResponseDTO,
  ConversationResponseDTO,
  ConversationContentResponseDTO,
  FeedbackResponseDTO 
} from '@/types/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8443/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true // Enable sending cookies
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log the error for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    // Transform error message
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// Add request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    // Check if token already has 'Bearer ' prefix
    const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    config.headers.Authorization = tokenValue;
    console.log('Request headers:', {
      url: config.url,
      Authorization: config.headers.Authorization
    });
  }
  return config;
}, (error) => {
  console.error('Request Error:', error);
  return Promise.reject(error);
});

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponseDTO> => {
    try {
      console.log('Attempting login with:', { email });
      const response = await api.post<LoginResponseDTO>('/auth/login', { email, password });
      console.log('Login response:', response.data);
      
      // Store the token with 'Bearer ' prefix if it doesn't have it
      if (response.data.token) {
        const token = response.data.token.startsWith('Bearer ') 
          ? response.data.token 
          : `Bearer ${response.data.token}`;
        localStorage.setItem('token', token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  register: async (email: string, password: string, fullName: string): Promise<RegisterResponseDTO> => {
    try {
      console.log('Attempting registration with:', { email, fullName });
      const response = await api.post<RegisterResponseDTO>('/auth/register', { email, password, fullName });
      console.log('Registration response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  activate: async (token: string): Promise<{ message: string }> => {
    try {
      const response = await api.post<{ message: string }>('/auth/activate', { token });
      return response.data;
    } catch (error) {
      console.error('Activation error:', error);
      throw error;
    }
  },

  oauth2Callback: async (provider: string, code: string): Promise<LoginResponseDTO> => {
    try {
      const response = await api.get<LoginResponseDTO>(`/auth/oauth2/${provider}/callback?code=${code}`);
      return response.data;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }
};

export const conversationApi = {
  start: async (managerType: string): Promise<ConversationResponseDTO> => {
    try {
      const response = await api.post<ConversationResponseDTO>('/conversation/start', { managerType });
      return response.data;
    } catch (error) {
      console.error('Start conversation error:', error);
      throw error;
    }
  },
  
  sendMessage: async (conversationId: string, userQuery: string): Promise<ConversationContentResponseDTO> => {
    try {
      const response = await api.post<ConversationContentResponseDTO>('/conversation/message', { 
        conversationId, 
        userQuery 
      });
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  },
  
  getConversation: async (id: string): Promise<ConversationResponseDTO> => {
    try {
      const response = await api.get<ConversationResponseDTO>(`/conversation/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get conversation error:', error);
      throw error;
    }
  },
  
  getConversationMessages: async (conversationId: string): Promise<ConversationContentResponseDTO[]> => {
    try {
      const response = await api.get<ConversationContentResponseDTO[]>(`/conversation/message/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Get conversation messages error:', error);
      throw error;
    }
  },
  
  getUserConversations: async (userId: string): Promise<ConversationResponseDTO[]> => {
    try {
      const response = await api.get<ConversationResponseDTO[]>(`/conversation/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user conversations error:', error);
      throw error;
    }
  }
};

export const feedbackApi = {
  submit: async (
    conversationId: string, 
    rating: number, 
    userFeedback?: string
  ): Promise<FeedbackResponseDTO> => {
    try {
      const response = await api.post<FeedbackResponseDTO>('/feedback/submit', {
        conversationId,
        rating,
        userFeedback
      });
      return response.data;
    } catch (error) {
      console.error('Submit feedback error:', error);
      throw error;
    }
  },
  
  getByConversation: async (conversationId: string): Promise<FeedbackResponseDTO> => {
    try {
      const response = await api.get<FeedbackResponseDTO>(`/feedback/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Get feedback error:', error);
      throw error;
    }
  }
}; 