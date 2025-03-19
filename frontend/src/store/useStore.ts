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
    (set, get) => ({
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
      setCurrentConversation: (conversation: Conversation | null) => {
        const currentMessages = get().messages;
        set({ 
          currentConversation: conversation,
          // Only clear messages if it's a new conversation
          messages: conversation?.conversationId !== get().currentConversation?.conversationId ? [] : currentMessages
        });
      },
      setMessages: (messages: ConversationContentResponseDTO[]) => {
        console.log('Setting messages:', messages);
        set({ messages });
      },
      addMessage: (message: ConversationContentResponseDTO) => 
        set((state) => {
          console.log('Adding message to store:', message);
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
      setManagerType: (type: ManagerType) => set({ managerType: type }),
      toggleDarkMode: () => 
        set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        user: state.user,
        darkMode: state.darkMode,
        managerType: state.managerType,
        messages: state.messages,
        currentConversation: state.currentConversation
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          console.log('Loading from storage:', data);
          return data;
        },
        setItem: (name, value) => {
          console.log('Saving to storage:', value);
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
); 