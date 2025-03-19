import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '@/services/api';
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
  Eye,
  Github,
  FileText
} from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const queryClient = useQueryClient();
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
  
  // Fetch conversations
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery(
    ['conversations'],
    () => conversationApi.getConversations(),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false
    }
  );

  // Start a new conversation
  const startConversationMutation = useMutation({
    mutationFn: (managerType: ManagerType) => conversationApi.createConversation(managerType),
    onSuccess: (data) => {
      setCurrentConversation(data);
      queryClient.invalidateQueries(['conversations']);
    }
  });

  // Delete a conversation
  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) => conversationApi.deleteConversation(conversationId),
    onSuccess: () => {
      if (currentConversation?.conversationId === selectedConversationId) {
        setCurrentConversation(null);
      }
      queryClient.invalidateQueries(['conversations']);
    }
  });

  const handleNewChat = async () => {
    startConversationMutation.mutate(managerType);
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
      deleteConversationMutation.mutate(selectedConversationId);
    }
    setShowContextMenu(false);
  };

  // Add click outside handler
  useEffect(() => {
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
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Manager Type Selection - Fixed height */}
      <div className="flex-none p-2 space-y-0.5">
        <button
          onClick={() => setManagerType('PUPPETEER')}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            managerType === 'PUPPETEER' ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          )}
        >
          <Wand2 className="h-4 w-4" />
          Puppeteer
        </button>
        <button
          onClick={() => setManagerType('DILUTER')}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            managerType === 'DILUTER' ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          )}
        >
          <Shield className="h-4 w-4" />
          Diluter
        </button>
        <button
          onClick={() => setManagerType('CAMOUFLAGER')}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            managerType === 'CAMOUFLAGER' ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          )}
        >
          <Eye className="h-4 w-4" />
          Camouflager
        </button>
      </div>

      {/* Conversation List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          <button
            onClick={handleNewChat}
            disabled={startConversationMutation.isLoading}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100"
          >
            {startConversationMutation.isLoading ? 
              <Loader2 className="h-4 w-4 animate-spin" /> : 
              <Plus className="h-4 w-4" />
            }
            New Chat
          </button>

          {isLoadingConversations ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.conversationId}
                onClick={() => setCurrentConversation(conversation)}
                onContextMenu={(e) => handleContextMenu(e, conversation.conversationId)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-200",
                  currentConversation?.conversationId === conversation.conversationId
                    ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                )}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="truncate flex-1 text-left">Chat {format(new Date(conversation.createdAt), 'MMM d')}</span>
                <span className="flex-shrink-0 text-xs text-gray-400">
                  {format(new Date(conversation.createdAt), 'h:mm a')}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* User section */}
      <div className="mt-auto px-2 py-2 border-t border-gray-200 dark:border-gray-700">
        <div className="relative">
          <div className="flex items-center">
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="flex items-center gap-2 flex-1 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors rounded p-2 cursor-pointer z-10"
              style={{ userSelect: 'none' }}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-blue-600 text-white font-medium">
                  {user?.fullName?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate text-gray-900 dark:text-gray-100 ml-2">
                {user?.fullName || 'User'}
              </span>
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full z-10"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>

          {showLogout && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setShowLogout(false)}
              />
              <div className="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden z-30">
                <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  {user?.email || 'user@example.com'}
                </div>
                <div className="p-1">
                  <a
                    href="https://github.com/egemenmermer/yu-thesis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full p-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded"
                  >
                    <Github className="h-4 w-4" />
                    GitHub Repository
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-2 w-full p-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded"
                  >
                    <FileText className="h-4 w-4" />
                    Research Paper
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full p-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowContextMenu(false)}
          />
          <div
            ref={contextMenuRef}
            style={{ top: contextMenuPosition.y, left: contextMenuPosition.x }}
            className="fixed z-50 min-w-[160px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
          >
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
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