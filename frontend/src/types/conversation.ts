import { Role } from './index'; // Import Role from index.ts

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

export interface Conversation {
  createdAt: string;
  conversationId: string;
  isLoading?: boolean;
  showPracticeButtons?: boolean;
}

export interface Message {
  id: string;
  role: Role;
  content: string; // This will now store the raw agent response text
  createdAt: string;
  conversationId: string;
  isLoading?: boolean;
}