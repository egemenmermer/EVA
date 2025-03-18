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
  managerType: ManagerType;
  createdAt: string;
}

export interface ConversationContentResponseDTO {
  conversationId: string;
  userQuery: string;
  agentResponse: string;
  createdAt: string;
}

export interface FeedbackResponseDTO {
  id: string;
  conversationId: string;
  userFeedback: string;
  rating: number;
  submittedAt: string;
} 