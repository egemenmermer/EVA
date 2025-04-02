import React, { useEffect, useState } from 'react';
import { getKnowledgeArtifacts } from '../services/api';
import { Loader2, RefreshCw } from 'lucide-react';

interface Guideline {
  id: string;
  title: string;
  description: string;
  source: string;
  category: string;
  relevance: number;
}

interface CaseStudy {
  id: string;
  title: string;
  summary: string;
  outcome: string;
  source: string;
  relevance: number;
}

interface KnowledgeArtifactsResponse {
  guidelines: Guideline[];
  caseStudies: CaseStudy[];
}

interface KnowledgePanelProps {
  conversationId: string;
  hasUserQueried: boolean;
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ conversationId, hasUserQueried }) => {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5; // Reduced from 10 to 5 retries
  const retryDelay = 2000; // 2 seconds between retries
  const initialDelay = 3000; // 3 seconds initial delay

  const fetchKnowledgeArtifacts = async () => {
    if (!conversationId || !hasUserQueried) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Initial delay to let the agent process
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      
      let attempts = 0;
      let lastError = null;
      
      while (attempts < maxRetries) {
        try {
          const response = await getKnowledgeArtifacts(conversationId) as KnowledgeArtifactsResponse;
          
          // Check if we have actual data
          if (response.guidelines?.length > 0 || response.caseStudies?.length > 0) {
            setGuidelines(response.guidelines);
            setCaseStudies(response.caseStudies);
            setLoading(false);
            setRetryCount(0); // Reset retry count on success
            return;
          }
          
          // If no data yet, wait and retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          attempts++;
          setRetryCount(attempts);
          
        } catch (error) {
          lastError = error;
          // If it's not the last attempt, continue retrying
          if (attempts < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            attempts++;
            setRetryCount(attempts);
            continue;
          }
          throw error; // Throw on final attempt
        }
      }
      
      // If we exit the loop without data, show an error
      setError('No relevant information found. The agent might still be processing.');
    } catch (error) {
      console.error('Error fetching knowledge artifacts:', error);
      setError('Unable to load relevant information. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasUserQueried && conversationId) {
      fetchKnowledgeArtifacts();
    }
  }, [conversationId, hasUserQueried]);

  if (!hasUserQueried) {
    return (
      <div className="knowledge-panel text-gray-800 dark:text-gray-200">
        <div className="knowledge-section mb-6">
          <h2 className="text-lg font-semibold mb-2 text-blue-600 dark:text-blue-400">Relevant Ethical Guidelines</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Start a conversation to see relevant ethical guidelines.</p>
        </div>
        <div className="knowledge-section">
          <h2 className="text-lg font-semibold mb-2 text-purple-600 dark:text-purple-400">Related Case Studies</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Start a conversation to see related case studies.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="knowledge-panel text-gray-800 dark:text-gray-200">
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Analyzing conversation and retrieving relevant information...
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Attempt {retryCount} of {maxRetries}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="knowledge-panel text-gray-800 dark:text-gray-200">
        <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
          <button
            onClick={fetchKnowledgeArtifacts}
            className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="knowledge-panel text-gray-800 dark:text-gray-200">
      <div className="knowledge-section mb-6">
        <h2 className="text-lg font-semibold mb-3 text-blue-600 dark:text-blue-400">Relevant Ethical Guidelines</h2>
        {guidelines.length > 0 ? (
          <div className="guidelines-list space-y-4">
            {guidelines.map((guideline) => (
              <div key={guideline.id} className="guideline-item p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                <h3 className="text-base font-medium mb-1">{guideline.title}</h3>
                <p className="text-sm mb-2">{guideline.description}</p>
                <div className="guideline-meta text-xs text-gray-500 dark:text-gray-400">
                  {guideline.source && (
                    <span className="guideline-source block mb-1">Source: {guideline.source}</span>
                  )}
                  {guideline.category && (
                    <span className="guideline-category block">Category: {guideline.category}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No relevant guidelines found.</p>
        )}
      </div>

      <div className="knowledge-section">
        <h2 className="text-lg font-semibold mb-3 text-purple-600 dark:text-purple-400">Related Case Studies</h2>
        {caseStudies.length > 0 ? (
          <div className="case-studies-list space-y-4">
            {caseStudies.map((caseStudy) => (
              <div key={caseStudy.id} className="case-study-item p-3 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                <h3 className="text-base font-medium mb-1">{caseStudy.title}</h3>
                {caseStudy.summary && (
                  <p className="text-sm mb-2"><strong>Summary:</strong> {caseStudy.summary}</p>
                )}
                {caseStudy.outcome && (
                  <p className="text-sm mb-2"><strong>Outcome:</strong> {caseStudy.outcome}</p>
                )}
                {caseStudy.source && (
                  <div className="case-study-meta text-xs text-gray-500 dark:text-gray-400">
                    <span className="case-study-source">Source: {caseStudy.source}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No related case studies found.</p>
        )}
      </div>
    </div>
  );
};

export default KnowledgePanel; 