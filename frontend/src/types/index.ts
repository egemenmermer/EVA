export type ManagerType = 'PUPPETEER' | 'DILUTER' | 'CAMOUFLAGER' | 'FUNCTION' | 'NO_TOOLS';
export type Role = 'user' | 'assistant' | 'system' | 'practice-assistant';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role?: string; // Optional property for admin/user role
  managerTypePreference?: string;
  
  // Survey completion tracking
  preSurveyCompleted?: boolean;
  postSurveyCompleted?: boolean;
  preSurveyCompletedAt?: string;
  postSurveyCompletedAt?: string;
  
  // Scenario completion tracking
  accessibilityScenariosCompleted?: boolean;
  privacyScenariosCompleted?: boolean;
  accessibilityScenariosCompletedAt?: string;
  privacyScenariosCompletedAt?: string;
  
  // Practice completion tracking - for permanent tactics guide
  hasCompletedPractice?: boolean;
  firstPracticeCompletedAt?: string;
}

export interface Conversation {
  // Required fields
  conversationId: string; // This should be a valid UUID string
  
  // Optional fields
  userId?: string;
  managerType: ManagerType;
  createdAt?: string;
  title?: string;
  lastMessage?: string;
  lastMessageDate?: string;
  isDraft?: boolean;
  isPersisted?: boolean;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  conversationId: string;
  isLoading?: boolean;
  isRehearsalRequest?: boolean;
  isRehearsalOptions?: boolean;
  // Email Assistant properties
  isEmailAssistant?: boolean;
  emailQuestionIndex?: number;
  isFollowUp?: boolean;
  isEmailSummary?: boolean;
}

export interface Feedback {
  id: string;
  conversationId: string;
  userFeedback: string;
  rating: number;
  submittedAt: string;
}