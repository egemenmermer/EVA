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

// Type for manager types
const managerTypes: { type: ManagerType; icon: React.ReactNode; label: string }[] = [
  { type: 'PUPPETEER', icon: null, label: 'Web Search' },
  { type: 'FUNCTION', icon: null, label: 'Function Calling' },
  { type: 'NO_TOOLS', icon: null, label: 'No Tools' },
];

export const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [directFetchedConversations, setDirectFetchedConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { 
    user, 
    darkMode, 
    setCurrentConversation, 
    currentConversation,
    managerType, 
    setManagerType, 
    toggleDarkMode 
  } = useStore();
  
  const { logout } = useAuth();

  // Fetch conversations directly from API
  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await conversationApi.getConversations();
      console.log('Fetched conversations:', response);
      setDirectFetchedConversations(response || []);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
      // Use mock data for development if API fails
      setDirectFetchedConversations([
        { conversationId: 'mock-1', lastMessageDate: new Date().toISOString(), lastMessage: 'Hello, how can I help you?', title: 'New conversation' },
        { conversationId: 'mock-2', lastMessageDate: new Date().toISOString(), lastMessage: 'Can you tell me about ethical AI?', title: 'About AI Ethics' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch conversations on mount and periodically
  useEffect(() => {
    fetchConversations();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchConversations();
    }, 30000);
    
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

  const handleNewChat = async () => {
    console.log('Creating new chat with manager type:', managerType);
    try {
      const newConversation = await conversationApi.createConversation(managerType);
      if (newConversation && newConversation.conversationId) {
        setCurrentConversation(newConversation);
        await fetchConversations(); // Refresh the list
      }
    } catch (error) {
      console.error('Error starting new conversation:', error);
      // Create a mock conversation for development
      const mockConv = { 
        conversationId: `mock-${Date.now()}`, 
        title: 'New conversation',
        lastMessageDate: new Date().toISOString()
      };
      setCurrentConversation(mockConv);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setShowLogout(false);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!id) return;
    
    try {
      await conversationApi.deleteConversation(id);
      setDirectFetchedConversations(prev => prev.filter(c => c.conversationId !== id));
      
      if (currentConversation?.conversationId === id) {
        setCurrentConversation(null);
      }
      
      await fetchConversations(); // Refresh the list
    } catch (error) {
      console.error('Error deleting conversation', error);
    }
    
    setShowContextMenu(false);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setSelectedConversationId(id);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
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
      <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-between p-3 rounded-md bg-gray-800 hover:bg-gray-700 text-white transition-colors"
        >
          <span className="font-medium">New chat</span>
          <HiPlus size={20} />
        </button>
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

      {/* Manager Type Selector */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
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

      {/* User Profile Section */}
      <div className="mt-auto p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center p-3 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="ml-3 flex-1 overflow-hidden">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.fullName || 'User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email || 'user@example.com'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center justify-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        >
          <HiLogout size={18} />
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>

      {/* Context Menu */}
      {showContextMenu && selectedConversationId && (
        <div
          ref={contextMenuRef}
          style={{ 
            position: 'fixed', 
            top: contextMenuPosition.y, 
            left: contextMenuPosition.x,
            zIndex: 50
          }}
          className="bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 p-1"
        >
          <button
            onClick={(e) => handleDeleteConversation(e, selectedConversationId)}
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