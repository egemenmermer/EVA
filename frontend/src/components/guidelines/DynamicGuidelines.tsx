import React from 'react';
import { useStore } from '@/store/useStore';

interface Guideline {
  id: string;
  title: string;
  description: string;
  relevance: number;
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
        const response = await fetch('/api/guidelines/relevant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation: currentConversation.messages
          }),
        });
        
        if (!response.ok) throw new Error('Failed to fetch guidelines');
        
        const data = await response.json();
        setGuidelines(data.guidelines);
      } catch (error) {
        console.error('Error fetching guidelines:', error);
        setError('Unable to load guidelines');
      } finally {
        setLoading(false);
      }
    };

    fetchGuidelines();
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
                <h4 className="font-medium mb-1">{guideline.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {guideline.description}
                </p>
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