import { ManagerType } from './index';

// Response types matching our backend DTOs
export interface LoginResponseDTO {
  accessToken: string;
  userDetails: {
    id: string;
    email: string;
    fullName: string;
    lastLogin: string;
    updatedAt: string;
  };
}

export interface RegisterResponseDTO {
  message: string;
}

export interface ConversationResponseDTO {
  conversationId: string;
  userId: string;
  managerType: ManagerType;
  createdAt: string;
}

export interface ConversationContentResponseDTO {
  conversationId: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
}

export interface FeedbackResponseDTO {
  id: string;
  conversationId: string;
  userFeedback: string;
  rating: number;
  submittedAt: string;
} 