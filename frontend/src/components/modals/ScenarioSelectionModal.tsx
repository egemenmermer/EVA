import React from 'react';
import { useStore } from '@/store/useStore';
import { X } from 'lucide-react';

interface ScenarioSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: 'privacy' | 'accessibility') => void;
}

export const ScenarioSelectionModal: React.FC<ScenarioSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectScenario
}) => {
  const { darkMode } = useStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      
      {/* Modal content */}
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Choose a Scenario
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Scenario options */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Privacy Scenario */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 hover:shadow-md transition-all">
            <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-2">
              Privacy & Data Collection
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
              Your manager is pressuring you to collect unnecessary user location data for analytics purposes. You're concerned about user privacy, consent, and potential legal compliance issues. Navigate this situation while advocating for ethical data practices.
            </p>
            <button
              onClick={() => onSelectScenario('privacy')}
              className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Select Privacy Scenario
            </button>
          </div>
          
          {/* Accessibility Scenario */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 hover:shadow-md transition-all">
            <h3 className="text-lg font-medium text-purple-700 dark:text-purple-300 mb-2">
              Screen Reader Compatibility
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
              Your team is facing pressure to skip screen reader compatibility testing to meet a tight deadline. The new interface design looks modern but no longer works properly with assistive technologies. Practice advocating for inclusive design and accessibility standards.
            </p>
            <button
              onClick={() => onSelectScenario('accessibility')}
              className="mt-2 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              Select Accessibility Scenario
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 text-sm">
          Your selection will determine the scenario experience throughout your conversation
        </div>
      </div>
    </div>
  );
}; 