import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
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
import { Mail, Github, ExternalLink, FileText, LogOut, Sun, Moon, Bot, BookOpen } from 'lucide-react';
import { TemperatureControl } from '@/components/controls/TemperatureControl';
import { v4 as uuidv4 } from 'uuid';

// Type for manager types - use the original enum values
const managerTypes: { type: ManagerType; icon: React.ReactNode; label: string }[] = [
  { type: 'PUPPETEER', icon: null, label: 'Puppeteer' },
  { type: 'DILUTER', icon: null, label: 'Diluter' },
  { type: 'CAMOUFLAGER', icon: null, label: 'Camouflager' },
];

// Type for the Sidebar component props
interface SidebarProps {
  // showPracticeLink prop removed
}

// Profile Menu component to be rendered in a portal
const ProfileMenu = ({ 
  user, 
  onLogout, 
  menuRef 
}: { 
  user: any, 
  onLogout: () => void,
  menuRef: React.RefObject<HTMLDivElement>
}) => {
  // Get dark mode state from store
  const { darkMode } = useStore();
  
  // Create portal to render outside the sidebar
  return ReactDOM.createPortal(
    <>
      {/* Backdrop to ensure menu stands out */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          zIndex: 9998,
        }}
        className="animate-in fade-in duration-150"
        onClick={() => document.dispatchEvent(new MouseEvent('mousedown'))}
      />
      
      {/* Actual menu */}
      <div 
        ref={menuRef}
        style={{
          position: 'fixed',
          bottom: '70px',
          left: '20px',
          zIndex: 9999,
          width: '260px'
        }}
        className="bg-white dark:bg-gray-800 rounded-md shadow-xl border-2 border-gray-300 dark:border-gray-600 overflow-hidden animate-in slide-in-from-bottom-2 duration-150"
      >
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
        <a 
          href="/?stay=true"
          className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Bot className="mr-2 h-4 w-4" />
          About EVA
        </a>
        <div className="border-t border-gray-200 dark:border-gray-700" />
        <button
          onClick={onLogout}
          className="w-full flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </button>
      </div>
    </>,
    document.body
  );
};

export const Sidebar: React.FC<SidebarProps> = () => {
  const { setCurrentConversation, currentConversation, managerType, setManagerType, user, darkMode, setMessages } = useStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLDivElement>(null);
  
  // State for direct fetched conversations
  const [directFetchedConversations, setDirectFetchedConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      
      // Store fetched conversations after sanitizing and mapping to add isDraft property
      if (response && Array.isArray(response)) {
        const mappedConversations = response.map(conv => ({
          ...conv,
          isDraft: false // All server conversations are not drafts
        }));
        
        const sanitized = sanitizeConversations(mappedConversations);
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

  // Listen for refresh events from ChatWindow
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log('Sidebar: Received refresh-conversations event');
      fetchConversations();
    };
    
    window.addEventListener('refresh-conversations', handleRefreshEvent);
    
    return () => {
      window.removeEventListener('refresh-conversations', handleRefreshEvent);
    };
  }, []);
  
  // Re-fetch conversations when current conversation changes
  useEffect(() => {
    if (currentConversation && !currentConversation.isDraft) {
      console.log('Sidebar: Current conversation changed, refreshing conversation list');
      fetchConversations();
    }
  }, [currentConversation]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showProfileMenu &&
        profileMenuRef.current && 
        profileButtonRef.current && 
        !profileMenuRef.current.contains(e.target as Node) &&
        !profileButtonRef.current.contains(e.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  const handleNewChat = async () => {
    try {
      const timestamp = new Date().toISOString();
      // Create a temporary draft conversation object
      const draftConversation: Conversation = {
        conversationId: `draft-${uuidv4()}`,
        title: 'New Conversation',
        managerType: managerType,
        createdAt: timestamp,
        isDraft: true
      };
      
      console.log('Creating draft conversation:', draftConversation);
      
      // Clear messages first
      setMessages([]);
      
      // Then set the new conversation
      setCurrentConversation(draftConversation);
      
      // Close mobile sidebar if open
      setMobileOpen(false);
      
    } catch (err: any) {
      console.error('Error creating new conversation:', err);
      setError('Failed to create conversation. Please try again.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSelectConversation = (conversation: Conversation) => {
    // Skip if trying to select an invalid conversation ID
    if (conversation.conversationId && (
      conversation.conversationId.includes('mock-') || 
      (conversation.conversationId.startsWith('draft-') && !conversation.isDraft)
    )) {
      console.error('Cannot select invalid conversation with non-UUID ID:', conversation.conversationId);
      setError('Cannot use this conversation. Please create a new chat.');
      return;
    }
    
    const timestamp = new Date().toISOString();
    // Ensure all fields are present with defaults
    const mappedConversation: Conversation = {
      ...conversation,
      title: conversation.title || 'Untitled Conversation',
      createdAt: conversation.createdAt || timestamp,
      lastMessageDate: conversation.lastMessageDate || conversation.createdAt || timestamp
    };
    
    console.log('Selected conversation:', mappedConversation.conversationId);
    setCurrentConversation(mappedConversation);
    localStorage.setItem('current-conversation-id', mappedConversation.conversationId);
    setMobileOpen(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    try {
      console.log('Deleting conversation:', id);
      
      // If it's the current conversation, clear it
      if (currentConversation?.conversationId === id) {
        setCurrentConversation(null);
        // Also clear from localStorage
        localStorage.removeItem('current-conversation-id');
      }
      
      // Remove from local state first for immediate UI feedback
      setDirectFetchedConversations(prev => 
        prev.filter(conv => conv.conversationId !== id)
      );
      
      // Clear messages from localStorage
      localStorage.removeItem(`messages-${id}`);
      
      // API call to delete from server
      await conversationApi.deleteConversation(id);
      console.log('Conversation successfully deleted from server');
      
      // Refetch to ensure UI is in sync with server
      fetchConversations();
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      // Refetch to ensure UI is in sync
      fetchConversations();
    }
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

  // Simplified toggle for profile menu
  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* New Chat Button only (practice button removed) */}
      <div className="flex flex-col p-3 gap-2">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
        >
          <HiPlus size={18} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Manager Type Selector - unchanged */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Manager Type
        </label>
        <div className="flex flex-col gap-1">
          {managerTypes.map((type) => (
            <button
              key={type.type}
              className={`flex items-center p-2 rounded-md transition-colors ${
                managerType === type.type
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => setManagerType(type.type)}
            >
              <div className="w-5 h-5 flex items-center justify-center mr-2">
                {type.icon}
              </div>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Temperature Control */}
      <TemperatureControl />

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
          // Filter out draft conversations - they shouldn't appear in the list until saved
          directFetchedConversations
            .filter(conversation => !conversation.isDraft)
            // Sort by lastMessageDate (or createdAt) in descending order (newest first)
            .sort((a, b) => {
              const dateA = a.lastMessageDate || a.createdAt || '';
              const dateB = b.lastMessageDate || b.createdAt || '';
              return new Date(dateB).getTime() - new Date(dateA).getTime();
            })
            .map((conversation) => (
              <div
                key={conversation.conversationId}
                onClick={() => handleSelectConversation(conversation)}
                className={`group relative flex items-center px-3 py-3 cursor-pointer rounded-md transition-colors ${
                  currentConversation?.conversationId === conversation.conversationId
                    ? 'bg-gray-200 dark:bg-gray-700'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex-1 truncate">
                  <div className="font-medium truncate text-gray-900 dark:text-gray-100">
                    {conversation.title || 'New conversation'}
                  </div>
                  {conversation.lastMessageDate && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(conversation.lastMessageDate)}
                    </div>
                  )}
                </div>
                
                {/* Inline Delete Button - Always visible on hover */}
                <button
                  onClick={(e) => handleDeleteConversation(e, conversation.conversationId)}
                  className={`ml-2 p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all ${
                    currentConversation?.conversationId === conversation.conversationId
                      ? 'opacity-70'
                      : 'opacity-0 group-hover:opacity-70'
                  }`}
                  aria-label="Delete conversation"
                >
                  <HiOutlineTrash size={16} />
                </button>
              </div>
            ))
        )}
      </div>

      {/* User Profile Section */}
      <div className="mt-auto p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div 
            ref={profileButtonRef}
            className="flex items-center p-3 rounded-md bg-gray-200 dark:bg-gray-800 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors flex-grow mr-2"
            onClick={toggleProfileMenu}
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
            onClick={() => {
              console.log('Dark mode toggle clicked, current state:', darkMode);
              useStore.getState().toggleDarkMode();
            }}
            className="p-3 rounded-md bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors relative group"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-gray-900 dark:text-gray-100" />
            ) : (
              <Moon className="h-5 w-5 text-gray-900 dark:text-gray-100" />
            )}
            <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {darkMode ? 'Light mode' : 'Dark mode'}
            </span>
          </button>
        </div>

        {showProfileMenu && (
          <ProfileMenu 
            user={user} 
            onLogout={handleLogout}
            menuRef={profileMenuRef}
          />
        )}
      </div>
    </div>
  );
}; 