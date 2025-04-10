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
}

export interface User {
  id: string;
  email: string;
  fullName: string;
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
        if (conversation?.conversationId && conversation.conversationId.includes('mock-')) {
          console.error('Attempted to set mock conversation:', conversation.conversationId);
          return;
        }
        
        set({ currentConversation: conversation });
        
        if (conversation?.conversationId) {
          localStorage.setItem('current-conversation-id', conversation.conversationId);
        }
      },
      
      addMessage: (message) => {
        const messages = get().messages;
        
        const isDuplicate = messages.some(
          (m) => m.content === message.content && 
                m.role === message.role && 
                m.conversationId === message.conversationId
        );
        
        if (isDuplicate) {
          console.log('Duplicate message detected, skipping...');
          return;
        }
        
        const updatedMessages = [...messages, message];
        set({ messages: updatedMessages });
        
        if (message.conversationId) {
          try {
            localStorage.setItem(`messages-${message.conversationId}`, JSON.stringify(updatedMessages.slice(-50)));
          } catch (error) {
            console.error('Error saving messages to localStorage:', error);
          }
        }
      },
      
      setMessages: (messages) => set({ messages }),
      setManagerType: (managerType) => set({ managerType }),
      setTemperature: (temperature) => set({ temperature }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      clearMessages: () => set({ messages: [] })
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