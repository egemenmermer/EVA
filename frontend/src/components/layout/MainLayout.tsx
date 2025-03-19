import React from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { EthicalGuidelines } from '../guidelines/EthicalGuidelines';
import logo from '@/assets/logo.svg';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center h-16 px-64">
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

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />
        
        {/* Main Chat Window */}
        <main className="flex-1 flex flex-col">
          <ChatWindow />
        </main>
        
        {/* Right Panel */}
        <aside className="w-80 border-l border-gray-200 dark:border-gray-700 p-4 hidden lg:block">
          <EthicalGuidelines />
        </aside>
      </div>
    </div>
  );
}; 