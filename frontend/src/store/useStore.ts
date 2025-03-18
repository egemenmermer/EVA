import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Conversation, Message, ManagerType } from '@/types';

interface Store {
  user: User | null;
  currentConversation: Conversation | null;
  messages: Message[];
  managerType: ManagerType;
  darkMode: boolean;
  setUser: (user: User | null) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (message: Message) => void;
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
      
      setUser: (user: User | null) => set({ user }),
      setCurrentConversation: (conversation: Conversation | null) => 
        set({ currentConversation: conversation }),
      addMessage: (message: Message) => 
        set((state) => ({ messages: [...state.messages, message] })),
      setManagerType: (type: ManagerType) => set({ managerType: type }),
      toggleDarkMode: () => 
        set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ 
        darkMode: state.darkMode,
        managerType: state.managerType 
      }),
    }
  )
); 