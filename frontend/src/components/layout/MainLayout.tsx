import React from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { EthicalGuidelines } from '../guidelines/EthicalGuidelines';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
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
  );
}; 