import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Conversation, ManagerType } from '@/types';
import type { ConversationContentResponseDTO } from '@/types/api';

// Define the Message type properly
interface Message {
  id?: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface Store {
  user: User | null;
  token: string | null;
  currentConversation: Conversation | null;
  messages: Message[];
  managerType: ManagerType;
  darkMode: boolean;
  
  // Setters
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  deleteMessage: (messageId: string) => void;
  setManagerType: (managerType: ManagerType) => void;
  toggleDarkMode: () => void;
}

// Format token with Bearer prefix if needed
const formatToken = (token: string | null): string | null => {
  if (!token) return null;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

// Get initial dark mode from system preference
const getInitialDarkMode = () => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Get initial token from localStorage directly - no formatting
const getInitialToken = () => {
  const token = localStorage.getItem('token');
  console.log('Initial token from localStorage:', token ? 'EXISTS' : 'MISSING');
  return token;
};

// Mock user for development
const MOCK_USER: User = {
  id: 'mock-user-id',
  email: 'egemenmermer@gmail.com',
  fullName: 'Egemen Mermer'
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      user: MOCK_USER, // Start with mock user for easier development
      token: null,
      currentConversation: null,
      messages: [],
      managerType: 'PUPPETEER',
      darkMode: getInitialDarkMode(),
      
      setUser: (user) => {
        console.log('Store: Setting user:', user?.email || 'null');
        set({ user });
        if (!user) {
          // Clear related state when user is logged out
          set({ currentConversation: null, messages: [], token: null });
          localStorage.removeItem('token');
        }
      },
      
      setToken: (token) => {
        console.log('Store: Setting token:', token ? 'EXISTS' : 'null');
        // Format token with Bearer prefix if needed
        const formattedToken = formatToken(token);
        set({ token: formattedToken });
        if (formattedToken) {
          localStorage.setItem('token', formattedToken);
        } else {
          localStorage.removeItem('token');
        }
      },
      
      setCurrentConversation: (conversation) => {
        // Skip setting if conversation ID is invalid (mock)
        if (conversation?.conversationId && conversation.conversationId.includes('mock-')) {
          console.error('Attempted to set mock conversation:', conversation.conversationId);
          return;
        }
        
        console.log('Store: Setting current conversation:', conversation?.conversationId || 'null');
        set({ currentConversation: conversation });
      },
      
      setMessages: (messages) => {
        console.log('Store: Setting messages array, count:', messages.length);
        set({ messages });
      },
      
      addMessage: (message) => {
        console.log('Store: Adding message:', message.role);
        set((state) => {
          // Check for duplicates before adding
          const isDuplicate = state.messages.some(
            (m) => m.content === message.content && 
                  m.role === message.role && 
                  m.conversationId === message.conversationId
          );
          if (isDuplicate) {
            return state;
          }
          return { messages: [...state.messages, message] };
        });
      },
      
      deleteMessage: (messageId) => {
        console.log('Store: Deleting message:', messageId);
        set((state) => ({ 
          messages: state.messages.filter((msg) => msg.id !== messageId) 
        }));
      },
      
      setManagerType: (managerType) => {
        console.log('Store: Setting manager type:', managerType);
        set({ managerType });
      },
      
      toggleDarkMode: () => {
        set((state) => {
          const newDarkMode = !state.darkMode;
          console.log('Store: Toggling dark mode:', newDarkMode ? 'dark' : 'light');
          return { darkMode: newDarkMode };
        });
      }
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        darkMode: state.darkMode,
        managerType: state.managerType,
        // Don't store messages in localStorage to prevent it from growing too large
        // They'll be fetched from API when needed
        currentConversation: state.currentConversation
      }),
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            if (!str) return null;
            const data = JSON.parse(str);
            console.log('Loading from storage:', name);
            return data;
          } catch (error) {
            console.error('Error loading from storage:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            console.log('Saving to storage:', name);
            localStorage.setItem(name, JSON.stringify(value));
          } catch (error) {
            console.error('Error saving to storage:', error);
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.error('Error removing from storage:', error);
          }
        }
      }
    }
  )
); 