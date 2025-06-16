// Scenario completion tracking utilities
import { 
  markAccessibilityScenariosCompletedAPI, 
  markPrivacyScenariosCompletedAPI 
} from './surveyUtils';

export type ScenarioType = 'accessibility' | 'privacy';

// Add a flag to prevent multiple simultaneous scenario completion analyses
let isAnalyzingScenarioCompletion = false;

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
 * ONLY marks the specific scenario that was actually completed
 * ONLY runs during practice sessions, not during feedback sessions
 * 
 * DISABLED: This function is disabled to prevent duplicate scenario completion calls.
 * Scenario completion is now handled exclusively by ChatWindow.tsx markCurrentScenarioCompleted()
 */
export const analyzeMessageForScenarioCompletion = async (messageContent: string): Promise<void> => {
  console.log('🔍 SCENARIO ANALYSIS DISABLED - Scenario completion is handled by ChatWindow.tsx');
  console.log('🔍 This prevents duplicate API calls that were causing both scenarios to be marked as completed');
  return;
  
  // Prevent multiple simultaneous analyses
  if (isAnalyzingScenarioCompletion) {
    console.log('🔍 SCENARIO ANALYSIS ALREADY IN PROGRESS - SKIPPING');
    return;
  }
  
  isAnalyzingScenarioCompletion = true;
  
  try {
    // Log the message content for debugging
    console.log('🔍 SCENARIO ANALYSIS START');
    console.log('🔍 Analyzing message for scenario completion:', messageContent.substring(0, 500) + '...');
    
    // CRITICAL: Check if this is a feedback message from EVA
    // Feedback messages contain completion summaries but should NOT trigger new completions
    const isFeedbackMessage = messageContent.includes('**Practice Scenario Completed**') && 
                             (messageContent.includes('**Performance Summary:**') || 
                              messageContent.includes('**Tactical Analysis:**') ||
                              messageContent.includes('**Available Argumentation Tactics**') ||
                              messageContent.includes('Do you feel ready to discuss this with your manager'));
    
    if (isFeedbackMessage) {
      console.log('🔍 DETECTED FEEDBACK MESSAGE - This is EVA providing feedback, not a new completion');
      console.log('🔍 Skipping scenario completion analysis to prevent false positives');
      return;
    }
    
    // CRITICAL: Check if we're currently in a practice session
    const practiceContext = getCurrentPracticeContext();
    console.log('🔍 Current practice context:', practiceContext);
    
    // If no practice context, this might not be a practice session
    if (!practiceContext.scenarioType) {
      console.log('🔍 No practice context found - this might not be a practice session');
      console.log('🔍 Proceeding with caution...');
    }
    
    // Get current completion status
    const currentAccessibilityStatus = hasCompletedScenarioType('accessibility');
    const currentPrivacyStatus = hasCompletedScenarioType('privacy');
    
    console.log('🔍 Current completion status - Accessibility:', currentAccessibilityStatus, 'Privacy:', currentPrivacyStatus);
    
    // CRITICAL: Only proceed if we have a completion indicator
    const completionIndicators = [
      'Practice Session Complete!',
      'Practice Scenario Completed',
      'scenario complete',
      'Final Score:',
      'Performance Level:',
      'practice module completed',
      'scenario outcome'
    ];
    
    const hasCompletionIndicator = completionIndicators.some(indicator => 
      messageContent.toLowerCase().includes(indicator.toLowerCase())
    );
    
    if (!hasCompletionIndicator) {
      console.log('🔍 No completion indicator found, skipping scenario analysis');
      return;
    }
    
    console.log('🔍 Completion indicator found, proceeding with scenario type detection');
    
    // PRIORITY 1: Look for explicit scenario type in the completion message
    // Format: "- Scenario: [Name]\n- Issue: [Type]\n"
    const scenarioTypeMatch = messageContent.match(/- Scenario: (.+)\n- Issue: (.+)\n/i);
    
    if (scenarioTypeMatch) {
      const scenarioName = scenarioTypeMatch[1].trim();
      const issueType = scenarioTypeMatch[2].trim().toLowerCase();
      
      console.log('🔍 EXPLICIT SCENARIO DETECTION:');
      console.log('🔍 Scenario name:', scenarioName);
      console.log('🔍 Issue type:', issueType);
      
      // CRITICAL: Validate against practice context BEFORE marking anything
      if (practiceContext.scenarioType && practiceContext.scenarioType !== issueType) {
        console.log('❌ VALIDATION FAILED: Detected scenario type does not match practice context');
        console.log('❌ Practice context type:', practiceContext.scenarioType);
        console.log('❌ Detected type:', issueType);
        console.log('❌ This is likely a false positive - SKIPPING completion marking');
        return;
      }
      
      // Mark ONLY the specific scenario type that was completed
      if (issueType === 'privacy' && !currentPrivacyStatus) {
        console.log('✅ Detected NEW privacy scenario completion:', scenarioName);
        
        // Double-check validation
        if (validateScenarioCompletion('privacy', messageContent)) {
          console.log('✅ Privacy scenario completion VALIDATED - marking as completed');
          await markScenarioTypeCompleted('privacy');
          
          // Trigger UI refresh
          window.dispatchEvent(new CustomEvent('scenario-completed', { 
            detail: { scenarioType: 'privacy', scenarioName } 
          }));
          
          console.log('🔍 SCENARIO ANALYSIS END - Privacy scenario marked as completed');
        } else {
          console.log('❌ Privacy scenario completion validation failed - not marking as completed');
        }
        return;
        
      } else if (issueType === 'accessibility' && !currentAccessibilityStatus) {
        console.log('✅ Detected NEW accessibility scenario completion:', scenarioName);
        
        // Double-check validation
        if (validateScenarioCompletion('accessibility', messageContent)) {
          console.log('✅ Accessibility scenario completion VALIDATED - marking as completed');
          await markScenarioTypeCompleted('accessibility');
          
          // Trigger UI refresh
          window.dispatchEvent(new CustomEvent('scenario-completed', { 
            detail: { scenarioType: 'accessibility', scenarioName } 
          }));
          
          console.log('🔍 SCENARIO ANALYSIS END - Accessibility scenario marked as completed');
        } else {
          console.log('❌ Accessibility scenario completion validation failed - not marking as completed');
        }
        return;
        
      } else if (issueType === 'privacy' && currentPrivacyStatus) {
        console.log('⚠️ Privacy scenario already completed, skipping duplicate marking');
        return;
        
      } else if (issueType === 'accessibility' && currentAccessibilityStatus) {
        console.log('⚠️ Accessibility scenario already completed, skipping duplicate marking');
        return;
        
      } else {
        console.log('⚠️ Unknown issue type or invalid scenario completion:', issueType);
        return;
      }
    }
    
    // FALLBACK: If no explicit scenario type found, use keyword-based detection
    // But be VERY strict to avoid false positives
    console.log('🔍 No explicit scenario type found, checking keywords as fallback');
    
    // CRITICAL: If we have practice context, ONLY check for that specific scenario type
    if (practiceContext.scenarioType) {
      console.log('🔍 Practice context available - only checking for:', practiceContext.scenarioType);
      
      if (practiceContext.scenarioType === 'accessibility' && !currentAccessibilityStatus) {
        const isAccessibilityComplete = isAccessibilityScenarioComplete(messageContent);
        console.log('🔍 Accessibility scenario complete check result:', isAccessibilityComplete);
        
        if (isAccessibilityComplete) {
          console.log('✅ Detected NEW accessibility scenario completion (keyword-based, validated by context)');
          await markScenarioTypeCompleted('accessibility');
          
          // Trigger UI refresh
          window.dispatchEvent(new CustomEvent('scenario-completed', { 
            detail: { scenarioType: 'accessibility' } 
          }));
        }
        
      } else if (practiceContext.scenarioType === 'privacy' && !currentPrivacyStatus) {
        const isPrivacyComplete = isPrivacyScenarioComplete(messageContent);
        console.log('🔍 Privacy scenario complete check result:', isPrivacyComplete);
        
        if (isPrivacyComplete) {
          console.log('✅ Detected NEW privacy scenario completion (keyword-based, validated by context)');
          await markScenarioTypeCompleted('privacy');
          
          // Trigger UI refresh
          window.dispatchEvent(new CustomEvent('scenario-completed', { 
            detail: { scenarioType: 'privacy' } 
          }));
        }
      }
      
      // Skip the general keyword-based detection since we have context
      console.log('🔍 SCENARIO ANALYSIS END - Context-based detection completed');
      return;
    }
    
    // GENERAL FALLBACK: Only if no practice context is available
    console.log('🔍 No practice context - using general keyword detection (with conflict prevention)');
    
    // Check for accessibility scenario completion (strict)
    const isAccessibilityComplete = isAccessibilityScenarioComplete(messageContent);
    console.log('🔍 Accessibility scenario complete check result:', isAccessibilityComplete);
    
    // Check for privacy scenario completion (strict)
    const isPrivacyComplete = isPrivacyScenarioComplete(messageContent);
    console.log('🔍 Privacy scenario complete check result:', isPrivacyComplete);
    
    // CRITICAL: Prevent both scenarios from being marked as completed
    if (isAccessibilityComplete && isPrivacyComplete) {
      console.log('❌ CONFLICT: Both scenarios detected as complete - this should not happen!');
      console.log('❌ Message content causing conflict:', messageContent.substring(0, 1000));
      console.log('❌ Skipping completion marking to prevent false positives');
      return;
    }
    
    // Mark only the specific scenario that was detected
    if (isAccessibilityComplete && !currentAccessibilityStatus) {
      console.log('✅ Detected NEW accessibility scenario completion (keyword-based)');
      
      // Validate that this matches the current practice context
      if (validateScenarioCompletion('accessibility', messageContent)) {
        await markScenarioTypeCompleted('accessibility');
        
        // Trigger UI refresh
        window.dispatchEvent(new CustomEvent('scenario-completed', { 
          detail: { scenarioType: 'accessibility' } 
        }));
      } else {
        console.log('❌ Accessibility scenario completion validation failed - not marking as completed');
      }
      
    } else if (isPrivacyComplete && !currentPrivacyStatus) {
      console.log('✅ Detected NEW privacy scenario completion (keyword-based)');
      
      // Validate that this matches the current practice context
      if (validateScenarioCompletion('privacy', messageContent)) {
        await markScenarioTypeCompleted('privacy');
        
        // Trigger UI refresh
        window.dispatchEvent(new CustomEvent('scenario-completed', { 
          detail: { scenarioType: 'privacy' } 
        }));
      } else {
        console.log('❌ Privacy scenario completion validation failed - not marking as completed');
      }
      
    } else if (isAccessibilityComplete && currentAccessibilityStatus) {
      console.log('⚠️ Accessibility scenario already completed, skipping duplicate marking');
      
    } else if (isPrivacyComplete && currentPrivacyStatus) {
      console.log('⚠️ Privacy scenario already completed, skipping duplicate marking');
      
    } else {
      console.log('🔍 No specific scenario completion detected');
    }
    
    // Log final status
    const finalAccessibilityStatus = hasCompletedScenarioType('accessibility');
    const finalPrivacyStatus = hasCompletedScenarioType('privacy');
    console.log('🔍 Final completion status - Accessibility:', finalAccessibilityStatus, 'Privacy:', finalPrivacyStatus);
    console.log('🔍 SCENARIO ANALYSIS END');
    
  } catch (error) {
    console.error('❌ Error analyzing message for scenario completion:', error);
  } finally {
    // Always reset the flag
    isAnalyzingScenarioCompletion = false;
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

/**
 * Get the current practice session context to determine which scenario is being practiced
 */
export const getCurrentPracticeContext = (): { scenarioType: ScenarioType | null, scenarioName: string | null } => {
  // Check localStorage for practice session data
  const lastSelectedScenario = localStorage.getItem('last_selected_scenario');
  const practiceToChat = localStorage.getItem('practice_to_chat');
  
  console.log('🔍 Practice context - Last selected scenario:', lastSelectedScenario);
  console.log('🔍 Practice context - Practice to chat:', practiceToChat);
  
  // Try to determine scenario type from various sources
  let scenarioType: ScenarioType | null = null;
  let scenarioName: string | null = null;
  
  // Check if we have explicit scenario selection
  if (lastSelectedScenario) {
    try {
      const scenarioData = JSON.parse(lastSelectedScenario);
      if (scenarioData.type) {
        scenarioType = scenarioData.type.toLowerCase() as ScenarioType;
        scenarioName = scenarioData.name || scenarioData.title || null;
      }
    } catch (e) {
      // If it's not JSON, treat as string
      if (lastSelectedScenario.toLowerCase().includes('privacy')) {
        scenarioType = 'privacy';
      } else if (lastSelectedScenario.toLowerCase().includes('accessibility')) {
        scenarioType = 'accessibility';
      }
    }
  }
  
  // Check practice session data for additional context
  if (!scenarioType && practiceToChat) {
    if (practiceToChat.toLowerCase().includes('privacy') || practiceToChat.toLowerCase().includes('location')) {
      scenarioType = 'privacy';
    } else if (practiceToChat.toLowerCase().includes('accessibility') || practiceToChat.toLowerCase().includes('screen reader')) {
      scenarioType = 'accessibility';
    }
  }
  
  console.log('🔍 Determined practice context - Type:', scenarioType, 'Name:', scenarioName);
  
  return { scenarioType, scenarioName };
};

/**
 * Validate that the detected scenario completion matches the current practice context
 */
export const validateScenarioCompletion = (detectedType: ScenarioType, messageContent: string): boolean => {
  const practiceContext = getCurrentPracticeContext();
  
  console.log('🔍 VALIDATION: Detected scenario type:', detectedType);
  console.log('🔍 VALIDATION: Practice context type:', practiceContext.scenarioType);
  
  // If we have practice context, ensure it matches the detected type
  if (practiceContext.scenarioType) {
    const isValid = practiceContext.scenarioType === detectedType;
    console.log('🔍 VALIDATION: Scenario completion is valid:', isValid);
    
    if (!isValid) {
      console.log('❌ VALIDATION FAILED: Detected scenario type does not match practice context');
      console.log('❌ This suggests a false positive in scenario detection');
    }
    
    return isValid;
  }
  
  // If no practice context, allow the completion (fallback to original logic)
  console.log('🔍 VALIDATION: No practice context found, allowing completion');
  return true;
};

/**
 * Debug function to check current practice context - can be called from browser console
 * Usage: window.debugPracticeContext()
 */
export const debugPracticeContext = (): void => {
  console.log('=== PRACTICE CONTEXT DEBUG ===');
  
  const context = getCurrentPracticeContext();
  console.log('Current practice context:', context);
  
  const scenarioStatuses = getAllScenarioStatuses();
  console.log('Scenario completion statuses:', scenarioStatuses);
  
  // Check all relevant localStorage keys
  const relevantKeys = [
    'last_selected_scenario',
    'practice_to_chat',
    'practice_manager_type',
    'scenario_completed_accessibility',
    'scenario_completed_privacy',
    'used_email_scenarios'
  ];
  
  console.log('Relevant localStorage keys:');
  relevantKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`  ${key}:`, value);
  });
  
  console.log('===============================');
};

/**
 * Comprehensive debugging function to understand scenario completion issues
 * Usage: window.debugScenarioIssue()
 */
export const debugScenarioIssue = (): void => {
  console.log('=== SCENARIO COMPLETION ISSUE DEBUG ===');
  
  // 1. Check current completion status
  const accessibilityCompleted = hasCompletedScenarioType('accessibility');
  const privacyCompleted = hasCompletedScenarioType('privacy');
  console.log('1. Current localStorage completion status:');
  console.log('   Accessibility:', accessibilityCompleted);
  console.log('   Privacy:', privacyCompleted);
  
  // 2. Check practice context
  const practiceContext = getCurrentPracticeContext();
  console.log('2. Current practice context:', practiceContext);
  
  // 3. Check all localStorage keys
  console.log('3. All localStorage keys related to scenarios:');
  const allKeys = Object.keys(localStorage);
  const scenarioKeys = allKeys.filter(key => 
    key.includes('scenario') || 
    key.includes('practice') || 
    key.includes('last_selected')
  );
  scenarioKeys.forEach(key => {
    console.log(`   ${key}: ${localStorage.getItem(key)}`);
  });
  
  // 4. Check if analysis is currently running
  console.log('4. Is scenario analysis currently running:', isAnalyzingScenarioCompletion);
  
  // 5. Provide reset options
  console.log('5. Available reset functions:');
  console.log('   - window.clearAllScenarioData() - Clear localStorage only');
  console.log('   - window.manualResetScenarios() - Reset both localStorage and database');
  console.log('   - window.forceResetUserState() - Force reset user state in UI');
  
  console.log('=====================================');
};

/**
 * Test scenario detection logic with a sample message
 * Usage: window.testScenarioDetection("your message here")
 */
export const testScenarioDetection = (messageContent: string): void => {
  console.log('=== TESTING SCENARIO DETECTION ===');
  console.log('Message content:', messageContent.substring(0, 500));
  
  // Test completion indicators
  const completionIndicators = [
    'Practice Session Complete!',
    'Practice Scenario Completed',
    'scenario complete',
    'Final Score:',
    'Performance Level:',
    'practice module completed',
    'scenario outcome'
  ];
  
  const hasCompletionIndicator = completionIndicators.some(indicator => 
    messageContent.toLowerCase().includes(indicator.toLowerCase())
  );
  console.log('Has completion indicator:', hasCompletionIndicator);
  
  // Test explicit scenario type detection
  const scenarioTypeMatch = messageContent.match(/- Scenario: (.+)\n- Issue: (.+)\n/i);
  if (scenarioTypeMatch) {
    console.log('Explicit scenario detection:');
    console.log('  Scenario name:', scenarioTypeMatch[1].trim());
    console.log('  Issue type:', scenarioTypeMatch[2].trim().toLowerCase());
  } else {
    console.log('No explicit scenario type found');
  }
  
  // Test individual detection functions
  const isAccessibilityComplete = isAccessibilityScenarioComplete(messageContent);
  const isPrivacyComplete = isPrivacyScenarioComplete(messageContent);
  
  console.log('Individual detection results:');
  console.log('  Accessibility complete:', isAccessibilityComplete);
  console.log('  Privacy complete:', isPrivacyComplete);
  
  // Test validation
  const practiceContext = getCurrentPracticeContext();
  console.log('Practice context:', practiceContext);
  
  if (isAccessibilityComplete) {
    const isValid = validateScenarioCompletion('accessibility', messageContent);
    console.log('Accessibility validation result:', isValid);
  }
  
  if (isPrivacyComplete) {
    const isValid = validateScenarioCompletion('privacy', messageContent);
    console.log('Privacy validation result:', isValid);
  }
  
  console.log('=================================');
};

// Make the manual reset function available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).manualResetScenarios = manualResetScenarios;
  (window as any).logScenarioStatus = logScenarioStatus;
  (window as any).clearAllScenarioData = clearAllScenarioData;
  (window as any).refreshUserDataFromServer = refreshUserDataFromServer;
  (window as any).forceUpdateUserState = forceUpdateUserState;
  (window as any).forceResetUserState = forceResetUserState;
  (window as any).debugPracticeContext = debugPracticeContext;
  (window as any).debugScenarioIssue = debugScenarioIssue;
  (window as any).testScenarioDetection = testScenarioDetection;
} 