export interface ConversationContentResponseDTO {
  id: string;
  conversationId: string;
  userQuery?: string;
  agentResponse?: string;
  createdAt: string;
}

export interface ConversationResponseDTO {
  conversationId: string;
  userId: string;
  managerType: string;
  createdAt: string;
} 