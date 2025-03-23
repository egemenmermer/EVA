import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';
import { HiPlus, HiOutlineTrash, HiLogout } from 'react-icons/hi';
import { IoMdMenu } from 'react-icons/io';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { conversationApi } from '@/services/api';
import type { ManagerType, Conversation } from '@/types';
import type { ConversationContentResponseDTO } from '@/types/api';
import { Mail, Github, ExternalLink, FileText, LogOut, Sun, Moon } from 'lucide-react';

// Type for manager types - use the original enum values
const managerTypes: { type: ManagerType; icon: React.ReactNode; label: string }[] = [
  { type: 'PUPPETEER', icon: null, label: 'Puppeteer' },
  { type: 'DILUTER', icon: null, label: 'Diluter' },
  { type: 'CAMOUFLAGER', icon: null, label: 'Camouflager' },
];

export const Sidebar: React.FC = () => {
  const { setCurrentConversation, currentConversation, managerType, setManagerType, user, darkMode } = useStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  // State for direct fetched conversations
  const [directFetchedConversations, setDirectFetchedConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ top: 0, left: 0 });
  const [contextMenuConversationId, setContextMenuConversationId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Convert any conversation list to remove mock IDs
  const sanitizeConversations = (conversations: Conversation[]): Conversation[] => {
    return conversations.filter(conv => {
      // Only keep conversation IDs that look like valid UUIDs
      if (conv.conversationId && conv.conversationId.includes('mock-')) {
        console.warn('Filtering out mock conversation:', conv.conversationId);
        return false;
      }
      return true;
    });
  };

  // Fetch conversations directly from API
  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await conversationApi.getConversations();
      console.log('Fetched conversations:', response);
      
      // Store fetched conversations after sanitizing
      if (response && Array.isArray(response)) {
        const sanitized = sanitizeConversations(response);
        setDirectFetchedConversations(sanitized);
      }
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      if (err?.response?.status === 401) {
        setError('Authentication error. Please log in again.');
      } else {
        setError('Failed to load conversations. Check server connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch conversations on mount and periodically with reduced frequency
  useEffect(() => {
    // Initial fetch
    fetchConversations();
    
    // Refresh less frequently - once per minute
    const interval = setInterval(() => {
      fetchConversations();
    }, 60000); // 1 minute
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewChat = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Creating new conversation with manager type:', managerType);
      const newConversation = await conversationApi.createConversation(managerType);
      
      console.log('New conversation created:', newConversation);
      
      if (newConversation && newConversation.conversationId) {
        // Create a properly formatted conversation object
        const conversation: Conversation = {
          conversationId: newConversation.conversationId,
          title: 'New conversation',
          lastMessage: '',
          lastMessageDate: newConversation.createdAt,
          managerType: newConversation.managerType
        };
        
        // Update the conversation list
        setDirectFetchedConversations(prev => [conversation, ...prev]);
        
        // Set as current conversation
        setCurrentConversation(conversation);
        
        // Save current conversation ID to localStorage
        localStorage.setItem('current-conversation-id', conversation.conversationId);
        console.log('Saved new conversation ID to localStorage:', conversation.conversationId);
        
        // Initialize empty message array in localStorage
        localStorage.setItem(`messages-${conversation.conversationId}`, JSON.stringify([]));
        
        // Close mobile sidebar if open
        setMobileOpen(false);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Error creating new conversation:', err);
      setError('Failed to create conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setShowContextMenu(false);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    // Skip if trying to select an invalid conversation ID (non-UUID)
    if (conversation.conversationId && conversation.conversationId.includes('mock-')) {
      console.error('Cannot select mock conversation with non-UUID ID:', conversation.conversationId);
      setError('Cannot use mock conversation. Please create a new chat.');
      return;
    }
    
    console.log('Selected conversation:', conversation.conversationId);
    setCurrentConversation(conversation);
    
    // Save current conversation ID to localStorage
    localStorage.setItem('current-conversation-id', conversation.conversationId);
    console.log('Saved selected conversation ID to localStorage:', conversation.conversationId);
    
    // Close mobile sidebar if open
    setMobileOpen(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setShowContextMenu(false);
    
    // If it's the current conversation, clear it
    if (currentConversation?.conversationId === id) {
      setCurrentConversation(null);
    }
    
    try {
      // Remove from local state
      setDirectFetchedConversations(prev => 
        prev.filter(conv => conv.conversationId !== id)
      );
      
      // API call to delete from server would go here
      // await conversationApi.deleteConversation(id);
      
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      // Refetch to ensure UI is in sync
      fetchConversations();
    }
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setContextMenuConversationId(id);
    setContextMenuPosition({ top: e.clientY, left: e.clientX });
    setShowContextMenu(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="h-full flex flex-col">
      {/* New Chat Button */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-between p-3 rounded-md bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
        >
          <span className="font-medium">New chat</span>
          <HiPlus size={20} />
        </button>
      </div>

      {/* Manager Type Selector - Moved to the top */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Manager Type
        </div>
        <div className="space-y-1">
          {managerTypes.map((item) => (
            <button
              key={item.type}
              onClick={() => setManagerType(item.type)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md flex items-center space-x-2 text-sm",
                managerType === item.type 
                  ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-600 dark:text-red-400 text-sm">
            {error}. <button onClick={fetchConversations} className="underline">Retry</button>
          </div>
        ) : directFetchedConversations.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
            No conversations yet. Start a new chat!
          </div>
        ) : (
          directFetchedConversations.map((conversation) => (
            <div
              key={conversation.conversationId}
              onClick={() => handleSelectConversation(conversation)}
              onContextMenu={(e) => handleContextMenu(e, conversation.conversationId)}
              className={`flex flex-col cursor-pointer p-3 rounded-md ${
                currentConversation?.conversationId === conversation.conversationId
                  ? 'bg-gray-200 dark:bg-gray-700'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="font-medium truncate text-gray-900 dark:text-gray-100">
                {conversation.title || 'New conversation'}
              </div>
              <div className="flex justify-between items-center mt-1">
                <div className="text-sm truncate text-gray-500 dark:text-gray-400 flex-1">
                  {conversation.lastMessage || 'No messages yet'}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
                  {conversation.lastMessageDate ? formatDate(conversation.lastMessageDate) : ''}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* User Profile Section */}
      <div className="mt-auto p-3 border-t border-gray-200 dark:border-gray-700" ref={profileMenuRef}>
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center p-3 rounded-md bg-gray-200 dark:bg-gray-800 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex-grow mr-2"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.fullName || 'User'}
              </p>
            </div>
          </div>

          <button
            onClick={() => useStore.getState().toggleDarkMode()}
            className="p-3 rounded-md bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-gray-900 dark:text-gray-100" />
            ) : (
              <Moon className="h-5 w-5 text-gray-900 dark:text-gray-100" />
            )}
          </button>
        </div>

        {showProfileMenu && (
          <div className="absolute bottom-24 left-3 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email || 'user@example.com'}
              </p>
            </div>
            <a 
              href="https://github.com/egemenmermer/Thesis"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub Repository
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
            <a 
              href="https://example.com/research-paper.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Research Paper
              <ExternalLink className="ml-auto h-4 w-4" />
            </a>
            <div className="border-t border-gray-200 dark:border-gray-700" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && contextMenuConversationId && (
        <div
          ref={contextMenuRef}
          style={{ 
            position: 'fixed', 
            top: contextMenuPosition.top, 
            left: contextMenuPosition.left,
            zIndex: 50
          }}
          className="bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 p-1"
        >
          <button
            onClick={(e) => handleDeleteConversation(e, contextMenuConversationId)}
            className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400 w-full text-left"
          >
            <HiOutlineTrash size={16} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}; 