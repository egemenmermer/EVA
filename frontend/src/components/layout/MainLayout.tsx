import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { EthicalGuidelines } from '../guidelines/EthicalGuidelines';
import { useStore } from '@/store/useStore';
import logo from '@/assets/logo.svg';
import { useNavigate } from 'react-router-dom';

// Format token to include Bearer prefix if needed
const formatToken = (token: string | null): string | null => {
  if (!token) return null;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

export const MainLayout: React.FC = () => {
  const { darkMode, user, token, setUser, setToken } = useStore();
  const navigate = useNavigate();

  // Check for token and user - if no token, redirect to login
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    console.log('MainLayout - token check:', storedToken ? 'EXISTS' : 'MISSING', 'user:', Boolean(user));
    
    if (!storedToken) {
      console.log('No token found, redirecting to login');
      // Clear any existing user data
      setUser(null);
      setToken(null);
      navigate('/login');
      return;
    }
    
    // If we have a token in localStorage but not in store, add it to store
    if (storedToken && !token) {
      console.log('Token found in localStorage but not in store, restoring');
      setToken(formatToken(storedToken));
    }
    
    // If we have a token but no user, create a placeholder user
    if ((storedToken || token) && !user) {
      console.log('Token exists but no user, creating placeholder user');
      setUser({
        id: 'layout-recovery',
        email: 'egemenmermer@gmail.com',
        fullName: 'Egemen Mermer'
      });
    }
  }, [navigate, token, user, setUser, setToken]);

  // Logout if we encounter an authentication error
  const handleAuthError = () => {
    console.log('Authentication error detected, clearing token and redirecting to login');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
        {/* Header - Fixed height */}
        <header className="h-14 flex-none flex items-center px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-8 w-8" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">EthicAI</h1>
          </div>
          <div className="ml-auto">
            <button 
              onClick={handleAuthError}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Logout
            </button>
          </div>
        </header>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Fixed width */}
          <div className="w-[260px] flex-none flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Force the sidebar to take up the full height */}
            <div className="flex-1 flex flex-col min-h-0">
              <Sidebar />
            </div>
          </div>
          
          {/* Main Chat Window - Flexible width */}
          <main className="flex-1 min-w-0 bg-white dark:bg-gray-900">
            <ChatWindow />
          </main>
          
          {/* Right Panel - Fixed width */}
          <div className="w-[240px] flex-none hidden lg:block border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="h-full overflow-y-auto p-4">
              <EthicalGuidelines />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 