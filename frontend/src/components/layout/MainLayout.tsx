import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { EthicalGuidelines } from '../guidelines/EthicalGuidelines';
import { useStore } from '@/store/useStore';
import logo from '@/assets/logo.svg';
import { useNavigate } from 'react-router-dom';

export const MainLayout: React.FC = () => {
  const { darkMode, user, token } = useStore();
  const navigate = useNavigate();

  // Double-check that we have a token - if not, redirect to login
  useEffect(() => {
    const hasToken = Boolean(localStorage.getItem('token'));
    if (!hasToken && !token) {
      navigate('/login');
    }
  }, [navigate, token]);

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
          <div className="w-[260px] flex-none flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            <div className="flex-1 overflow-y-auto">
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