import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { 
  LoginResponseDTO, 
  RegisterResponseDTO,
  ConversationResponseDTO,
  ConversationContentResponseDTO,
  FeedbackResponseDTO 
} from '@/types/api';

declare global {
  interface ImportMeta {
    env: {
      VITE_API_URL: string;
    };
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Add request interceptor for authentication
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponseDTO> => {
    const response = await api.post<LoginResponseDTO>('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (email: string, password: string, fullName: string): Promise<RegisterResponseDTO> => {
    const response = await api.post<RegisterResponseDTO>('/auth/register', { email, password, fullName });
    return response.data;
  },
  
  activate: async (token: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/activate', { token });
    return response.data;
  },

  oauth2Redirect: async (token: string): Promise<{ token: string }> => {
    const response = await api.get<{ token: string }>(`/auth/oauth2/redirect?token=${token}`);
    return response.data;
  }
};

export const conversationApi = {
  start: async (managerType: string): Promise<ConversationResponseDTO> => {
    const response = await api.post<ConversationResponseDTO>('/conversation/start', { managerType });
    return response.data;
  },
  
  sendMessage: async (conversationId: string, userQuery: string): Promise<ConversationContentResponseDTO> => {
    const response = await api.post<ConversationContentResponseDTO>('/conversation/message', { 
      conversationId, 
      userQuery 
    });
    return response.data;
  },
  
  getConversation: async (id: string): Promise<ConversationResponseDTO> => {
    const response = await api.get<ConversationResponseDTO>(`/conversation/${id}`);
    return response.data;
  },
  
  getConversationMessages: async (conversationId: string): Promise<ConversationContentResponseDTO[]> => {
    const response = await api.get<ConversationContentResponseDTO[]>(`/conversation/message/${conversationId}`);
    return response.data;
  },
  
  getUserConversations: async (userId: string): Promise<ConversationResponseDTO[]> => {
    const response = await api.get<ConversationResponseDTO[]>(`/conversation/user/${userId}`);
    return response.data;
  }
};

export const feedbackApi = {
  submit: async (
    conversationId: string, 
    rating: number, 
    userFeedback?: string
  ): Promise<FeedbackResponseDTO> => {
    const response = await api.post<FeedbackResponseDTO>('/feedback/submit', {
      conversationId,
      rating,
      userFeedback
    });
    return response.data;
  },
  
  getByConversation: async (conversationId: string): Promise<FeedbackResponseDTO> => {
    const response = await api.get<FeedbackResponseDTO>(`/feedback/${conversationId}`);
    return response.data;
  }
}; 