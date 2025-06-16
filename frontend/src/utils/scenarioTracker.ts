// Scenario completion tracking utilities
import { 
  markAccessibilityScenariosCompletedAPI, 
  markPrivacyScenariosCompletedAPI 
} from './surveyUtils';

export type ScenarioType = 'accessibility' | 'privacy';

/**
 * Check if a scenario completion message indicates accessibility scenarios are done
 * by examining the scenario title and issue type in the completion message
 */
const isAccessibilityScenarioComplete = (content: string): boolean => {
  console.log('🔍 Checking if accessibility scenario complete for content:', content.substring(0, 200));
  
  // Check for completion indicators
  const completionIndicators = [
    'Practice Session Complete!',
    'scenario complete',
    'Final Score:',
    'Performance Level:',
    'practice module completed',
    'scenario outcome'
  ];
  
  const hasCompletionIndicator = completionIndicators.some(indicator => 
    content.toLowerCase().includes(indicator.toLowerCase())
  );
  
  console.log('🔍 Has completion indicator:', hasCompletionIndicator);
  
  if (!hasCompletionIndicator) return false;
  
  // PRIORITY 1: Look for explicit scenario type in the completion message
  // Format: "- Scenario: Screen Reader Compatibility\n- Issue: Accessibility\n"
  const scenarioTypeMatch = content.match(/- Scenario: (.+)\n- Issue: (.+)\n/i);
  console.log('🔍 Scenario type match:', scenarioTypeMatch);
  
  if (scenarioTypeMatch) {
    const issueType = scenarioTypeMatch[2].trim().toLowerCase();
    console.log('🔍 Issue type found:', issueType);
    const isAccessibility = issueType === 'accessibility';
    console.log('🔍 Is accessibility scenario:', isAccessibility);
    // If we have explicit issue type, use that and ignore keywords
    return isAccessibility;
  }
  
  // PRIORITY 2: Only check keywords if no explicit issue type is found
  // AND make sure we don't have explicit privacy indicators
  const hasExplicitPrivacyIndicators = content.toLowerCase().includes('- issue: privacy') ||
                                       content.toLowerCase().includes('privacy scenarios') ||
                                       content.toLowerCase().includes('location data collection');
  
  if (hasExplicitPrivacyIndicators) {
    console.log('🔍 Found explicit privacy indicators, not accessibility');
    return false;
  }
  
  // Additional check for accessibility-specific keywords (only if no explicit type found)
  const accessibilityKeywords = [
    'screen reader',
    'accessibility',
    'assistive technology',
    'wcag',
    'ada compliance'
  ];
  
  const hasAccessibilityKeywords = accessibilityKeywords.some(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  );
  
  console.log('🔍 Has accessibility keywords:', hasAccessibilityKeywords);
  
  // Only return true if we have both completion indicator AND accessibility-specific content
  // AND no explicit privacy indicators
  const result = hasCompletionIndicator && hasAccessibilityKeywords;
  console.log('🔍 Final accessibility result:', result);
  return result;
};

/**
 * Check if a scenario completion message indicates privacy scenarios are done
 * by examining the scenario title and issue type in the completion message
 */
const isPrivacyScenarioComplete = (content: string): boolean => {
  console.log('🔍 Checking if privacy scenario complete for content:', content.substring(0, 200));
  
  // Check for completion indicators
  const completionIndicators = [
    'Practice Session Complete!',
    'scenario complete',
    'Final Score:',
    'Performance Level:',
    'practice module completed',
    'scenario outcome'
  ];
  
  const hasCompletionIndicator = completionIndicators.some(indicator => 
    content.toLowerCase().includes(indicator.toLowerCase())
  );
  
  console.log('🔍 Has completion indicator:', hasCompletionIndicator);
  
  if (!hasCompletionIndicator) return false;
  
  // PRIORITY 1: Look for explicit scenario type in the completion message
  // Format: "- Scenario: Location Data Collection\n- Issue: Privacy\n"
  const scenarioTypeMatch = content.match(/- Scenario: (.+)\n- Issue: (.+)\n/i);
  console.log('🔍 Scenario type match:', scenarioTypeMatch);
  
  if (scenarioTypeMatch) {
    const issueType = scenarioTypeMatch[2].trim().toLowerCase();
    console.log('🔍 Issue type found:', issueType);
    const isPrivacy = issueType === 'privacy';
    console.log('🔍 Is privacy scenario:', isPrivacy);
    // If we have explicit issue type, use that and ignore keywords
    return isPrivacy;
  }
  
  // PRIORITY 2: Only check keywords if no explicit issue type is found
  // AND make sure we don't have explicit accessibility indicators
  const hasExplicitAccessibilityIndicators = content.toLowerCase().includes('- issue: accessibility') ||
                                             content.toLowerCase().includes('accessibility scenarios') ||
                                             content.toLowerCase().includes('screen reader');
  
  if (hasExplicitAccessibilityIndicators) {
    console.log('🔍 Found explicit accessibility indicators, not privacy');
    return false;
  }
  
  // Additional check for privacy-specific keywords (only if no explicit type found)
  const privacyKeywords = [
    'location data',
    'privacy',
    'data collection',
    'user data',
    'gdpr',
    'personal information'
  ];
  
  const hasPrivacyKeywords = privacyKeywords.some(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  );
  
  console.log('🔍 Has privacy keywords:', hasPrivacyKeywords);
  
  // Only return true if we have both completion indicator AND privacy-specific content
  // AND no explicit accessibility indicators
  const result = hasCompletionIndicator && hasPrivacyKeywords;
  console.log('🔍 Final privacy result:', result);
  return result;
};

/**
 * Check if user has already completed a specific scenario type (from localStorage cache)
 */
export const hasCompletedScenarioType = (scenarioType: ScenarioType): boolean => {
  const completionKey = `scenario_completed_${scenarioType}`;
  return localStorage.getItem(completionKey) === 'true';
};

/**
 * Mark scenario type as completed locally and in database
 */
export const markScenarioTypeCompleted = async (scenarioType: ScenarioType): Promise<void> => {
  // Mark in localStorage for immediate UI feedback
  const completionKey = `scenario_completed_${scenarioType}`;
  localStorage.setItem(completionKey, 'true');
  localStorage.setItem(`${completionKey}_timestamp`, new Date().toISOString());
  
  // Mark in database
  try {
    if (scenarioType === 'accessibility') {
      await markAccessibilityScenariosCompletedAPI();
    } else if (scenarioType === 'privacy') {
      await markPrivacyScenariosCompletedAPI();
    }
    console.log(`${scenarioType} scenarios marked as completed in database`);
  } catch (error) {
    console.error(`Failed to mark ${scenarioType} scenarios as completed:`, error);
  }
};

/**
 * Analyze a message to detect scenario completion and automatically track it
 */
export const analyzeMessageForScenarioCompletion = async (messageContent: string): Promise<void> => {
  try {
    // Log the message content for debugging
    console.log('🔍 SCENARIO ANALYSIS START');
    console.log('🔍 Analyzing message for scenario completion:', messageContent.substring(0, 300) + '...');
    
    // Get current completion status
    const currentAccessibilityStatus = hasCompletedScenarioType('accessibility');
    const currentPrivacyStatus = hasCompletedScenarioType('privacy');
    
    console.log('🔍 Current completion status - Accessibility:', currentAccessibilityStatus, 'Privacy:', currentPrivacyStatus);
    
    // Check for accessibility scenario completion
    const isAccessibilityComplete = isAccessibilityScenarioComplete(messageContent);
    console.log('🔍 Accessibility scenario complete check result:', isAccessibilityComplete);
    
    if (isAccessibilityComplete && !currentAccessibilityStatus) {
      console.log('✅ Detected NEW accessibility scenario completion, marking as completed');
      await markScenarioTypeCompleted('accessibility');
      
      // Trigger UI refresh
      window.dispatchEvent(new CustomEvent('scenario-completed', { 
        detail: { scenarioType: 'accessibility' } 
      }));
    } else if (isAccessibilityComplete && currentAccessibilityStatus) {
      console.log('⚠️ Accessibility scenario already completed, skipping duplicate marking');
    }
    
    // Check for privacy scenario completion
    const isPrivacyComplete = isPrivacyScenarioComplete(messageContent);
    console.log('🔍 Privacy scenario complete check result:', isPrivacyComplete);
    
    if (isPrivacyComplete && !currentPrivacyStatus) {
      console.log('✅ Detected NEW privacy scenario completion, marking as completed');
      await markScenarioTypeCompleted('privacy');
      
      // Trigger UI refresh
      window.dispatchEvent(new CustomEvent('scenario-completed', { 
        detail: { scenarioType: 'privacy' } 
      }));
    } else if (isPrivacyComplete && currentPrivacyStatus) {
      console.log('⚠️ Privacy scenario already completed, skipping duplicate marking');
    }
    
    // Log final status
    const finalAccessibilityStatus = hasCompletedScenarioType('accessibility');
    const finalPrivacyStatus = hasCompletedScenarioType('privacy');
    console.log('🔍 Final completion status - Accessibility:', finalAccessibilityStatus, 'Privacy:', finalPrivacyStatus);
    console.log('🔍 SCENARIO ANALYSIS END');
    
  } catch (error) {
    console.error('❌ Error analyzing message for scenario completion:', error);
  }
};

/**
 * Get all scenario completion statuses
 */
export const getAllScenarioStatuses = () => {
  return {
    accessibility: {
      completed: hasCompletedScenarioType('accessibility'),
      completedAt: localStorage.getItem('scenario_completed_accessibility_timestamp')
    },
    privacy: {
      completed: hasCompletedScenarioType('privacy'),
      completedAt: localStorage.getItem('scenario_completed_privacy_timestamp')
    }
  };
};

/**
 * Log current scenario completion status for debugging
 */
export const logScenarioStatus = (): void => {
  const statuses = getAllScenarioStatuses();
  const usedEmailScenarios = JSON.parse(localStorage.getItem('used_email_scenarios') || '[]');
  const lastSelectedScenario = localStorage.getItem('last_selected_scenario');
  
  console.log('=== SCENARIO STATUS DEBUG ===');
  console.log('Accessibility completed:', statuses.accessibility.completed);
  console.log('Privacy completed:', statuses.privacy.completed);
  console.log('Used email scenarios:', usedEmailScenarios);
  console.log('Last selected scenario:', lastSelectedScenario);
  console.log('============================');
};

/**
 * Clear all scenario completion data from localStorage
 * Used when refreshing/resetting scenarios
 */
export const clearAllScenarioData = (): void => {
  const keysBeforeClearing = Object.keys(localStorage);
  console.log('localStorage keys before clearing:', keysBeforeClearing.length);
  
  // Clear scenario completion flags
  localStorage.removeItem('scenario_completed_accessibility');
  localStorage.removeItem('scenario_completed_accessibility_timestamp');
  localStorage.removeItem('scenario_completed_privacy');
  localStorage.removeItem('scenario_completed_privacy_timestamp');
  
  // Clear email generation tracking
  localStorage.removeItem('used_email_scenarios');
  
  // Clear last selected scenario
  localStorage.removeItem('last_selected_scenario');
  
  // Clear practice-related data that might interfere with scenario tracking
  localStorage.removeItem('practice_to_chat');
  localStorage.removeItem('practice_feedback_simple');
  localStorage.removeItem('practice_feedback_prompt');
  localStorage.removeItem('last_practice_session_data');
  localStorage.removeItem('practice_detailed_data');
  localStorage.removeItem('practice_session_backup');
  localStorage.removeItem('returning_from_practice');
  localStorage.removeItem('auto_open_tactics_guide');
  
  // Clear practice manager type selection
  localStorage.removeItem('practice_manager_type');
  
  // Clear conversation-related keys that might interfere with scenario flow
  localStorage.removeItem('originalConversationId');
  localStorage.removeItem('force_conversation_id');
  
  // Clear dynamic practice message keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('practice_messages_') ||
      key.startsWith('practice_feedback_messages_') ||
      key.startsWith('practice_user_query') ||
      key.startsWith('practice_agent_response') ||
      key.startsWith('practice_original_problem')
    )) {
      keysToRemove.push(key);
    }
  }
  
  // Remove the identified keys
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  const keysAfterClearing = Object.keys(localStorage);
  const removedCount = keysBeforeClearing.length - keysAfterClearing.length;
  
  console.log('All scenario-related localStorage data cleared');
  console.log(`Removed ${removedCount} keys total (${keysToRemove.length} dynamic keys)`);
  console.log('Remaining localStorage keys:', keysAfterClearing.length);
};

/**
 * Manual reset function for debugging - can be called from browser console
 * Usage: window.manualResetScenarios()
 */
export const manualResetScenarios = async (): Promise<void> => {
  console.log('🔧 MANUAL RESET: Starting manual scenario reset...');
  
  // Clear localStorage
  clearAllScenarioData();
  
  // Reset in database
  try {
    const authToken = localStorage.getItem('token');
    if (authToken) {
      // Use the correct API path with /api prefix
      const response = await fetch('/api/v1/user/reset-scenario-completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔧 MANUAL RESET: API response status:', response.status);
      console.log('🔧 MANUAL RESET: API response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const updatedUserData = await response.json();
        console.log('🔧 MANUAL RESET: Database reset successful:', updatedUserData);
        
        // Trigger UI refresh
        window.dispatchEvent(new CustomEvent('scenario-reset', { 
          detail: { 
            timestamp: new Date().toISOString(),
            updatedUser: updatedUserData
          } 
        }));
        
        console.log('🔧 MANUAL RESET: Complete! Both localStorage and database have been reset.');
        console.log('🔧 MANUAL RESET: Updated user data:', {
          accessibilityScenariosCompleted: updatedUserData.accessibilityScenariosCompleted,
          privacyScenariosCompleted: updatedUserData.privacyScenariosCompleted
        });
      } else {
        const errorText = await response.text();
        console.error('🔧 MANUAL RESET: Database reset failed:', response.status, response.statusText);
        console.error('🔧 MANUAL RESET: Error response:', errorText);
      }
    } else {
      console.error('🔧 MANUAL RESET: No auth token found');
    }
  } catch (error) {
    console.error('🔧 MANUAL RESET: Error:', error);
  }
};

/**
 * Refresh user data from server - useful for debugging
 * Usage: window.refreshUserDataFromServer()
 */
export const refreshUserDataFromServer = async (): Promise<void> => {
  try {
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      console.error('🔧 REFRESH USER: No auth token found');
      return;
    }

    // Use the correct API path with /api prefix
    const response = await fetch('/api/v1/user/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const userData = await response.json();
      console.log('🔧 REFRESH USER: User data from server:', userData);
      console.log('🔧 REFRESH USER: Scenario completion status:', {
        accessibilityScenariosCompleted: userData.accessibilityScenariosCompleted,
        privacyScenariosCompleted: userData.privacyScenariosCompleted
      });
      
      // Trigger event to update user state in store
      window.dispatchEvent(new CustomEvent('user-data-refreshed', { 
        detail: { userData } 
      }));
    } else {
      const errorText = await response.text();
      console.error('🔧 REFRESH USER: Failed to fetch user data:', response.status, response.statusText);
      console.error('🔧 REFRESH USER: Error response:', errorText);
    }
  } catch (error) {
    console.error('🔧 REFRESH USER: Error:', error);
  }
};

/**
 * Force update user state in store - useful for debugging
 * Usage: window.forceUpdateUserState()
 */
export const forceUpdateUserState = async (): Promise<void> => {
  try {
    // Get fresh user data from server
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      console.error('🔧 FORCE UPDATE: No auth token found');
      return;
    }

    const response = await fetch('/api/v1/user/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const userData = await response.json();
      console.log('🔧 FORCE UPDATE: Fresh user data from server:', userData);
      
      // Force update the store by dispatching a custom event with the fresh data
      window.dispatchEvent(new CustomEvent('force-user-update', { 
        detail: { 
          userData,
          timestamp: new Date().toISOString()
        } 
      }));
      
      console.log('🔧 FORCE UPDATE: User state update event dispatched');
      console.log('🔧 FORCE UPDATE: Scenario completion status:', {
        accessibilityScenariosCompleted: userData.accessibilityScenariosCompleted,
        privacyScenariosCompleted: userData.privacyScenariosCompleted
      });
    } else {
      const errorText = await response.text();
      console.error('🔧 FORCE UPDATE: Failed to fetch user data:', response.status, response.statusText);
      console.error('🔧 FORCE UPDATE: Error response:', errorText);
    }
  } catch (error) {
    console.error('🔧 FORCE UPDATE: Error:', error);
  }
};

/**
 * Force reset user state in store - bypasses API issues
 * Usage: window.forceResetUserState()
 */
export const forceResetUserState = (): void => {
  console.log('🔧 FORCE RESET: Directly resetting user state in store...');
  
  // Clear localStorage first
  clearAllScenarioData();
  
  // Dispatch event to force reset user state
  window.dispatchEvent(new CustomEvent('force-user-reset', { 
    detail: { 
      timestamp: new Date().toISOString(),
      resetData: {
        accessibilityScenariosCompleted: false,
        privacyScenariosCompleted: false,
        accessibilityScenariosCompletedAt: null,
        privacyScenariosCompletedAt: null
      }
    } 
  }));
  
  console.log('🔧 FORCE RESET: User state reset event dispatched');
  console.log('🔧 FORCE RESET: Both scenarios should now show as incomplete');
};

// Make the manual reset function available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).manualResetScenarios = manualResetScenarios;
  (window as any).logScenarioStatus = logScenarioStatus;
  (window as any).clearAllScenarioData = clearAllScenarioData;
  (window as any).refreshUserDataFromServer = refreshUserDataFromServer;
  (window as any).forceUpdateUserState = forceUpdateUserState;
  (window as any).forceResetUserState = forceResetUserState;
} 