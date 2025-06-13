import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role } from '@/types/index';

// Types
export type ManagerType = 'PUPPETEER' | 'DILUTER' | 'CAMOUFLAGER' | 'FUNCTION' | 'NO_TOOLS';

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
  isScenarioCompletionMessage?: boolean;
}

export interface Conversation {
  conversationId: string;
  userId?: string;
  managerType: ManagerType;
  createdAt?: string;
  title?: string;
  lastMessage?: string;
  lastMessageDate?: string;
  isDraft?: boolean;
  messages?: Message[]; // For UI state management
  isNew?: boolean;     // Flag to indicate a newly created conversation
  isPersisted?: boolean; // Flag to indicate if saved in backend DB
}

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

interface Store {
  darkMode: boolean;
  token: string | null;
  user: User | null;
  currentConversation: Conversation | null;
  messages: Message[];
  managerType: ManagerType;
  temperature: number;
  
  setDarkMode: (darkMode: boolean) => void;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setManagerType: (type: ManagerType) => void;
  setTemperature: (temperature: number) => void;
  toggleDarkMode: () => void;
  clearMessages: () => void;
  clearAllData: () => void;
}

// Helper function to get initial dark mode preference
const getInitialDarkMode = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Helper function to get initial user if token exists
const getInitialUser = () => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    // Try to get user data from localStorage
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      darkMode: getInitialDarkMode(),
      token: null,
      user: getInitialUser(),
      currentConversation: null,
      messages: [],
      managerType: 'PUPPETEER',
      temperature: 0.7,
      
      setDarkMode: (darkMode) => set({ darkMode }),
      
      setToken: (token) => {
        set({ token });
        if (token) {
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('token');
        }
      },
      
      setUser: (user) => set({ user }),
      
      setCurrentConversation: (conversation) => {
        // Don't block draft conversations or new conversations
        if (conversation?.conversationId && 
            !conversation.isDraft && 
            !conversation.conversationId.startsWith('draft-') && 
            conversation.conversationId.includes('mock-')) {
          console.error('Attempted to set mock conversation:', conversation.conversationId);
          return;
        }
        
        const currentConv = get().currentConversation;
        
        // Clear messages when:
        // 1. Setting a new conversation (different ID)
        // 2. Starting a new draft conversation
        // 3. Current conversation is null
        if (!currentConv || 
            !conversation || 
            currentConv.conversationId !== conversation.conversationId ||
            (conversation && conversation.conversationId.startsWith('draft-'))) {
          // Always clear messages when switching conversations
          set({ messages: [] });
          
          // Log conversation change for debugging
          console.log('Clearing messages, changing from', 
            currentConv?.conversationId, 'to', conversation?.conversationId);
        }
        
        set({ currentConversation: conversation });
        
        // Only store non-draft conversations in localStorage
        if (conversation?.conversationId && 
            !conversation.isDraft && 
            !conversation.conversationId.startsWith('draft-')) {
          localStorage.setItem('current-conversation-id', conversation.conversationId);
        } else if (conversation?.conversationId && conversation.conversationId.startsWith('draft-')) {
          // Remove the stored conversation ID when switching to a draft conversation
          localStorage.removeItem('current-conversation-id');
        }
      },
      
      addMessage: (message) => {
        const messages = get().messages;
        const currentConv = get().currentConversation;
        
        // Don't add messages if they don't match the current conversation
        if (currentConv && message.conversationId !== currentConv.conversationId) {
          console.log('Message conversation ID does not match current conversation, skipping...');
          return;
        }
        
        // Check for exact duplicates (same content, role, and ID)
        const isDuplicate = messages.some(
          (m) => m.id === message.id && 
                m.content === message.content && 
                m.role === message.role && 
                m.conversationId === message.conversationId
        );
        
        if (isDuplicate) {
          console.log('Duplicate message detected, skipping...');
          return;
        }
        
        const updatedMessages = [...messages, message];
        set({ messages: updatedMessages });
        
        // Analyze assistant messages for scenario completion
        if (message.role === 'assistant' && message.content) {
          // Import scenario tracker dynamically to avoid circular dependencies
          import('../utils/scenarioTracker').then(({ analyzeMessageForScenarioCompletion }) => {
            analyzeMessageForScenarioCompletion(message.content);
          }).catch(error => {
            console.error('Error importing scenario tracker:', error);
          });
        }
        
        // Save messages to localStorage for non-draft conversations
        if (message.conversationId && !message.conversationId.startsWith('draft-')) {
          try {
            // Save with multiple key formats for better recovery
            const messageData = JSON.stringify(updatedMessages.slice(-50));
            localStorage.setItem(`messages_${message.conversationId}`, messageData);
            localStorage.setItem(`messages-${message.conversationId}`, messageData);
            localStorage.setItem(`backup_messages_${message.conversationId}`, messageData);
          } catch (error) {
            console.error('Error saving messages to localStorage:', error);
          }
        }
      },
      
      setMessages: (messages) => {
        const currentConv = get().currentConversation;
        
        // Only update messages if they belong to the current conversation
        if (currentConv && messages.length > 0 && 
            messages[0].conversationId !== currentConv.conversationId) {
          console.log('Messages do not match current conversation, skipping update...');
          return;
        }
        
        set({ messages });
        
        // Save to localStorage for non-draft conversations
        if (currentConv?.conversationId && !currentConv.conversationId.startsWith('draft-')) {
          try {
            const messageData = JSON.stringify(messages.slice(-50));
            localStorage.setItem(`messages_${currentConv.conversationId}`, messageData);
            localStorage.setItem(`messages-${currentConv.conversationId}`, messageData);
          } catch (error) {
            console.error('Error saving messages to localStorage:', error);
          }
        }
      },
      setManagerType: (managerType) => set({ managerType }),
      setTemperature: (temperature) => set({ temperature }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      clearMessages: () => set({ messages: [] }),
      
      // New function to clear all user-related data on logout
      clearAllData: () => {
        console.log('Clearing all user data from Zustand store...');
        set({
          token: null,
          user: null,
          currentConversation: null,
          messages: []
        });
        // Also clear relevant localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('current-conversation-id');
        // You might want to loop through localStorage and remove all 'messages_*' keys if needed
      }
    }),
    {
      name: 'eva-store',
      partialize: (state) => ({
        darkMode: state.darkMode,
        token: state.token,
        user: state.user,
        currentConversation: state.currentConversation,
        managerType: state.managerType,
        temperature: state.temperature
      })
    }
  )
); 