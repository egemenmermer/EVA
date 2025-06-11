// Scenario completion tracking utilities
import { 
  markAccessibilityScenariosCompletedAPI, 
  markPrivacyScenariosCompletedAPI 
} from './surveyUtils';

export type ScenarioType = 'accessibility' | 'privacy';

/**
 * Check if a scenario completion message indicates accessibility scenarios are done
 */
const isAccessibilityScenarioComplete = (content: string): boolean => {
  const accessibilityKeywords = [
    'accessibility',
    'screen reader',
    'keyboard navigation',
    'visual impairment',
    'assistive technology',
    'alt text',
    'aria',
    'wcag',
    'ada compliance'
  ];
  
  const completionIndicators = [
    'Practice Session Complete!',
    'scenario complete',
    'Final Score:',
    'Performance Level:',
    'practice module completed',
    'scenario outcome'
  ];
  
  const lowerContent = content.toLowerCase();
  const hasAccessibilityKeyword = accessibilityKeywords.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
  const hasCompletionIndicator = completionIndicators.some(indicator => 
    lowerContent.includes(indicator.toLowerCase())
  );
  
  return hasAccessibilityKeyword && hasCompletionIndicator;
};

/**
 * Check if a scenario completion message indicates privacy scenarios are done
 */
const isPrivacyScenarioComplete = (content: string): boolean => {
  const privacyKeywords = [
    'privacy',
    'location data',
    'user data',
    'personal information',
    'data collection',
    'tracking',
    'consent',
    'gdpr',
    'data protection',
    'user tracking'
  ];
  
  const completionIndicators = [
    'Practice Session Complete!',
    'scenario complete',
    'Final Score:',
    'Performance Level:',
    'practice module completed',
    'scenario outcome'
  ];
  
  const lowerContent = content.toLowerCase();
  const hasPrivacyKeyword = privacyKeywords.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
  const hasCompletionIndicator = completionIndicators.some(indicator => 
    lowerContent.includes(indicator.toLowerCase())
  );
  
  return hasPrivacyKeyword && hasCompletionIndicator;
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