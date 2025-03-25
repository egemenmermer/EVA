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
  temperature: number;
  
  // Setters
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  deleteMessage: (messageId: string) => void;
  setManagerType: (managerType: ManagerType) => void;
  setTemperature: (temperature: number) => void;
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
  console.log('Initial token from localStorage:', token ? 'EXISTS' : 'MISSING', token ? token.substring(0, 20) + '...' : '');
  return token;
};

// Mock user for development - only use if token exists
const getMockUser = (): User | null => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found, starting with null user');
    return null;
  }
  
  console.log('Token found, using mock user for development');
  return {
    id: 'mock-user-id',
    email: 'egemenmermer@gmail.com',
    fullName: 'Egemen Mermer'
  };
};

// Debug initial store state
const initialUser = getMockUser();
console.log('Initializing store with user:', initialUser ? initialUser.email : 'null');

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      user: initialUser, // Start with null user if no token
      token: getInitialToken(),
      currentConversation: null,
      messages: [],
      managerType: 'PUPPETEER',
      darkMode: getInitialDarkMode(),
      temperature: 0.7,
      
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
        
        // Save current conversation ID to a separate localStorage key for redundancy
        if (conversation?.conversationId) {
          localStorage.setItem('current-conversation-id', conversation.conversationId);
          console.log('Saved current conversation ID to localStorage:', conversation.conversationId);
        }
      },
      
      setMessages: (messages) => {
        console.log('Store: Setting messages array, count:', messages.length);
        set({ messages });
        
        // Ensure we save messages to localStorage for redundancy
        if (messages.length > 0 && get().currentConversation?.conversationId) {
          const conversationId = get().currentConversation?.conversationId || '';
          try {
            localStorage.setItem(`messages-${conversationId}`, JSON.stringify(messages.slice(-50)));
            console.log(`Saved ${messages.length} messages to localStorage for conversation:`, conversationId);
          } catch (error) {
            console.error('Error saving messages to localStorage:', error);
          }
        }
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
          
          const updatedMessages = [...state.messages, message];
          
          // Save to localStorage for backup
          if (message.conversationId) {
            try {
              localStorage.setItem(`messages-${message.conversationId}`, JSON.stringify(updatedMessages.slice(-50)));
              console.log(`Saved updated messages (${updatedMessages.length}) to localStorage`);
            } catch (error) {
              console.error('Error saving messages to localStorage in addMessage:', error);
            }
          }
          
          return { messages: updatedMessages };
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
      
      setTemperature: (temperature) => {
        console.log('Store: Setting temperature:', temperature);
        set({ temperature });
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
        temperature: state.temperature,
        // Store current conversation ID to reload after refresh
        currentConversation: state.currentConversation,
        // Store a limited number of recent messages to preserve context across refreshes
        messages: state.messages.slice(-20) // Keep last 20 messages
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