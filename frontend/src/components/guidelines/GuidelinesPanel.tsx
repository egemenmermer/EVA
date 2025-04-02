import React, { useState } from 'react';
import KnowledgePanel from '../KnowledgePanel';
import { useStore } from '@/store/useStore';

export const GuidelinesPanel: React.FC = () => {
  const { currentConversation } = useStore();
  const [isOpen, setIsOpen] = useState(true);
  
  // Only render if we have a conversation
  if (!currentConversation?.conversationId) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-gray-400 dark:text-gray-500">
        <p>Start a conversation to see relevant ethical information</p>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <KnowledgePanel 
          conversationId={currentConversation.conversationId} 
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      </div>
    </div>
  );
}; 