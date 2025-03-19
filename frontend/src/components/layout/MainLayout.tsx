import React from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { EthicalGuidelines } from '../guidelines/EthicalGuidelines';
import { useStore } from '@/store/useStore';
import { Sun, Moon, LogOut } from 'lucide-react';
import logo from '@/assets/logo.svg';

export const MainLayout: React.FC = () => {
  const { user, darkMode, toggleDarkMode } = useStore();

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      <div className="h-screen flex bg-white dark:bg-gray-900">
        {/* Left Sidebar - Fixed width */}
        <div className="w-[260px] flex-none flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex-1 overflow-y-auto">
            <Sidebar />
          </div>
          {/* User info footer */}
          <div className="flex-none border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {user?.fullName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleDarkMode}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                  }}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
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
  );
}; 