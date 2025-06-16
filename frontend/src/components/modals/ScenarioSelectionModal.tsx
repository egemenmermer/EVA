import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { X, RefreshCw } from 'lucide-react';
import { conversationApi } from '@/services/api';
import { clearAllScenarioData, logScenarioStatus } from '@/utils/scenarioTracker';

interface ScenarioSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: 'privacy' | 'accessibility') => void;
}

interface ScenarioStatus {
  privacyCompleted: boolean;
  accessibilityCompleted: boolean;
}

export const ScenarioSelectionModal: React.FC<ScenarioSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectScenario
}) => {
  const { darkMode, user, setUser, token, currentConversation } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check scenario completion status
  const getScenarioStatus = (): ScenarioStatus => {
    const dbPrivacyCompleted = user?.privacyScenariosCompleted || false;
    const dbAccessibilityCompleted = user?.accessibilityScenariosCompleted || false;
    
    console.log('🔍 MODAL: Database completion status - Privacy:', dbPrivacyCompleted, 'Accessibility:', dbAccessibilityCompleted);
    
    return {
      privacyCompleted: dbPrivacyCompleted,
      accessibilityCompleted: dbAccessibilityCompleted
    };
  };

  const scenarioStatus = getScenarioStatus();
  
  // Show refresh button if at least one scenario is completed
  const shouldShowRefreshButton = scenarioStatus.privacyCompleted || scenarioStatus.accessibilityCompleted;
  
  console.log('🔍 MODAL: Should show refresh button:', shouldShowRefreshButton);

  // Handle refresh scenarios
  const handleRefreshScenarios = async () => {
    setIsRefreshing(true);
    
    // Log status before clearing
    console.log('=== BEFORE REFRESH ===');
    logScenarioStatus();
    
    // Clear all scenario-related localStorage data first
    clearAllScenarioData();
    
    // Log status after clearing localStorage
    console.log('=== AFTER LOCALSTORAGE CLEAR ===');
    logScenarioStatus();
    
    // Clear knowledge artifacts for current conversation if it exists
    if (currentConversation?.conversationId && !currentConversation.conversationId.startsWith('draft-')) {
      try {
        const authToken = token || localStorage.getItem('token');
        if (authToken) {
          console.log('Clearing knowledge artifacts for conversation:', currentConversation.conversationId);
          const response = await fetch(`/api/v1/knowledge-artifacts/${currentConversation.conversationId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok || response.status === 404) {
            console.log('Knowledge artifacts cleared successfully for conversation:', currentConversation.conversationId);
            // Also clear the localStorage cache for artifacts
            localStorage.removeItem(`artifacts-${currentConversation.conversationId}`);
          } else {
            console.warn('Failed to clear knowledge artifacts:', response.status, response.statusText);
          }
        }
      } catch (error) {
        console.warn('Error clearing knowledge artifacts:', error);
        // Continue with the reset even if artifact clearing fails
      }
    }
    
    // Immediately update UI to show reset effect
    const resetUser = {
      ...user,
      accessibilityScenariosCompleted: false,
      privacyScenariosCompleted: false,
      accessibilityScenariosCompletedAt: null,
      privacyScenariosCompletedAt: null
    };
    setUser(resetUser);
    
    try {
      // Use token from store or localStorage as fallback
      const authToken = token || localStorage.getItem('token');
      console.log('Using token for reset:', authToken ? 'Token found' : 'No token');
      console.log('Current user before reset:', user);
      
      if (authToken) {
        // Call the reset API endpoint
        const response = await fetch('/api/v1/user/reset-scenario-completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Reset API response status:', response.status);
        
        if (response.ok) {
          const updatedUserData = await response.json();
          console.log('Reset successful, updated user data from server:', updatedUserData);
          // Update user data in store with server response
          setUser(updatedUserData);
          console.log('Scenarios reset successfully in database and localStorage');
          
          // Log final status after database reset
          console.log('=== AFTER DATABASE RESET ===');
          logScenarioStatus();
          
          // Verify the user state was updated correctly
          console.log('🔍 MODAL: User state after reset:', {
            accessibilityScenariosCompleted: updatedUserData.accessibilityScenariosCompleted,
            privacyScenariosCompleted: updatedUserData.privacyScenariosCompleted
          });
          
          // Trigger UI refresh events to update all components
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('refresh-sidebar'));
            window.dispatchEvent(new CustomEvent('scenario-reset', { 
              detail: { 
                timestamp: new Date().toISOString(),
                updatedUser: updatedUserData
              } 
            }));
          }, 100);
        } else {
          const errorText = await response.text();
          console.error('Failed to reset scenarios in database:', response.status, response.statusText, errorText);
          console.error('Error response body:', errorText);
          // Keep the UI reset even if API fails
          console.log('Keeping UI reset despite API failure');
        }
      } else {
        console.error('No authentication token available');
        // Keep the UI reset even if no token
        console.log('Keeping UI reset despite no token');
      }
    } catch (error) {
      console.error('Error calling reset API:', error);
      // Keep the UI reset even if API call fails
      console.log('Keeping UI reset despite API error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle scenario selection with conversation preservation
  const handleSelectScenario = async (scenario: 'privacy' | 'accessibility') => {
    // Store current conversation ID if it exists and is not a draft
    if (currentConversation && 
        currentConversation.conversationId && 
        !currentConversation.conversationId.startsWith('draft-')) {
      console.log('🔒 Preserving conversation ID:', currentConversation.conversationId);
      localStorage.setItem('originalConversationId', currentConversation.conversationId);
      
      // Don't delete the conversation - we'll continue using it
      // This prevents errors with artifacts trying to be saved to a deleted conversation
    }
    
    // Store the selected scenario in localStorage
    localStorage.setItem('last_selected_scenario', scenario);
    console.log('📝 Stored selected scenario in localStorage:', scenario);
    
    // Call the provided callback with the selected scenario
    onSelectScenario(scenario);
    onClose();
  };

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
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 h-auto">
          {/* Privacy Scenario */}
          <div className={`${
            scenarioStatus.privacyCompleted 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:shadow-md cursor-pointer'
          } rounded-lg p-6 transition-all relative flex flex-col h-full`}>
            {scenarioStatus.privacyCompleted && (
              <div className="absolute top-4 right-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              </div>
            )}
            <h3 className={`text-lg font-medium mb-2 ${
              scenarioStatus.privacyCompleted 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-blue-700 dark:text-blue-300'
            }`}>
              Privacy & Data Collection
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm flex-grow">
              Your manager is pressuring you to collect unnecessary user location data for analytics purposes. You're concerned about user privacy, consent, and potential legal compliance issues. Navigate this situation while advocating for ethical data practices.
            </p>
            <button
              onClick={() => !scenarioStatus.privacyCompleted && handleSelectScenario('privacy')}
              disabled={scenarioStatus.privacyCompleted}
              className={`mt-2 w-full py-2 rounded-md transition-colors ${
                scenarioStatus.privacyCompleted
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {scenarioStatus.privacyCompleted ? 'Scenario Completed' : 'Select Privacy Scenario'}
            </button>
          </div>
          
          {/* Accessibility Scenario */}
          <div className={`${
            scenarioStatus.accessibilityCompleted 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 hover:shadow-md cursor-pointer'
          } rounded-lg p-6 transition-all relative flex flex-col h-full`}>
            {scenarioStatus.accessibilityCompleted && (
              <div className="absolute top-4 right-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
              </div>
            )}
            <h3 className={`text-lg font-medium mb-2 ${
              scenarioStatus.accessibilityCompleted 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-purple-700 dark:text-purple-300'
            }`}>
              Screen Reader Compatibility
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm flex-grow">
              Your team is facing pressure to skip screen reader compatibility testing to meet a tight deadline. The new interface design looks modern but no longer works properly with assistive technologies. Practice advocating for inclusive design and accessibility standards.
            </p>
            <button
              onClick={() => !scenarioStatus.accessibilityCompleted && handleSelectScenario('accessibility')}
              disabled={scenarioStatus.accessibilityCompleted}
              className={`mt-2 w-full py-2 rounded-md transition-colors ${
                scenarioStatus.accessibilityCompleted
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {scenarioStatus.accessibilityCompleted ? 'Scenario Completed' : 'Select Accessibility Scenario'}
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm mb-3">
            Your selection will determine the scenario experience throughout your conversation
          </div>
          
          {/* Refresh Button - Show if at least one scenario is completed */}
          {shouldShowRefreshButton && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-center text-gray-600 dark:text-gray-400 text-xs">
                {scenarioStatus.privacyCompleted && scenarioStatus.accessibilityCompleted 
                  ? 'Both scenarios completed - you can reset to practice again'
                  : 'Reset completed scenarios to practice again'
                }
              </div>
              <button
                onClick={handleRefreshScenarios}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-md transition-colors text-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Resetting...' : 'Reset Scenarios'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 