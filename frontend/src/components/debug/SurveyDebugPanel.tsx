import React from 'react';
import { resetSurveyCompletion, getAllSurveyStatuses, SurveyType } from '@/utils/surveyUtils';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface SurveyDebugPanelProps {
  onShowSurvey?: (surveyType: SurveyType) => void;
}

export const SurveyDebugPanel: React.FC<SurveyDebugPanelProps> = ({ onShowSurvey }) => {
  const [statuses, setStatuses] = React.useState(getAllSurveyStatuses());

  const refreshStatuses = () => {
    setStatuses(getAllSurveyStatuses());
  };

  const handleResetSurvey = (surveyType: SurveyType) => {
    resetSurveyCompletion(surveyType);
    refreshStatuses();
  };

  const handleShowSurvey = (surveyType: SurveyType) => {
    if (onShowSurvey) {
      onShowSurvey(surveyType);
    }
  };

  React.useEffect(() => {
    refreshStatuses();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Survey Debug Panel
        </h3>
        <button
          onClick={refreshStatuses}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {(['pre', 'post'] as SurveyType[]).map(surveyType => (
          <div key={surveyType} className="border border-gray-200 dark:border-gray-600 rounded-md p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                {surveyType} Survey
              </span>
              {statuses[surveyType].completed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            
            {statuses[surveyType].completed && statuses[surveyType].completedAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Completed: {statuses[surveyType].completedAt?.toLocaleDateString()}
              </p>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleResetSurvey(surveyType)}
                className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
              >
                Reset
              </button>
              <button
                onClick={() => handleShowSurvey(surveyType)}
                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                Show
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Development only - remove in production
      </p>
    </div>
  );
}; 