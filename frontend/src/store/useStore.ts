import { create } from 'zustand';
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

export const useStore = create<Store>((set) => ({
  user: null,
  currentConversation: null,
  messages: [],
  managerType: 'ETHICAL',
  darkMode: false,
  
  setUser: (user: User | null) => set({ user }),
  setCurrentConversation: (conversation: Conversation | null) => set({ currentConversation: conversation }),
  addMessage: (message: Message) => set((state: Store) => ({ 
    messages: [...state.messages, message] 
  })),
  setManagerType: (type: ManagerType) => set({ managerType: type }),
  toggleDarkMode: () => set((state: Store) => ({ darkMode: !state.darkMode })),
})); 