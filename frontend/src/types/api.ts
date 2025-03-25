import type { ManagerType } from './index';

// Response types matching our backend DTOs
export interface LoginResponseDTO {
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

export interface RegisterResponseDTO {
  message: string;
}

export interface ConversationResponseDTO {
  conversationId: string;
  userId: string;
  title: string;
  managerType: ManagerType;
  createdAt: string;
}

export interface ConversationContentResponseDTO {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface SendMessageRequestDTO {
  content: string;
  managerType: ManagerType;
}

export interface FeedbackResponseDTO {
  id: string;
  conversationId: string;
  rating: number;
  comment?: string;
  submittedAt: string;
} 