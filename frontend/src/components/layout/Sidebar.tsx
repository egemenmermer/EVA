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

import { v4 as uuidv4 } from 'uuid';
import '../chat/scrollbar.css'; // Import the scrollbar CSS

// Type for the Sidebar component props
interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
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
  const navigate = useNavigate();
  
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
        
        {/* Admin Analytics Link - Only shown to admin users */}
        {user?.role === 'ADMIN' && (
          <button 
            onClick={() => navigate('/admin/analytics')}
            className="flex w-full items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FileText className="mr-2 h-4 w-4" />
            Admin Analytics
          </button>
        )}
        
        {/* Retake Manager Type Quiz Option */}
        <button 
          onClick={() => {
            // Emit event to trigger quiz modal instead of navigating
            window.dispatchEvent(new CustomEvent('show-manager-quiz', { detail: { isRetake: true } }));
            // Close the menu by simulating a click outside
            document.dispatchEvent(new MouseEvent('mousedown'));
          }}
          className="flex w-full items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Bot className="mr-2 h-4 w-4" />
          Retake Manager Type Quiz
        </button>
        
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

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { 
    user, 
    darkMode, 
    toggleDarkMode, 
    managerType, 
    currentConversation,
    setCurrentConversation, 
    clearMessages 
  } = useStore();

  // Add CSS for flashy tactics button animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes eva-tactics-glow {
        0%, 100% {
          box-shadow: 
            0 0 var(--glow-size) var(--flash-color),
            0 0 calc(var(--glow-size) * 2) var(--flash-color),
            0 0 calc(var(--glow-size) * 3) var(--flash-color);
          filter: brightness(1);
        }
        50% {
          box-shadow: 
            0 0 calc(var(--glow-size) * 1.5) var(--flash-color),
            0 0 calc(var(--glow-size) * 3) var(--flash-color),
            0 0 calc(var(--glow-size) * 4.5) var(--flash-color);
          filter: brightness(1.2);
        }
      }
      
             .eva-tactics-flash {
         animation: eva-tactics-glow 2s ease-in-out infinite;
         border: 2px solid var(--flash-color);
         position: relative;
       }
      
      .eva-tactics-flash::before {
        content: '';
        position: absolute;
        inset: -3px;
        background: linear-gradient(45deg, 
          transparent, 
          var(--flash-color), 
          transparent, 
          var(--flash-color), 
          transparent);
        border-radius: inherit;
        z-index: -1;
        opacity: 0.7;
        animation: eva-tactics-glow 2s ease-in-out infinite;
      }
      
             .eva-tactics-flash::after {
         content: '✨';
         position: absolute;
         top: -8px;
         right: -8px;
         font-size: 16px;
         z-index: 20;
       }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  const [directFetchedConversations, setDirectFetchedConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLDivElement>(null);
  
  // Check if tactics modal has been viewed
  const [hasViewedTactics, setHasViewedTactics] = useState(() => {
    return localStorage.getItem('eva-tactics-viewed') === 'true';
  });

  // Check if post survey has been clicked or completed
  const [hasClickedPostSurvey, setHasClickedPostSurvey] = useState(() => {
    return localStorage.getItem('eva-post-survey-clicked') === 'true';
  });
  
  const [postSurveySubmitted, setPostSurveySubmitted] = useState(() => {
    return localStorage.getItem('eva-post-survey-submitted') === 'true';
  });

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
    
    // Reduce refresh frequency for better responsiveness - every 30 seconds instead of 60
    const interval = setInterval(() => {
      fetchConversations();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Add event listener for refresh-conversations events to update sidebar immediately
  useEffect(() => {
    const handleRefreshConversations = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Sidebar received refresh-conversations event:', customEvent.detail);
      
      // Trigger immediate refresh when we get this event
      fetchConversations();
    };

    // Listen for scenario completion events to trigger UI refresh
    const handleScenarioCompleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Scenario completed, refreshing sidebar...', customEvent.detail);
      // Force a re-render by updating a state (can use a timestamp)
      setDirectFetchedConversations(prev => [...prev]);
    };

    // Listen for refresh sidebar events triggered from scenario completion
    const handleRefreshSidebar = () => {
      console.log('Refresh sidebar event received, forcing re-render...');
      // Force re-render to update post survey button visibility
      setDirectFetchedConversations(prev => [...prev]);
    };
    
    // Listen for post survey submission events
    const handlePostSurveySubmitted = () => {
      console.log('Post survey submitted event received, updating state...');
      setPostSurveySubmitted(true);
      localStorage.setItem('eva-post-survey-submitted', 'true');
    };
    
    window.addEventListener('refresh-conversations', handleRefreshConversations);
    window.addEventListener('scenario-completed', handleScenarioCompleted);
    window.addEventListener('refresh-sidebar', handleRefreshSidebar);
    window.addEventListener('post-survey-submitted', handlePostSurveySubmitted);
    
    return () => {
      window.removeEventListener('refresh-conversations', handleRefreshConversations);
      window.removeEventListener('scenario-completed', handleScenarioCompleted);
      window.removeEventListener('refresh-sidebar', handleRefreshSidebar);
      window.removeEventListener('post-survey-submitted', handlePostSurveySubmitted);
    };
  }, []);

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
    // Create draft conversation with user's determined manager type
    setError(null);
    try {
      console.log('Creating new DRAFT conversation locally...');
      
      const currentUserId = user?.id;
      if (!currentUserId) {
        console.error('No user ID found. Cannot create conversation.');
        setError('User not found. Please log in again.');
        return;
      }

      const draftId = `draft-${uuidv4()}`;
      
      // Use the user's determined manager type, or default to PUPPETEER
      const selectedManagerType = user?.managerTypePreference || 'PUPPETEER';
      
      // Store in localStorage for practice module
      localStorage.setItem('practice_manager_type', selectedManagerType);
      
      // Create a local Conversation object for the draft state
      const draftConversation: Conversation = {
        conversationId: draftId,
        title: 'New Chat', // Default title for draft
        managerType: selectedManagerType as ManagerType,
        createdAt: new Date().toISOString(),
        isDraft: true,
        isPersisted: false, // Mark as not saved to backend
        userId: currentUserId,
        lastMessage: undefined,
        lastMessageDate: undefined,
      };
      
      console.log('Setting draft conversation in store:', draftConversation);
      
      // Clear messages from Zustand store and dispatch event
      clearMessages();
      const clearEvent = new CustomEvent('clear-messages', { 
        detail: { conversationId: draftId } // Pass draft ID for potential context
      });
      window.dispatchEvent(clearEvent);
      
      // Set the new draft conversation in the store
      setCurrentConversation(draftConversation);
      
      // Close mobile sidebar if open
      if (onClose) onClose();
    } catch (error) {
      console.error('Error creating new draft conversation:', error);
      setError('Failed to create a new conversation. Please try again.');
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
    
    if (onClose) onClose();
  };

  const handleDeleteConversation = async (e: React.MouseEvent, conversationToDelete: Conversation) => {
    console.log("[handleDeleteConversation ENTRY] conversationToDelete object:", JSON.stringify(conversationToDelete));

    if (!conversationToDelete || !conversationToDelete.conversationId) {
      console.error("[handleDeleteConversation ERROR] conversationToDelete or its ID is missing!", conversationToDelete);
      return;
    }
    
    e.stopPropagation();
    e.preventDefault(); 
    
    const id = conversationToDelete.conversationId; 
    console.log('[handleDeleteConversation] Conversation ID variable set:', id);
    
    const isPersisted = conversationToDelete.isPersisted === true;
    console.log('[handleDeleteConversation] Is Persisted?:', isPersisted);

    // Store the list before optimistic update, in case we need to revert
    const previousConversations = [...directFetchedConversations];

    // Optimistically update UI first
    setDirectFetchedConversations(prev => 
      prev.filter(conv => conv.conversationId !== id)
    );
    
    // Clear state if deleting current conversation
    if (currentConversation?.conversationId === id) {
      setCurrentConversation(null);
      clearMessages();
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
    if (isPersisted) {
      try {
        await conversationApi.deleteConversation(id);
        console.log('[handleDeleteConversation] API call successful for:', id);
      } catch (err: any) {
        console.error('[handleDeleteConversation] API call FAILED:', err);
        setError(`Failed to delete: ${err.message || 'Server error'}. Reverting.`);
        // If backend delete failed, revert optimistic UI update
        console.log('Backend delete failed, reverting optimistic UI update.');
        setDirectFetchedConversations(previousConversations);
      }
    } else {
      console.log('[handleDeleteConversation] NOT persisted. Skipping API call.');
    }
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

  // Check if current conversation has practice module history
  const currentConversationHasPractice = () => {
    if (!currentConversation?.conversationId) return false;
    
    try {
      // Check if there are any messages mentioning practice completion
      const conversationKey = `messages_${currentConversation.conversationId}`;
      const messagesStr = localStorage.getItem(conversationKey);
      if (!messagesStr) return false;
      
      const messages = JSON.parse(messagesStr);
      return messages.some((msg: any) => 
        msg.content && 
        (msg.content.includes('Practice Session Complete!') || 
         msg.content.includes('🎉 Practice Session Complete!') ||
         msg.content.includes('practice module') ||
         msg.content.includes('Practice Summary') ||
         msg.content.includes('Scenario Outcome') ||
         msg.content.includes('practice scenario') ||
         msg.content.includes('Practice Scenario Completed') ||
         msg.content.includes('Final Score:') ||
         msg.content.includes('Performance Level:') ||
         msg.content.includes('ending_') ||
         msg.content.includes('Excellent Ethical Advocate') ||
         msg.content.includes('Good Ethical Awareness') ||
         msg.content.includes('Get Feedback from EVA'))
      );
    } catch (e) {
      console.error('Error checking practice history:', e);
      return false;
    }
  };

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
      <div className="flex flex-col p-3 gap-2">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
        >
          <HiPlus size={18} />
          <span>New Chat</span>
        </button>
        
        {/* Tactics Button - Show permanently once user has completed any practice scenario */}
        {(user?.hasCompletedPractice || currentConversationHasPractice()) && (
          <button
            onClick={() => {
              // Mark tactics as viewed
              if (!hasViewedTactics) {
                setHasViewedTactics(true);
                localStorage.setItem('eva-tactics-viewed', 'true');
              }
              // Dispatch event to show tactics modal in main layout
              window.dispatchEvent(new CustomEvent('show-tactics-modal'));
            }}
            className={`group relative px-3 py-2 text-sm rounded-lg overflow-hidden
                      bg-gradient-to-r from-green-500 to-emerald-600
                      hover:from-green-600 hover:to-emerald-700
                      text-white shadow-md hover:shadow-lg
                      transform hover:scale-[1.02] active:scale-[0.98]
                      transition-all duration-500 ease-out
                      before:absolute before:inset-0 before:bg-gradient-to-r 
                      before:from-green-400 before:via-emerald-500 before:to-green-600
                      before:opacity-0 before:transition-opacity before:duration-700
                      hover:before:opacity-100 w-full flex items-center gap-2
                      ${!hasViewedTactics ? 'eva-tactics-flash' : ''}`}
            style={{
              '--flash-color': 'rgba(34, 197, 94, 0.8)',
              '--glow-size': '8px'
            } as React.CSSProperties}
          >
            <span className="relative z-10 flex items-center space-x-1.5">
              <span className="text-sm">💡</span>
              <span>Tactics Guide</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                           translate-x-[-100%] group-hover:translate-x-[100%] 
                           transition-transform duration-1500 ease-in-out"></div>
          </button>
        )}
        
        {/* Post-Survey Button - Only show after completing both accessibility and privacy scenarios and if user hasn't completed post-survey */}
        {/* Check database fields for scenario completion */}
        {(
          user?.accessibilityScenariosCompleted &&
          user?.privacyScenariosCompleted &&
          !user?.postSurveyCompleted &&
          !postSurveySubmitted
        ) && (
          <button
            onClick={() => {
              // Mark that the user has clicked the button to hide the prompt next time
              if (!hasClickedPostSurvey) {
                setHasClickedPostSurvey(true);
                localStorage.setItem('eva-post-survey-clicked', 'true');
              }
              // Dispatch event to show post-survey modal
              window.dispatchEvent(new CustomEvent('show-post-survey-modal'));
            }}
            className="group relative px-3 py-2 text-sm rounded-lg overflow-hidden
                      bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500
                      hover:from-purple-600 hover:via-blue-600 hover:to-cyan-600
                      text-white shadow-md hover:shadow-lg
                      transform hover:scale-[1.02] active:scale-[0.98]
                      transition-all duration-500 ease-out
                      before:absolute before:inset-0 before:bg-gradient-to-r 
                      before:from-pink-500 before:via-purple-500 before:to-blue-500
                      before:opacity-0 before:transition-opacity before:duration-700
                      hover:before:opacity-100 w-full flex items-center gap-2"
                      >
              <span className="relative z-10 flex items-center space-x-1.5">
                <span className="text-sm">📋</span>
                <span>Post Survey</span>
                {!hasClickedPostSurvey && (
                  <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-bold animate-pulse ml-2">
                    Click at the end!
                  </span>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                             translate-x-[-100%] group-hover:translate-x-[100%] 
                             transition-transform duration-1500 ease-in-out"></div>
            </button>
        )}
      </div>

      {/* Conversations List */}
      <div 
        className="flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar"
      >
        {/* Chats Header */}
        <div className="px-3 py-2">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Chats
          </h3>
        </div>
        
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
              toggleDarkMode();
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