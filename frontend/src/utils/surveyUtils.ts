// Survey completion tracking utilities
import { backendApi } from '../services/axiosConfig';

export type SurveyType = 'pre' | 'post';

/**
 * Check if user has completed a specific survey type
 */
export const hasCompletedSurvey = (surveyType: SurveyType): boolean => {
  const completionKey = `survey_completed_${surveyType}`;
  return localStorage.getItem(completionKey) === 'true';
};

/**
 * Get survey completion timestamp
 */
export const getSurveyCompletionDate = (surveyType: SurveyType): Date | null => {
  const timestampKey = `survey_completed_${surveyType}_timestamp`;
  const timestamp = localStorage.getItem(timestampKey);
  return timestamp ? new Date(timestamp) : null;
};

/**
 * Mark survey as completed (used by survey modal)
 */
export const markSurveyCompleted = (surveyType: SurveyType): void => {
  const completionKey = `survey_completed_${surveyType}`;
  localStorage.setItem(completionKey, 'true');
  localStorage.setItem(`${completionKey}_timestamp`, new Date().toISOString());
  
  console.log(`Survey ${surveyType} marked as completed`);
};

/**
 * Reset survey completion status (for testing/admin purposes)
 */
export const resetSurveyCompletion = (surveyType: SurveyType): void => {
  const completionKey = `survey_completed_${surveyType}`;
  const timestampKey = `${completionKey}_timestamp`;
  
  localStorage.removeItem(completionKey);
  localStorage.removeItem(timestampKey);
  
  console.log(`Survey ${surveyType} completion status reset`);
};

/**
 * Get all survey completion statuses
 */
export const getAllSurveyStatuses = () => {
  return {
    pre: {
      completed: hasCompletedSurvey('pre'),
      completedAt: getSurveyCompletionDate('pre')
    },
    post: {
      completed: hasCompletedSurvey('post'),
      completedAt: getSurveyCompletionDate('post')
    }
  };
};

/**
 * API function to mark pre-survey as completed in database
 */
export const markPreSurveyCompletedAPI = async (): Promise<void> => {
  try {
    await backendApi.post('/api/v1/user/mark-pre-survey-completed');
    console.log('Pre-survey marked as completed in database');
  } catch (error) {
    console.error('Failed to mark pre-survey as completed:', error);
    throw error;
  }
};

/**
 * API function to mark post-survey as completed in database
 */
export const markPostSurveyCompletedAPI = async (): Promise<void> => {
  try {
    await backendApi.post('/api/v1/user/mark-post-survey-completed');
    console.log('Post-survey marked as completed in database');
  } catch (error) {
    console.error('Failed to mark post-survey as completed:', error);
    throw error;
  }
};

/**
 * API function to mark accessibility scenarios as completed
 */
export const markAccessibilityScenariosCompletedAPI = async (): Promise<void> => {
  try {
    await backendApi.post('/api/v1/user/mark-accessibility-scenarios-completed');
    console.log('Accessibility scenarios marked as completed in database');
  } catch (error) {
    console.error('Failed to mark accessibility scenarios as completed:', error);
    throw error;
  }
};

/**
 * API function to mark privacy scenarios as completed
 */
export const markPrivacyScenariosCompletedAPI = async (): Promise<void> => {
  try {
    await backendApi.post('/api/v1/user/mark-privacy-scenarios-completed');
    console.log('Privacy scenarios marked as completed in database');
  } catch (error) {
    console.error('Failed to mark privacy scenarios as completed:', error);
    throw error;
  }
}; 