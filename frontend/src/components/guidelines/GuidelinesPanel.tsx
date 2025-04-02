import React from 'react';
import KnowledgePanel from '../KnowledgePanel';
import { useStore } from '@/store/useStore';

export const GuidelinesPanel: React.FC = () => {
  const { currentConversation, messages } = useStore();
  
  // Determine if user has queried based on messages
  const hasUserQueried = messages && messages.length > 0 && messages.some(msg => msg.role === 'user');
  
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <KnowledgePanel 
          conversationId={currentConversation?.conversationId || ''} 
          hasUserQueried={hasUserQueried}
        />
      </div>
    </div>
  );
}; 