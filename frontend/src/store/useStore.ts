import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Conversation, ManagerType } from '@/types';
import type { ConversationContentResponseDTO } from '@/types/api';

interface Store {
  user: User | null;
  currentConversation: Conversation | null;
  messages: ConversationContentResponseDTO[];
  managerType: ManagerType;
  darkMode: boolean;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: ConversationContentResponseDTO[]) => void;
  addMessage: (message: ConversationContentResponseDTO) => void;
  deleteMessage: (messageId: string) => void;
  setManagerType: (type: ManagerType) => void;
  toggleDarkMode: () => void;
}

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
      currentConversation: null,
      messages: [],
      managerType: 'PUPPETEER',
      darkMode: getInitialDarkMode(),
      token: getInitialToken(),
      
      setUser: (user: User | null) => {
        console.log('Setting user in store:', user ? user.fullName : 'null');
        set({ user });
        if (!user) {
          // Clear related state when user is logged out
          set({ currentConversation: null, messages: [], token: null });
          localStorage.removeItem('token');
        }
      },
      
      setToken: (token: string | null) => {
        // Store token exactly as received - no formatting
        console.log('Setting token in store:', token ? '[TOKEN]' : 'null');
        set({ token });
        if (token) {
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('token');
        }
      },
      
      setCurrentConversation: (conversation: Conversation | null) => {
        console.log('Setting current conversation:', conversation?.conversationId || 'null');
        const currentMessages = get().messages;
        set({ 
          currentConversation: conversation,
          // Only clear messages if it's a new conversation
          messages: conversation?.conversationId !== get().currentConversation?.conversationId ? [] : currentMessages
        });
      },
      
      setMessages: (messages: ConversationContentResponseDTO[]) => {
        console.log('Setting messages:', messages.length);
        // Make sure messages are unique before setting
        const uniqueMessages = messages.filter((message, index, self) => 
          index === self.findIndex((m) => 
            m.content === message.content && 
            m.role === message.role && 
            m.conversationId === message.conversationId
          )
        );
        set({ messages: uniqueMessages });
      },
      
      addMessage: (message: ConversationContentResponseDTO) => 
        set((state) => {
          console.log('Adding message to store:', message.role, message.content.substring(0, 20) + '...');
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
        }),
        
      deleteMessage: (messageId: string) =>
        set((state) => ({
          messages: state.messages.filter((msg, index) => `${msg.conversationId}-${index}` !== messageId)
        })),
        
      setManagerType: (type: ManagerType) => {
        console.log('Setting manager type:', type);
        set({ managerType: type });
      },
      
      toggleDarkMode: () => 
        set((state) => {
          const newDarkMode = !state.darkMode;
          console.log('Toggling dark mode:', newDarkMode ? 'dark' : 'light');
          return { darkMode: newDarkMode };
        }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        user: state.user,
        darkMode: state.darkMode,
        managerType: state.managerType,
        // Don't store messages in localStorage to prevent it from growing too large
        // They'll be fetched from API when needed
        currentConversation: state.currentConversation,
        token: state.token
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