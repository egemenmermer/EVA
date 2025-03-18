import React from 'react';
import { useStore } from '@/store/useStore';
import { useConversation } from '@/hooks/useConversation';
import { format } from 'date-fns';
import { 
  MessageSquare, 
  Plus, 
  Scale, 
  Code2, 
  Shield, 
  Moon, 
  Sun,
  Loader2 
} from 'lucide-react';
import type { ManagerType } from '@/types';

const managerTypes: { type: ManagerType; icon: React.ReactNode; label: string }[] = [
  { type: 'PUPPETEER', icon: <Scale className="h-5 w-5" />, label: 'Puppeteer' },
  { type: 'DILUTER', icon: <Code2 className="h-5 w-5" />, label: 'Diluter' },
  { type: 'CAMOUFLAGER', icon: <Shield className="h-5 w-5" />, label: 'Camouflager' },
];

export const Sidebar: React.FC = () => {
  const { 
    user, 
    currentConversation, 
    managerType, 
    setManagerType, 
    setCurrentConversation,
    darkMode,
    toggleDarkMode 
  } = useStore();
  
  const { conversations, startConversation, isLoading } = useConversation();

  const handleNewChat = async () => {
    await startConversation(managerType);
  };

  return (
    <aside className="w-64 flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleNewChat}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg
                   hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Plus className="h-5 w-5" />
              <span>New Chat</span>
            </>
          )}
        </button>
      </div>

      {/* Manager Type Selection */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Manager Type</h3>
        <div className="space-y-1">
          {managerTypes.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => setManagerType(type)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                       ${managerType === type 
                         ? 'bg-blue-500 text-white' 
                         : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                       }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation History */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Chats</h3>
        <div className="space-y-1">
          {conversations?.map((conversation) => (
            <button
              key={conversation.conversationId}
              onClick={() => setCurrentConversation(conversation)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                       ${currentConversation?.conversationId === conversation.conversationId
                         ? 'bg-blue-500 text-white'
                         : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                       }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="flex-1 truncate text-left">
                {format(new Date(conversation.createdAt), 'MMM d, yyyy')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {user?.fullName}
          </span>
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                     rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2
                     focus:ring-gray-300 dark:focus:ring-gray-600"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}; 