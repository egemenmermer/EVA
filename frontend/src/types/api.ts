import type { ManagerType } from './index';

// Response types matching our backend DTOs
export interface LoginResponseDTO {
  accessToken: string;
  userDetails: {
    id: string;
    email: string;
    fullName: string;
    lastLogin?: string;
    updatedAt?: string;
    role?: string;
    managerTypePreference?: string;
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
  persisted?: boolean;
}

// Support both old and new message formats
export interface ConversationContentResponseDTO {
  id: string;
  conversationId: string;
  role?: 'user' | 'assistant';
  content?: string;
  userQuery?: string;
  agentResponse?: string;
  createdAt: string;
}

export interface SendMessageRequestDTO {
  conversationId: string;
  userQuery: string;
  managerType?: ManagerType;
  temperature?: number;
}

export interface FeedbackResponseDTO {
  id: number;
  conversationId: string;
  userFeedback: string;
  rating: number;
  submittedAt: string;
}

export interface ActivationResponseDTO {
  message: string;
  activatedAt?: string;
} 