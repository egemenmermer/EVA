import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';

export const ResetButton: React.FC = () => {
  const navigate = useNavigate();
  
  const goToDebug = () => {
    navigate('/debug');
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={goToDebug}
        className="bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-full p-3 shadow-lg"
        title="Debug Tools"
      >
        <Wrench size={20} />
      </button>
    </div>
  );
}; 