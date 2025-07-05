import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { getKnowledgeArtifacts, getConversationMessages } from '../services/api';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import './KnowledgePanel.css';
import { useStore } from '../store/useStore';

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
  onNewKnowledge?: () => void;
}

const KnowledgePanel: React.FC<KnowledgePanelProps> = ({ conversationId, isOpen, onClose, onNewKnowledge }) => {
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [givenUp, setGivenUp] = useState(false);
  const [expandedGuidelines, setExpandedGuidelines] = useState<Set<string>>(new Set());
  const [expandedCaseStudies, setExpandedCaseStudies] = useState<Set<string>>(new Set());
  const [showAllGuidelines, setShowAllGuidelines] = useState<boolean | null>(null);
  const [showAllCaseStudies, setShowAllCaseStudies] = useState<boolean | null>(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  
  const { messages } = useStore();
  const prevConversationIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const maxRetries = 2;
  const retryDelay = 3000;
  const maxAutoRefreshes = 2;
  const autoRefreshInterval = 10000;
  const initialDelay = 1000;

  const addDebugLog = useCallback((message: string) => {
    setDebugLog(prev => [...prev, `${new Date().toISOString().substr(11, 8)}: ${message}`]);
  }, []);

  const copyDebugToClipboard = useCallback(() => {
    const debugInfo = {
      conversationId,
      timestamp: new Date().toISOString(),
      logs: debugLog,
      guidelinesCount: guidelines.length,
      caseStudiesCount: caseStudies.length,
      retryCount,
      autoRefreshCount,
      error,
      messagesCount: messages.length
    };
    
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    addDebugLog("Debug info copied to clipboard");
  }, [conversationId, debugLog, guidelines.length, caseStudies.length, retryCount, autoRefreshCount, error, messages.length]);

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

  const isValidUuid = useCallback((id: string): boolean => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(id);
  }, []);

  const checkExistingArtifacts = useCallback((conversationId: string) => {
    try {
      console.log(`Checking for cached artifacts for ${conversationId}`);
      const cachedData = localStorage.getItem(`artifacts-${conversationId}`);
      if (cachedData) {
        const parsedCache = JSON.parse(cachedData);
        if (
          parsedCache &&
          Array.isArray(parsedCache.guidelines) && 
          Array.isArray(parsedCache.caseStudies)
        ) {
          console.log(`Found cached artifacts for ${conversationId}`);
          
          setGuidelines(parsedCache.guidelines || []);
          setCaseStudies(parsedCache.caseStudies || []);
          
          setExpandedGuidelines(new Set());
          setExpandedCaseStudies(new Set());
          
          if ((parsedCache.guidelines && parsedCache.guidelines.length > 0) || 
              (parsedCache.caseStudies && parsedCache.caseStudies.length > 0)) {
            setHasAttemptedFetch(true);
            setIsLoading(false);
            return true;
          }
        }
      } else {
        console.log(`No cached artifacts found for ${conversationId}`);
      }
      return false;
    } catch (error) {
      console.warn("Error checking cached artifacts", error);
      return false;
    }
  }, []);

  const resetState = useCallback(() => {
    setGuidelines([]);
    setCaseStudies([]);
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    setAutoRefreshCount(0);
    setGivenUp(false);
    setExpandedGuidelines(new Set());
    setExpandedCaseStudies(new Set());
    setShowAllGuidelines(null);
    setShowAllCaseStudies(null);
    setHasAttemptedFetch(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const fetchArtifacts = useCallback(async (skipCache: boolean = false) => {
    addDebugLog(`Fetch requested for ${conversationId}. Skip cache: ${skipCache}`);

    if (!conversationId || conversationId.startsWith('draft-') || !isValidUuid(conversationId)) {
      addDebugLog("Invalid or draft conversation ID, aborting fetch.");
      setError("Cannot fetch artifacts for this conversation.");
      setIsLoading(false);
      setGuidelines([]);
      setCaseStudies([]);
      return;
    }

    if (!skipCache) {
      const hasCachedData = checkExistingArtifacts(conversationId);
      if (hasCachedData) {
        addDebugLog("Using valid cached artifacts. Fetch cycle complete.");
        setIsLoading(false);
        setError(null);
        setHasAttemptedFetch(true);
        return;
      }
      addDebugLog("Cache empty or invalid, proceeding to network fetch.");
    }

    setIsLoading(true);
    setError(null);
    
    addDebugLog(`Starting artifact fetch for conversation ${conversationId}`);
    
    if (conversationId !== prevConversationIdRef.current) {
      addDebugLog("Conversation changed *before* network request. Aborting fetch for " + conversationId);
      setIsLoading(false);
      return;
    }
    
    try {
      addDebugLog(`Starting network fetch for conversation ${conversationId}`);
      const response = await getKnowledgeArtifacts(conversationId);
      
      if (conversationId !== prevConversationIdRef.current) {
        addDebugLog("Conversation changed *during* fetch, discarding results for " + conversationId);
        setIsLoading(false);
        return;
      }
      
      const guidelineCount = response.guidelines?.length || 0;
      const caseStudyCount = response.caseStudies?.length || 0;
      
      addDebugLog(`Fetch successful, received: guidelines=${guidelineCount}, caseStudies=${caseStudyCount}`);
      
      if (response) {
        setGuidelines(response.guidelines || []);
        setCaseStudies(response.caseStudies || []);
        
        setExpandedGuidelines(new Set());
        setExpandedCaseStudies(new Set());
        
        const debugData = {
          guidelineCount,
          caseStudyCount,
          conversationId,
          isUuid: isValidUuid(conversationId),
          timestamp: new Date().toISOString()
        };
        setDebugInfo(JSON.stringify(debugData, null, 2));
        
        setHasAttemptedFetch(true);
        setRetryCount(0);
        
        if (guidelineCount === 0 && caseStudyCount === 0) {
          addDebugLog("No artifacts found, waiting for generation to complete");
          
          setError("Artifacts are being generated. This may take a moment.");
          
          if (retryCount < maxRetries) {
            const nextRetryDelay = retryDelay * (retryCount + 1);
            addDebugLog(`Will retry in ${nextRetryDelay/1000} seconds (retry #${retryCount + 1})`);
            
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              fetchArtifacts(true);
            }, nextRetryDelay);
          } else {
            setIsLoading(false);
            setGivenUp(true);
          }
        } else {
          setIsLoading(false);
          setError(null);
          setGivenUp(false);
        }
      } else {
        addDebugLog("API returned null or undefined response");
        setGuidelines([]);
        setCaseStudies([]);
        setHasAttemptedFetch(true);
        setIsLoading(false);
        setError("Failed to load artifacts. Please try again.");
      }
    } catch (error) {
      setHasAttemptedFetch(true);
      setIsLoading(false);
      
      if (error instanceof Error) {
        addDebugLog(`Fetch error: ${error.message}`);
        setError(`Error loading artifacts: ${error.message}`);
      } else {
        addDebugLog(`Unknown fetch error`);
        setError("Failed to load artifacts. Please try again.");
      }
      
      if (retryCount < maxRetries) {
        const nextRetryDelay = retryDelay * (retryCount + 1);
        addDebugLog(`Will retry in ${nextRetryDelay/1000} seconds (retry #${retryCount + 1})`);
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchArtifacts(true);
        }, nextRetryDelay);
      } else {
        setGivenUp(true);
      }
    } finally {
      if (!error && !(retryCount < maxRetries)) {
        setIsLoading(false);
      }
      if (error && retryCount >= maxRetries) {
        setIsLoading(false);
      }
    }
  }, [conversationId, retryCount, maxRetries, retryDelay, checkExistingArtifacts, addDebugLog, isValidUuid]);

  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      if (prevConversationIdRef.current) {
        addDebugLog(`Conversation changed from ${prevConversationIdRef.current} to ${conversationId}`);
      }
      resetState();
      prevConversationIdRef.current = conversationId;
    }
  }, [conversationId, addDebugLog, resetState]);
  
  useEffect(() => {
    if (isOpen && conversationId && !conversationId.startsWith('draft-') && 
        guidelines.length === 0 && caseStudies.length === 0 && !isLoading && !error) {
      
      addDebugLog(`Triggering artifact fetch for ${conversationId} because panel is open and state is empty.`);
      
      setRetryCount(0);
      setGivenUp(false);
      
      const timer = setTimeout(() => {
        fetchArtifacts(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, conversationId, guidelines.length, caseStudies.length, isLoading, error, fetchArtifacts, addDebugLog]);
  
  useEffect(() => {
    if (!conversationId || !isOpen) return;
    if (autoRefreshCount >= maxAutoRefreshes) {
      addDebugLog(`Max auto-refreshes reached (${maxAutoRefreshes}).`);
      return;
    }

    const shouldAutoRefresh = guidelines.length === 0 && caseStudies.length === 0;
    if (shouldAutoRefresh) {
        const timer = setTimeout(() => {
            addDebugLog(`Auto-refreshing artifacts (${autoRefreshCount + 1}/${maxAutoRefreshes})`);
            setAutoRefreshCount(prev => prev + 1);
            fetchArtifacts(true);
        }, autoRefreshInterval);
        return () => clearTimeout(timer);
    }
  }, [isOpen, conversationId, guidelines.length, caseStudies.length, autoRefreshCount, maxAutoRefreshes, autoRefreshInterval, fetchArtifacts, givenUp, isLoading, error, addDebugLog]);

  useEffect(() => {
    if (showAllGuidelines === true) {
      const allIds = guidelines.map(g => g.id);
      setExpandedGuidelines(new Set(allIds));
    } else if (showAllGuidelines === false) {
      setExpandedGuidelines(new Set());
    }
  }, [showAllGuidelines, guidelines]);
  
  useEffect(() => {
    if (showAllCaseStudies === true) {
      const allIds = caseStudies.map(cs => cs.id);
      setExpandedCaseStudies(new Set(allIds));
    } else if (showAllCaseStudies === false) {
      setExpandedCaseStudies(new Set());
    }
  }, [showAllCaseStudies, caseStudies]);

  useEffect(() => {
    if (guidelines.length > 0 || caseStudies.length > 0) {
      if (onNewKnowledge) {
        onNewKnowledge();
      }
    }
  }, [guidelines.length, caseStudies.length, onNewKnowledge]);

  const truncateText = (text: string, maxLength: number = 250): string => {
    if (!text) return '';
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    return cleanedText.length > maxLength ? `${cleanedText.substring(0, maxLength)}...` : cleanedText;
  };

  const formatRelevance = (score: number): string => {
    return `${Math.round(score * 100)}%`;
  };

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
    <div className="knowledge-panel-container">
      <div className="knowledge-panel-header flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Knowledge Panel
        </h2>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
          <button
            onClick={() => fetchArtifacts(true)}
            className="p-1.5 text-gray-500 hover:text-blue-500 transition-colors"
            aria-label="Refresh knowledge artifacts"
            title="Refresh knowledge artifacts"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="hidden md:block p-1.5 text-gray-500 hover:text-red-500 transition-colors"
            aria-label="Close knowledge panel"
            title="Close knowledge panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6l-12 12"></path><path d="M6 6l12 12"></path></svg>
          </button>
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 flex justify-between items-center">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showDebug ? "Hide Debug Info" : "Show Debug Info"}
          </button>
          {showDebug && (
            <button 
              onClick={copyDebugToClipboard}
              className="text-xs text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
            >
              Copy Debug Info
            </button>
          )}
        </div>
      )}

      {showDebug && (
        <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono overflow-auto max-h-[200px]">
          <div className="mb-2">
            <strong>Conversation ID:</strong> {conversationId}
          </div>
          <div className="mb-2">
            <strong>Valid UUID:</strong> {isValidUuid(conversationId) ? "✅" : "❌"}
          </div>
          <div className="mb-2">
            <strong>Artifacts Count:</strong> {guidelines.length} guidelines, {caseStudies.length} case studies
          </div>
          <div className="mb-2">
            <strong>Retry Count:</strong> {retryCount}/{maxRetries}
          </div>
          <div>
            <strong>Log:</strong>
            <ul className="list-disc pl-4">
              {debugLog.slice(-10).map((log, i) => (
                <li key={i}>{log}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="knowledge-content overflow-y-auto max-h-[calc(100vh-10.5rem)] custom-scrollbar pr-1">
        {isLoading && !hasAttemptedFetch ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading knowledge artifacts...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            {error.includes("being generated") ? (
              <>
                <div className="loading-spinner"></div>
                <p className="generating-message">{error}</p>
                {retryCount > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Attempt {retryCount + 1} of {maxRetries + 1}
                  </p>
                )}
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                <p className="error-message">{error}</p>
                {givenUp ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Could not load artifacts after multiple retries.
                  </p>
                ) : (
                  <button 
                    className="retry-button"
                    onClick={() => {
                      setRetryCount(0);
                      setGivenUp(false);
                      fetchArtifacts(true);
                    }}
                    disabled={isLoading}
                  >
                    Retry
                  </button>
                )}
              </>
            )}
          </div>
        ) : guidelines.length === 0 && caseStudies.length === 0 ? (
          <div className="empty-state">
            <p className="text-center text-gray-500 dark:text-gray-400">
              No knowledge artifacts found for this conversation.
            </p>
            <button 
              className="refresh-button mt-4"
              onClick={() => fetchArtifacts(true)}
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>
        ) : (
          <>
            {guidelines.length > 0 && (
              <div className="guidelines-section">
                <h4 className="section-title flex justify-between items-center">
                  <span>Relevant Guidelines</span>
                  <button
                    onClick={() => setShowAllGuidelines(showAllGuidelines === null ? true : !showAllGuidelines)}
                    className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {showAllGuidelines ? 'Collapse All' : 'Expand All'}
                  </button>
                </h4>
                <div className="guidelines-list space-y-3">
                  {guidelines.map((guideline, index) => renderGuideline(guideline, index))}
                </div>
              </div>
            )}

            {caseStudies.length > 0 && (
              <div className="case-studies-section mt-6">
                <h4 className="section-title flex justify-between items-center">
                  <span>Relevant Case Studies</span>
                  <button
                    onClick={() => setShowAllCaseStudies(showAllCaseStudies === null ? true : !showAllCaseStudies)}
                    className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {showAllCaseStudies ? 'Collapse All' : 'Expand All'}
                  </button>
                </h4>
                <div className="case-studies-list space-y-3">
                  {caseStudies.map((caseStudy, index) => renderCaseStudy(caseStudy, index))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default KnowledgePanel; 