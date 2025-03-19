export type ManagerType = 'PUPPETEER' | 'DILUTER' | 'CAMOUFLAGER' | 'FUNCTION' | 'NO_TOOLS';

export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface Conversation {
  conversationId: string;
  userId?: string;
  managerType?: ManagerType;
  createdAt?: string;
  title?: string;
  lastMessage?: string;
  lastMessageDate?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  userQuery: string;
  agentResponse: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  conversationId: string;
  userFeedback: string;
  rating: number;
  submittedAt: string;
}