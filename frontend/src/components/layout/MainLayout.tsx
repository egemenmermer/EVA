import React from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { EthicalGuidelines } from '../guidelines/EthicalGuidelines';
import logo from '@/assets/logo.svg';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header - Fixed height */}
      <header className="flex-none h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center h-full px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <img src={logo} alt="EVA Logo" className="h-14 w-14 object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                EVA
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  Ethical Virtual Assistant
                </span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Fill remaining height */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Fixed width */}
        <div className="w-64 flex-none">
          <Sidebar />
        </div>
        
        {/* Main Chat Window - Flexible width */}
        <main className="flex-1 min-w-0">
          <ChatWindow />
        </main>
        
        {/* Right Panel - Fixed width */}
        <div className="w-80 flex-none hidden lg:block border-l border-gray-200 dark:border-gray-700">
          <div className="h-full overflow-y-auto p-4">
            <EthicalGuidelines />
          </div>
        </div>
      </div>
    </div>
  );
}; 