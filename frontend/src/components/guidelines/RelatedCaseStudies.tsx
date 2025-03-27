import React from 'react';
import { useStore } from '@/store/useStore';

interface CaseStudy {
  id: string;
  title: string;
  summary: string;
  outcome: string;
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
        const response = await fetch('/api/case-studies/relevant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation: currentConversation.messages
          }),
        });
        
        if (!response.ok) throw new Error('Failed to fetch case studies');
        
        const data = await response.json();
        setCaseStudies(data.caseStudies);
      } catch (error) {
        console.error('Error fetching case studies:', error);
        setError('Unable to load case studies');
      } finally {
        setLoading(false);
      }
    };

    fetchCaseStudies();
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
                <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                  {study.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {study.summary}
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Outcome: <span className="font-normal">{study.outcome}</span>
                </p>
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