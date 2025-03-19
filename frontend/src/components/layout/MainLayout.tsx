import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { EthicalGuidelines } from '../guidelines/EthicalGuidelines';
import { useStore } from '@/store/useStore';
import logo from '@/assets/logo.svg';
import { useNavigate } from 'react-router-dom';

export const MainLayout: React.FC = () => {
  const { darkMode, user, token, setUser } = useStore();
  const navigate = useNavigate();

  // Double-check that we have a token - if not, redirect to login
  useEffect(() => {
    const hasToken = Boolean(localStorage.getItem('token'));
    console.log('MainLayout - hasToken:', hasToken, 'store token:', Boolean(token), 'user:', Boolean(user));
    
    if (!hasToken && !token) {
      console.log('No token found, redirecting to login');
      navigate('/login');
    } else if (hasToken && !user) {
      // We have a token but no user - restore user data
      console.log('Token found but no user, restoring user data');
      setUser({
        id: 'layout-recovery',
        email: 'user@example.com',
        fullName: 'User'
      });
    }
  }, [navigate, token, user, setUser]);

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
        {/* Header - Fixed height */}
        <header className="h-14 flex-none flex items-center px-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-8 w-8" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">EthicAI</h1>
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