import React, { useState, useEffect } from 'react';
import { X, FileText, ArrowRight, CheckCircle } from 'lucide-react';
import { 
  markPreSurveyCompletedAPI, 
  markPostSurveyCompletedAPI 
} from '@/utils/surveyUtils';

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyType: 'pre' | 'post';
  onComplete?: () => void;
}

export const SurveyModal: React.FC<SurveyModalProps> = ({
  isOpen,
  onClose,
  surveyType,
  onComplete
}) => {
  const [showThankYou, setShowThankYou] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const surveyUrl = "https://forms.office.com/Pages/ResponsePage.aspx?id=nJwqRqYt-0uzGA-DBD_km3-T2_6gLAJNnNt_jf07KBZUMzhKUzNCQlBOSlZDQUpNNUZLTDhESENOSC4u";

  // Function to handle survey completion submission
  const handleSurveySubmit = async () => {
    if (!hasConfirmed) return;
    
    try {
      // Mark survey as completed in database
      if (surveyType === 'pre') {
        await markPreSurveyCompletedAPI();
      } else {
        await markPostSurveyCompletedAPI();
      }
      
      // Mark survey as completed in localStorage (for backward compatibility)
      const completionKey = `survey_completed_${surveyType}`;
      localStorage.setItem(completionKey, 'true');
      localStorage.setItem(`${completionKey}_timestamp`, new Date().toISOString());
      
      setShowThankYou(true);
      
      if (onComplete) {
        onComplete();
      }
      
      // Auto-close after showing thank you message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to mark survey as completed:', error);
      // Still allow local completion to not block the user
      const completionKey = `survey_completed_${surveyType}`;
      localStorage.setItem(completionKey, 'true');
      localStorage.setItem(`${completionKey}_timestamp`, new Date().toISOString());
      
      setShowThankYou(true);
      
      if (onComplete) {
        onComplete();
      }
      
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const surveyConfig = {
    pre: {
      title: "Initial Research Survey",
      description: "Help us understand your current ethical decision-making approach. This brief survey will help us tailor your experience with EVA.",
      buttonText: "Continue to Survey",
      icon: "📋"
    },
    post: {
      title: "Research Follow-up Survey", 
      description: "Share your experience with EVA and how it has influenced your ethical decision-making approach.",
      buttonText: "Complete Final Survey",
      icon: "✅"
    }
  };

  const config = surveyConfig[surveyType];

  // Early return after all hooks are called
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-60" />
      
      {/* Modal content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-5xl w-full mx-4 h-[85vh] flex flex-col">

        {/* Header - Compact */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {config.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {config.description}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {showThankYou ? (
            /* Thank You Message */
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Thank You!
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Your survey response has been recorded. You can now continue using EVA.
                </p>
              </div>
            </div>
          ) : (
            /* Survey iframe */
            <iframe
              src={surveyUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 'none' }}
              title={`${surveyType} Survey`}
              className="w-full h-full"
            />
          )}
        </div>

        {/* Footer with Confirmation - Always visible */}
        {!showThankYou && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="survey-completed"
                  checked={hasConfirmed}
                  onChange={(e) => setHasConfirmed(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="survey-completed" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  I have filled out the survey correctly
                </label>
              </div>
              <button
                onClick={handleSurveySubmit}
                disabled={!hasConfirmed}
                className={`px-6 py-2 rounded-lg font-medium flex items-center transition-colors ${
                  hasConfirmed
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                Submit
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 