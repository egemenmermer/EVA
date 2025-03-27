import React from 'react';
import { useStore } from '@/store/useStore';
import axios from 'axios';

interface Guideline {
  id: string;
  title: string;
  description: string;
  source: string;
  relevance: number;
  category: string;
}

export const DynamicGuidelines: React.FC = () => {
  const { currentConversation } = useStore();
  const [guidelines, setGuidelines] = React.useState<Guideline[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch relevant guidelines when conversation changes
  React.useEffect(() => {
    const fetchGuidelines = async () => {
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
          setGuidelines([]);
          setLoading(false);
          return;
        }
        
        const response = await axios.post('/api/guidelines/relevant', {
          messages
        });
        
        if (response.data && response.data.guidelines) {
          setGuidelines(response.data.guidelines);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error fetching guidelines:', error);
        setError('Unable to load guidelines');
        // Provide fallback guidelines for common ethical issues
        setGuidelines([
          {
            id: 'fallback-1',
            title: 'Data Minimization',
            description: 'Only collect the minimum amount of data necessary for your application to function properly.',
            source: 'General Ethical Principles',
            relevance: 0.95,
            category: 'Privacy'
          },
          {
            id: 'fallback-2',
            title: 'User Consent',
            description: 'Always obtain explicit and informed consent from users before collecting or processing their data.',
            source: 'General Ethical Principles',
            relevance: 0.9,
            category: 'Privacy'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchGuidelines();
    
    // Set up polling for guideline updates as conversation progresses
    const intervalId = setInterval(fetchGuidelines, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [currentConversation?.messages]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Relevant Ethical Guidelines
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
        ) : guidelines.length > 0 ? (
          <ul className="space-y-3">
            {guidelines.map((guideline) => (
              <li key={guideline.id} className="border-l-2 border-blue-500 pl-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium mb-1">{guideline.title}</h4>
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                    {Math.round(guideline.relevance * 100)}%
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                  {guideline.description}
                </p>
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>{guideline.source}</span>
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                    {guideline.category}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : currentConversation?.messages?.length ? (
          <p className="text-gray-500 dark:text-gray-400">
            No specific ethical guidelines found for the current topic. Continue the conversation to explore ethical considerations.
          </p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 italic">
            Start a conversation to see relevant ethical guidelines.
          </p>
        )}
      </div>
    </div>
  );
}; 