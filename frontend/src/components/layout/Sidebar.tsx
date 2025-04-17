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
import { conversationApi, agentCreateConversation } from '@/services/api';
import type { ManagerType, Conversation, User } from '@/types';
import type { ConversationContentResponseDTO } from '@/types/api';
import { Mail, Github, ExternalLink, FileText, LogOut, Sun, Moon, Bot, BookOpen } from 'lucide-react';
import { TemperatureControl } from '@/components/controls/TemperatureControl';
import { v4 as uuidv4 } from 'uuid';
import '../chat/scrollbar.css'; // Import the scrollbar CSS

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
  const { 
    user, 
    managerType, 
    setManagerType, 
    temperature, 
    setTemperature, 
    darkMode, 
    toggleDarkMode, 
    currentConversation,
    setCurrentConversation, 
    setMessages, 
    addMessage, 
    setUser 
  } = useStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLDivElement>(null);
  
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
      
      // Store fetched conversations after sanitizing and mapping
      if (response && Array.isArray(response)) {
        const mappedConversations = response.map(conv => ({
          ...conv,
          isDraft: false, // All server conversations are not drafts
          isPersisted: true // Explicitly mark fetched conversations as persisted
        }));
        
        const sanitized = sanitizeConversations(mappedConversations);
        setDirectFetchedConversations(prev => {
          // Keep existing conversations while loading
          if (isLoading && prev.length > 0) {
            return prev;
          }
          return sanitized;
        });
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
    const handleRefreshEvent = (event: Event) => {
      console.log('Sidebar: Received refresh-conversations event');
      
      // Get details from the event
      const customEvent = event as CustomEvent;
      const details = customEvent.detail;
      
      console.log('Refresh event details:', details);
      
      // Refresh the conversation list
      fetchConversations().then(() => {
        // If we have a conversation ID in the event, make sure it's selected
        if (details?.conversationId && (!currentConversation || 
            currentConversation.conversationId !== details.conversationId)) {
          console.log('Setting current conversation from refresh event:', details.conversationId);
          
          // Create a minimal conversation object to update the current selection
          const newConversation: Conversation = {
            conversationId: details.conversationId,
            title: details.title || 'New Conversation',
            managerType: details.managerType || managerType,
            createdAt: new Date().toISOString()
          };
          
          // Update the current conversation selection
          setCurrentConversation(newConversation);
          localStorage.setItem('current-conversation-id', details.conversationId);
        }
      });
    };
    
    window.addEventListener('refresh-conversations', handleRefreshEvent);
    
    return () => {
      window.removeEventListener('refresh-conversations', handleRefreshEvent);
    };
  }, [currentConversation, managerType]);
  
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
    // No need for loading state here, as it's purely local initially
    setError(null);
    try {
      console.log('Creating new DRAFT conversation locally...');
      
      // 1. Generate a local draft ID
      const draftId = `draft-${uuidv4()}`;
      const currentUserId = user?.id; // Get user ID from store state

      // 2. Create a local Conversation object for the draft state
      const draftConversation: Conversation = {
        conversationId: draftId,
        title: 'New Chat', // Default title for draft
        managerType: managerType, // Use the currently selected manager type
        createdAt: new Date().toISOString(),
        isDraft: true,
        isPersisted: false, // Mark as not saved to backend
        userId: currentUserId, // Use the fetched user ID
        lastMessage: undefined,
        lastMessageDate: undefined,
      };
      
      console.log('Setting draft conversation in store:', draftConversation);
      
      // 3. Clear messages from Zustand store and dispatch event
      setMessages([]); // Clear message display
      const clearEvent = new CustomEvent('clear-messages', { 
        detail: { conversationId: draftId } // Pass draft ID for potential context
      });
      window.dispatchEvent(clearEvent);
      
      // 4. Set the new draft conversation in the store
      setCurrentConversation(draftConversation);
      
      // 5. Close mobile sidebar if open
      setMobileOpen(false);
      
      // 6. Remove API call - Do NOT create on backend immediately
      // No need to refresh conversation list from backend yet
      
    } catch (err: any) {
      // Catch errors related to local state updates (less likely)
      console.error('Error creating local draft conversation:', err);
      setError('Failed to start new chat. Please try again.');
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
    
    // Trigger a custom event to refresh the conversation messages
    const refreshEvent = new CustomEvent('force-load-messages', { 
      detail: { conversationId: mappedConversation.conversationId } 
    });
    window.dispatchEvent(refreshEvent);
    
    setMobileOpen(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, conversationToDelete: Conversation) => {
    // --- ADDED LOG 1: Check parameters immediately --- 
    console.log("[handleDeleteConversation ENTRY] Event:", e);
    console.log("[handleDeleteConversation ENTRY] conversationToDelete object:", JSON.stringify(conversationToDelete)); // Stringify to see full structure

    // --- ADD LOG 2: Check conversationId existence --- 
    if (!conversationToDelete || !conversationToDelete.conversationId) {
      console.error("[handleDeleteConversation ERROR] conversationToDelete or its ID is missing!", conversationToDelete);
      return; // Stop execution if critical data is missing
    }
    console.log('[handleDeleteConversation CHECK] conversationId exists:', conversationToDelete.conversationId);

    // --- ADD LOG 3 --- 
    console.log('[handleDeleteConversation] Clicked!', { conversationId: conversationToDelete?.conversationId });
    
    e.stopPropagation();
    e.preventDefault(); 
    
    const id = conversationToDelete.conversationId; 
    
    // --- ADD LOG 4 --- 
    console.log('[handleDeleteConversation] Conversation ID variable set:', id);
    
    // Ensure isPersisted check defaults correctly if undefined
    // --- ADD LOG 5 --- 
    const isPersisted = conversationToDelete.isPersisted === true;
    console.log('[handleDeleteConversation] Is Persisted?:', isPersisted, '(from conversationToDelete.isPersisted:', conversationToDelete.isPersisted, ')');

    // Store the list before optimistic update, in case we need to revert
    const previousConversations = [...directFetchedConversations];

    // Optimistically update UI first
    setDirectFetchedConversations(prev => 
      prev.filter(conv => conv.conversationId !== id)
    );
    
    // Clear state if deleting current conversation
    if (currentConversation?.conversationId === id) {
      setCurrentConversation(null);
      setMessages([]); // Make sure messages are cleared from store
      localStorage.removeItem('current-conversation-id');
    }
    
    // Clear related localStorage data
    const keysToRemove = [
      `messages_${id}`, `messages-${id}`,
      `backup_messages_${id}`, `backup-messages-${id}`,
      `exact_messages_${id}`, `artifacts-${id}`
    ];
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    console.log(`Optimistic UI update and localStorage clear done for ${id}`);

    // Dispatch delete event immediately so other components (like ChatWindow) can react
    const deleteEvent = new CustomEvent('conversation-deleted', { 
      detail: { conversationId: id } 
    });
    window.dispatchEvent(deleteEvent);

    // Perform backend delete ONLY if persisted
    // --- ADD LOG 6 --- 
    console.log('[handleDeleteConversation] Checking if persisted before API call...');
    if (isPersisted) {
      // --- ADD LOG 7 --- 
      console.log('[handleDeleteConversation] IS persisted. Attempting API call...');
      try {
        await conversationApi.deleteConversation(id); // Attempt backend delete
        // --- ADD LOG 8 --- 
        console.log('[handleDeleteConversation] API call successful for:', id);
      } catch (err: any) {
        // --- ADD LOG 9 --- 
        console.error('[handleDeleteConversation] API call FAILED:', err);
        setError(`Failed to delete: ${err.message || 'Server error'}. Reverting.`);
        // If backend delete failed, revert optimistic UI update
        console.log('Backend delete failed, reverting optimistic UI update.');
        setDirectFetchedConversations(previousConversations);
      }
    } else {
      // --- ADD LOG 10 --- 
      console.log('[handleDeleteConversation] NOT persisted. Skipping API call.');
    }
    // --- ADD LOG 11 --- 
    console.log('[handleDeleteConversation] Finished.');
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

  // Render conversations with loading state
  const renderConversations = () => {
    if (error) {
      return (
        <div className="text-center py-4 text-red-600 dark:text-red-400 text-sm">
          {error}. <button onClick={fetchConversations} className="underline">Retry</button>
        </div>
      );
    }

    if (!isLoading && directFetchedConversations.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          No conversations yet. Start a new chat!
        </div>
      );
    }

    // Always show conversations, even while loading
    return directFetchedConversations
      .filter(conversation => !conversation.isDraft)
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
          
          {/* --- MODIFIED Delete Button --- */}
          <button
            onClick={(e) => handleDeleteConversation(e, conversation)}
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
      ));
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
      <div 
        className="flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar"
      >
        {renderConversations()}
        {isLoading && (
          <div className="flex items-center justify-center h-6 mt-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100"></div>
          </div>
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