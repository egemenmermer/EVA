import React from 'react';
import { useStore } from '@/store/useStore';
import axios from '@/services/axiosConfig';

interface CaseStudy {
  id: string;
  title: string;
  summary: string;
  outcome: string;
  source: string;
  relevance: number;
}

export const RelatedCaseStudies: React.FC = () => {
  const { currentConversation } = useStore();
  const [caseStudies, setCaseStudies] = React.useState<CaseStudy[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch relevant case studies when conversation changes
  React.useEffect(() => {
    const fetchCaseStudies = async () => {
      if (!currentConversation?.messages?.length) return;
      
      setLoading(true);
      setError(null);
      try {
        // Map the messages to the format expected by the API
        const messages = currentConversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        // Only fetch if we have substantial conversation content
        if (messages.length < 1) {
          setCaseStudies([]);
          setLoading(false);
          return;
        }
        
        interface CaseStudiesResponse {
          caseStudies: CaseStudy[];
        }
        
        const response = await axios.post<CaseStudiesResponse>('/case-studies/relevant', {
          messages
        });
        
        if (response.data && Array.isArray(response.data.caseStudies)) {
          setCaseStudies(response.data.caseStudies);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching case studies:', error);
        setError('Unable to load case studies');
        // Provide fallback case studies for common ethical issues
        setCaseStudies([
          {
            id: 'fallback-1',
            title: 'Cambridge Analytica Data Scandal',
            summary: 'Cambridge Analytica collected personal data from millions of Facebook users without consent for political targeting.',
            outcome: 'Resulted in major regulatory changes and heightened awareness about data privacy.',
            source: 'Data Privacy Case Studies',
            relevance: 0.9
          },
          {
            id: 'fallback-2',
            title: 'Google Street View Wi-Fi Data Collection',
            summary: 'Google\'s Street View cars collected data from unencrypted Wi-Fi networks during mapping operations.',
            outcome: 'Led to significant fines and changes in data collection practices.',
            source: 'Location Data Ethics',
            relevance: 0.85
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCaseStudies();
    
    // Set up polling for case study updates as conversation progresses
    const intervalId = setInterval(fetchCaseStudies, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [currentConversation?.messages]);

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Related Case Studies
      </h3>
      <div className="text-sm text-gray-800 dark:text-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          </div>
        ) : error ? (
          <p className="text-red-500 dark:text-red-400">
            {error}
          </p>
        ) : caseStudies.length > 0 ? (
          <ul className="space-y-4">
            {caseStudies.map((study) => (
              <li key={study.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium text-blue-600 dark:text-blue-400">
                    {study.title}
                  </h4>
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                    {Math.round(study.relevance * 100)}%
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {study.summary}
                </p>
                <div className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    Outcome: 
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 ml-1">
                    {study.outcome}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {study.source}
                </div>
              </li>
            ))}
          </ul>
        ) : currentConversation?.messages?.length ? (
          <p className="text-gray-500 dark:text-gray-400">
            No similar case studies found for the current discussion. As the conversation develops, relevant examples may appear.
          </p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 italic">
            Start a conversation to see related case studies.
          </p>
        )}
      </div>
    </div>
  );
}; 