import React, { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useConversation } from '@/hooks/useConversation';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { 
  MessageSquare, 
  Plus, 
  Scale, 
  Code2, 
  Shield, 
  Moon, 
  Sun,
  Loader2,
  LogOut,
  Trash2,
  Wand2,
  Eye
} from 'lucide-react';
import type { ManagerType } from '@/types';
import { cn } from '@/lib/utils';

const managerTypes: { type: ManagerType; icon: React.ReactNode; label: string }[] = [
  { type: 'PUPPETEER', icon: <Scale className="h-5 w-5" />, label: 'Puppeteer' },
  { type: 'DILUTER', icon: <Code2 className="h-5 w-5" />, label: 'Diluter' },
  { type: 'CAMOUFLAGER', icon: <Shield className="h-5 w-5" />, label: 'Camouflager' },
];

export const Sidebar: React.FC = () => {
  const [showLogout, setShowLogout] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const { 
    user, 
    currentConversation, 
    managerType, 
    setManagerType, 
    setCurrentConversation,
    darkMode,
    toggleDarkMode 
  } = useStore();
  
  const { conversations, startConversation, isLoading, deleteConversation } = useConversation();

  const handleNewChat = async () => {
    await startConversation(managerType);
  };

  const handleLogout = () => {
    logout();
    setShowLogout(false);
  };

  const handleContextMenu = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate position relative to viewport
    const x = e.clientX;
    const y = e.clientY;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get context menu dimensions
    const menuWidth = 150;
    const menuHeight = 40;
    
    // Adjust position if it would render outside viewport
    const adjustedX = Math.min(x, viewportWidth - menuWidth);
    const adjustedY = Math.min(y, viewportHeight - menuHeight);
    
    setContextMenuPosition({ x: adjustedX, y: adjustedY });
    setSelectedConversationId(conversationId);
    setShowContextMenu(true);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedConversationId) {
      try {
        await deleteConversation(selectedConversationId);
        // The rest of the cleanup is handled in the mutation
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
    setShowContextMenu(false);
  };

  // Add click outside handler
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };

    const handleScroll = () => {
      setShowContextMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('scroll', handleScroll);
    document.addEventListener('contextmenu', (e) => {
      if (!contextMenuRef.current?.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    });

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('contextmenu', (e) => {
        if (!contextMenuRef.current?.contains(e.target as Node)) {
          setShowContextMenu(false);
        }
      });
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Manager Type Selection - Fixed height */}
      <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          <button
            onClick={() => setManagerType('PUPPETEER')}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm select-none",
              managerType === 'PUPPETEER' ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <Wand2 className="h-4 w-4" />
            Puppeteer
          </button>
          <button
            onClick={() => setManagerType('DILUTER')}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm select-none",
              managerType === 'DILUTER' ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <Shield className="h-4 w-4" />
            Diluter
          </button>
          <button
            onClick={() => setManagerType('CAMOUFLAGER')}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm select-none",
              managerType === 'CAMOUFLAGER' ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <Eye className="h-4 w-4" />
            Camouflager
          </button>
        </div>
      </div>

      {/* Conversation List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-blue-500 hover:bg-blue-600 text-white select-none"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>

          {conversations?.map((conversation) => (
            <button
              key={conversation.conversationId}
              onClick={() => setCurrentConversation(conversation)}
              onContextMenu={(e) => handleContextMenu(e, conversation.conversationId)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm select-none",
                currentConversation?.conversationId === conversation.conversationId
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Conversation {format(new Date(conversation.createdAt), 'MMM d, yyyy')}
            </button>
          ))}
        </div>
      </div>

      {/* User Actions - Fixed height */}
      <div className="flex-none p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {user?.fullName}
          </span>
          <button
            onClick={toggleDarkMode}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                     rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
            className="absolute z-50 min-w-[160px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
          >
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}; 