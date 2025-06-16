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
  
  if (!hasCompletionIndicator) return false;
  
  // Look for explicit scenario type in the completion message
  // Format: "- Scenario: Screen Reader Compatibility\n- Issue: Accessibility\n"
  const scenarioTypeMatch = content.match(/- Scenario: (.+)\n- Issue: (.+)\n/i);
  if (scenarioTypeMatch) {
    const issueType = scenarioTypeMatch[2].trim().toLowerCase();
    return issueType === 'accessibility';
  }
  
  return false;
};

/**
 * Check if a scenario completion message indicates privacy scenarios are done
 * by examining the scenario title and issue type in the completion message
 */
const isPrivacyScenarioComplete = (content: string): boolean => {
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
  
  if (!hasCompletionIndicator) return false;
  
  // Look for explicit scenario type in the completion message
  // Format: "- Scenario: Location Data Collection\n- Issue: Privacy\n"
  const scenarioTypeMatch = content.match(/- Scenario: (.+)\n- Issue: (.+)\n/i);
  if (scenarioTypeMatch) {
    const issueType = scenarioTypeMatch[2].trim().toLowerCase();
    return issueType === 'privacy';
  }
  
  return false;
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
    console.log('Analyzing message for scenario completion:', messageContent.substring(0, 200) + '...');
    
    // Check for accessibility scenario completion
    if (isAccessibilityScenarioComplete(messageContent) && !hasCompletedScenarioType('accessibility')) {
      console.log('Detected accessibility scenario completion, marking as completed');
      await markScenarioTypeCompleted('accessibility');
      
      // Trigger UI refresh
      window.dispatchEvent(new CustomEvent('scenario-completed', { 
        detail: { scenarioType: 'accessibility' } 
      }));
    }
    
    // Check for privacy scenario completion
    if (isPrivacyScenarioComplete(messageContent) && !hasCompletedScenarioType('privacy')) {
      console.log('Detected privacy scenario completion, marking as completed');
      await markScenarioTypeCompleted('privacy');
      
      // Trigger UI refresh
      window.dispatchEvent(new CustomEvent('scenario-completed', { 
        detail: { scenarioType: 'privacy' } 
      }));
    }
  } catch (error) {
    console.error('Error analyzing message for scenario completion:', error);
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