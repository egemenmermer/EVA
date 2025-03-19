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
  setUser: (user: User | null) => void;
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

export const useStore = create<Store>()(
  persist(
    (set) => ({
      user: null,
      currentConversation: null,
      messages: [],
      managerType: 'PUPPETEER',
      darkMode: getInitialDarkMode(),
      
      setUser: (user: User | null) => {
        console.log('Setting user in store:', user);
        set({ user });
        if (!user) {
          // Clear related state when user is logged out
          set({ currentConversation: null, messages: [] });
        }
      },
      setCurrentConversation: (conversation: Conversation | null) => 
        set({ currentConversation: conversation, messages: [] }),
      setMessages: (messages: ConversationContentResponseDTO[]) =>
        set({ messages }),
      addMessage: (message: ConversationContentResponseDTO) => 
        set((state) => {
          console.log('Adding message to store:', message);
          return { messages: [...state.messages, message] };
        }),
      deleteMessage: (messageId: string) =>
        set((state) => ({
          messages: state.messages.filter((msg, index) => `${msg.conversationId}-${index}` !== messageId)
        })),
      setManagerType: (type: ManagerType) => set({ managerType: type }),
      toggleDarkMode: () => 
        set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        user: state.user,
        darkMode: state.darkMode,
        managerType: state.managerType
      }),
      onRehydrateStorage: () => (state) => {
        // Check if there's a token but no user
        const token = localStorage.getItem('token');
        if (!token && state?.user) {
          state.setUser(null);
        }
        console.log('Store rehydrated:', state);
      }
    }
  )
); 