import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getKnowledgeArtifacts, getConversationMessages, generateKnowledgeArtifacts } from '../services/api';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import './KnowledgePanel.css';

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
  isOpen: boolean;
  onClose: () => void;
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ conversationId, isOpen, onClose }) => {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [givenUp, setGivenUp] = useState(false);
  const [expandedGuidelines, setExpandedGuidelines] = useState<Set<string>>(new Set());
  const [expandedCaseStudies, setExpandedCaseStudies] = useState<Set<string>>(new Set());
  const [showAllGuidelines, setShowAllGuidelines] = useState(false);
  const [showAllCaseStudies, setShowAllCaseStudies] = useState(false);

  // Reduced values to minimize token usage
  const maxRetries = 2; // Reduced from 5
  const retryDelay = 3000; // Increased from 1500ms to 3000ms
  const maxAutoRefreshes = 2; // Reduced from 8
  const autoRefreshInterval = 20000; // Increased from 15000ms to 20000ms
  const initialDelay = 2000; // Increased from 1000ms to 2000ms

  // Add a debug log function
  const addDebugLog = useCallback((message: string) => {
    setDebugLog(prev => [...prev, `${new Date().toISOString().substr(11, 8)}: ${message}`]);
  }, []);

  // Helper function to copy debug logs to clipboard
  const copyDebugToClipboard = () => {
    const debugInfo = {
      conversationId,
      timestamp: new Date().toISOString(),
      logs: debugLog,
      guidelinesCount: guidelines.length,
      caseStudiesCount: caseStudies.length,
      retryCount,
      autoRefreshCount,
      error
    };
    
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    addDebugLog("Debug info copied to clipboard");
  };

  // Toggle expanded state for a guideline
  const toggleGuideline = useCallback((id: string) => {
    setExpandedGuidelines(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  }, []);

  // Toggle expanded state for a case study
  const toggleCaseStudy = useCallback((id: string) => {
    setExpandedCaseStudies(prevExpanded => {
      const newExpanded = new Set(prevExpanded);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  }, []);

  // Fetch artifacts
  const fetchArtifacts = useCallback(async () => {
    if (!conversationId) {
      addDebugLog("No conversation ID provided");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      addDebugLog(`Fetching artifacts for conversation: ${conversationId}`);
      const data = await getKnowledgeArtifacts(conversationId);
      
      if (data && data.guidelines && data.caseStudies) {
        // Sort guidelines and case studies by relevance
        const sortedGuidelines = [...data.guidelines].sort((a, b) => b.relevance - a.relevance);
        const sortedCaseStudies = [...data.caseStudies].sort((a, b) => b.relevance - a.relevance);
        
        setGuidelines(sortedGuidelines);
        setCaseStudies(sortedCaseStudies);
        addDebugLog(`Loaded ${sortedGuidelines.length} guidelines, ${sortedCaseStudies.length} case studies`);
        
        // Auto-expand the most relevant items
        if (sortedGuidelines.length > 0) {
          setExpandedGuidelines(new Set([sortedGuidelines[0].id]));
        }
        if (sortedCaseStudies.length > 0) {
          setExpandedCaseStudies(new Set([sortedCaseStudies[0].id]));
        }
      } else {
        addDebugLog("Received empty or invalid data");
        setError("No relevant guidelines or case studies found");
      }
    } catch (err) {
      addDebugLog(`Error fetching artifacts: ${err}`);
      setError("Failed to load guidelines and case studies");
      
      if (retryCount < maxRetries) {
        addDebugLog(`Will retry in ${retryDelay}ms (retry ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, retryDelay);
      } else {
        setGivenUp(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, retryCount, maxRetries, retryDelay, addDebugLog]);

  // Generate artifacts manually
  const generateArtifacts = async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    setError(null);
    setGivenUp(false);
    addDebugLog("Manually generating artifacts...");
    
    try {
      const data = await generateKnowledgeArtifacts(conversationId);
      
      if (data && data.guidelines && data.caseStudies) {
        // Sort by relevance
        const sortedGuidelines = [...data.guidelines].sort((a, b) => b.relevance - a.relevance);
        const sortedCaseStudies = [...data.caseStudies].sort((a, b) => b.relevance - a.relevance);
        
        setGuidelines(sortedGuidelines);
        setCaseStudies(sortedCaseStudies);
        addDebugLog(`Generated ${sortedGuidelines.length} guidelines, ${sortedCaseStudies.length} case studies`);
        
        // Auto-expand the most relevant items
        if (sortedGuidelines.length > 0) {
          setExpandedGuidelines(new Set([sortedGuidelines[0].id]));
        }
        if (sortedCaseStudies.length > 0) {
          setExpandedCaseStudies(new Set([sortedCaseStudies[0].id]));
        }
      } else {
        addDebugLog("Generation returned empty or invalid data");
        setError("Failed to generate relevant guidelines or case studies");
      }
    } catch (err) {
      addDebugLog(`Error generating artifacts: ${err}`);
      setError("Failed to generate guidelines and case studies");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch on mount and when conversation ID changes
  useEffect(() => {
    if (isOpen && conversationId) {
      addDebugLog(`Panel opened for conversation: ${conversationId}`);
      setRetryCount(0);
      setAutoRefreshCount(0);
      setGivenUp(false);
      
      // Add a small initial delay to let the conversation load
      const timer = setTimeout(() => {
        fetchArtifacts();
      }, initialDelay);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, conversationId, fetchArtifacts, initialDelay, addDebugLog]);
  
  // Auto-refresh on retry count change
  useEffect(() => {
    if (retryCount > 0 && retryCount <= maxRetries) {
      fetchArtifacts();
    }
  }, [retryCount, fetchArtifacts, maxRetries]);
  
  // Auto-refresh on interval if needed
  useEffect(() => {
    // Only set up auto-refresh if guidelines and case studies are empty
    if (isOpen && conversationId && (guidelines.length === 0 || caseStudies.length === 0) && !givenUp) {
      if (autoRefreshCount < maxAutoRefreshes) {
        addDebugLog(`Setting up auto-refresh (${autoRefreshCount}/${maxAutoRefreshes})`);
        
        const timer = setTimeout(() => {
          addDebugLog(`Auto-refreshing (${autoRefreshCount + 1}/${maxAutoRefreshes})`);
          setAutoRefreshCount(prev => prev + 1);
          fetchArtifacts();
        }, autoRefreshInterval);
        
        return () => clearTimeout(timer);
      } else {
        addDebugLog(`Max auto-refreshes (${maxAutoRefreshes}) reached`);
        setGivenUp(true);
      }
    }
  }, [
    isOpen, conversationId, guidelines.length, caseStudies.length, 
    autoRefreshCount, maxAutoRefreshes, autoRefreshInterval, 
    fetchArtifacts, givenUp, addDebugLog
  ]);

  // Effect for expand/collapse all guidelines
  useEffect(() => {
    if (showAllGuidelines) {
      const allIds = guidelines.map(g => g.id);
      setExpandedGuidelines(new Set(allIds));
    } else if (showAllGuidelines === false) { // Only collapse when explicitly set to false (not on initial render)
      setExpandedGuidelines(new Set());
    }
  }, [showAllGuidelines, guidelines]);
  
  // Effect for expand/collapse all case studies
  useEffect(() => {
    if (showAllCaseStudies) {
      const allIds = caseStudies.map(cs => cs.id);
      setExpandedCaseStudies(new Set(allIds));
    } else if (showAllCaseStudies === false) { // Only collapse when explicitly set to false (not on initial render)
      setExpandedCaseStudies(new Set());
    }
  }, [showAllCaseStudies, caseStudies]);

  // Truncate text for display
  const truncateText = (text: string, maxLength: number = 250): string => {
    if (!text) return '';
    // Clean up text by removing extra whitespace and newlines
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    return cleanedText.length > maxLength ? `${cleanedText.substring(0, maxLength)}...` : cleanedText;
  };

  // Format relevance score for display
  const formatRelevance = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };

  // Render a guideline
  const renderGuideline = (guideline: Guideline, index: number) => {
    const isExpanded = expandedGuidelines.has(guideline.id);
    const titleText = truncateText(guideline.title, 100);
    
    return (
      <div 
        key={guideline.id} 
        className="guideline-item"
        onClick={() => toggleGuideline(guideline.id)}
      >
        <div className="flex justify-between items-start">
          <h5 className="font-medium mb-1">
            {index + 1}. {titleText}
          </h5>
          <div className="flex items-center text-xs">
            <span className="mr-2 text-blue-600 dark:text-blue-400 font-medium">
              {formatRelevance(guideline.relevance)}
            </span>
            <button 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                toggleGuideline(guideline.id);
              }}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <>
            <div className="description-text mt-3 mb-2">
              {guideline.description.split('\n').map((paragraph, i) => (
                paragraph.trim() ? <p key={i} className="mb-2">{paragraph}</p> : null
              ))}
            </div>
            <div className="metadata">
              <span>Source: {guideline.source}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render a case study
  const renderCaseStudy = (caseStudy: CaseStudy, index: number) => {
    const isExpanded = expandedCaseStudies.has(caseStudy.id);
    const titleText = truncateText(caseStudy.title, 100);
    
    return (
      <div 
        key={caseStudy.id} 
        className="case-study-item"
        onClick={() => toggleCaseStudy(caseStudy.id)}
      >
        <div className="flex justify-between items-start">
          <h5 className="font-medium mb-1">
            {index + 1}. {titleText}
          </h5>
          <div className="flex items-center text-xs">
            <span className="mr-2 text-blue-600 dark:text-blue-400 font-medium">
              {formatRelevance(caseStudy.relevance)}
            </span>
            <button 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                toggleCaseStudy(caseStudy.id);
              }}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          </div>
        </div>
        
        {isExpanded && (
          <>
            <div className="description-text mt-3">
              <p className="mb-2">
                <strong>Summary:</strong> {caseStudy.summary}
              </p>
              <p className="mb-2">
                <strong>Outcome:</strong> {caseStudy.outcome}
              </p>
            </div>
            <div className="metadata">
              <span>Source: {caseStudy.source}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="knowledge-panel">
      <div className="knowledge-header">
        <h3>Knowledge Panel</h3>
        <div>
          <button
            className="debug-toggle"
            onClick={() => setShowDebug(!showDebug)}
            title={showDebug ? "Hide debug info" : "Show debug info"}
          >
            {showDebug ? "Hide Debug" : "Debug"}
          </button>
          
          <button 
            className="refresh-button" 
            onClick={fetchArtifacts}
            disabled={isLoading}
            title="Refresh artifacts"
          >
            ↻
          </button>
          
          <button 
            className="close-button" 
            onClick={onClose}
            title="Close panel"
          >
            ✕
          </button>
        </div>
      </div>
      
      {showDebug && (
        <div className="debug-panel">
          <h4>Debug Information</h4>
          <div className="flex flex-wrap gap-2 mb-2">
            <button 
              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded"
              onClick={copyDebugToClipboard}
            >
              Copy Debug Info
            </button>
            <button 
              className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
              onClick={() => setDebugLog([])}
            >
              Clear Logs
            </button>
          </div>
          <div className="text-xs mb-2">
            <div><strong>Conversation ID:</strong> {conversationId || 'None'}</div>
            <div><strong>Guidelines:</strong> {guidelines.length}</div>
            <div><strong>Case studies:</strong> {caseStudies.length}</div>
            <div><strong>Retries:</strong> {retryCount}/{maxRetries}</div>
            <div><strong>Auto-refreshes:</strong> {autoRefreshCount}/{maxAutoRefreshes}</div>
            <div><strong>Has error:</strong> {error ? 'Yes' : 'No'}</div>
          </div>
          <div className="debug-log">
            {debugLog.map((log, i) => (
              <div key={i} className="log-line">{log}</div>
            ))}
            {debugLog.length === 0 && <div className="log-line text-gray-500">No logs yet</div>}
          </div>
        </div>
      )}
      
      <div className="knowledge-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading knowledge artifacts...</p>
            {retryCount > 0 && (
              <p className="retry-info">Retry attempt {retryCount}/{maxRetries}</p>
            )}
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            {givenUp ? (
              <div className="text-center mt-4">
                <button 
                  className="retry-button"
                  onClick={generateArtifacts}
                >
                  Generate Artifacts
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  This will attempt to generate new artifacts for this conversation.
                </p>
              </div>
            ) : (
              <button 
                className="retry-button"
                onClick={() => {
                  setRetryCount(0);
                  setGivenUp(false);
                  fetchArtifacts();
                }}
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="guidelines-section">
              <div className="flex justify-between items-center mb-2">
                <h4>Relevant Guidelines ({guidelines.length})</h4>
                {guidelines.length > 0 && (
                  <button 
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => setShowAllGuidelines(!showAllGuidelines)}
                  >
                    {showAllGuidelines ? 'Collapse All' : 'Expand All'}
                  </button>
                )}
              </div>
              
              {guidelines.length > 0 ? (
                <div className="space-y-3">
                  {guidelines.map((guideline, index) => renderGuideline(guideline, index))}
                </div>
              ) : (
                <div className="no-data">
                  No relevant guidelines found
                </div>
              )}
            </div>
            
            <div className="case-studies-section">
              <div className="flex justify-between items-center mb-2">
                <h4>Relevant Case Studies ({caseStudies.length})</h4>
                {caseStudies.length > 0 && (
                  <button 
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => setShowAllCaseStudies(!showAllCaseStudies)}
                  >
                    {showAllCaseStudies ? 'Collapse All' : 'Expand All'}
                  </button>
                )}
              </div>
              
              {caseStudies.length > 0 ? (
                <div className="space-y-3">
                  {caseStudies.map((caseStudy, index) => renderCaseStudy(caseStudy, index))}
                </div>
              ) : (
                <div className="no-data">
                  No relevant case studies found
                </div>
              )}
            </div>
            
            {guidelines.length === 0 && caseStudies.length === 0 && (
              <div className="text-center mt-4">
                <button 
                  className="retry-button"
                  onClick={generateArtifacts}
                >
                  Generate Artifacts
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  No artifacts found. Click to generate new ones.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default KnowledgePanel; 