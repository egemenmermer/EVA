import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { getKnowledgeArtifacts, getConversationMessages, generateKnowledgeArtifacts } from '../services/api';
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
  const lastMessageRef = useRef<string | null>(null);

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

  const shouldGenerateForNewMessage = useCallback(() => {
    if (messages.length === 0) return false;
    
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.role !== 'user' || lastMessage.conversationId !== conversationId) {
      return false;
    }
    
    if (lastMessageRef.current !== lastMessage.content) {
      lastMessageRef.current = lastMessage.content;
      return true;
    }
    
    return false;
  }, [messages, conversationId]);

  const fetchArtifacts = useCallback(async (skipCache: boolean = false, forceGenerate: boolean = false) => {
    if (!conversationId) {
      console.log("No conversation ID provided, cannot fetch artifacts");
      setIsLoading(false);
      return;
    }

    console.log(`fetchArtifacts called for ${conversationId}, skipCache=${skipCache}, hasAttemptedFetch=${hasAttemptedFetch}`);

    if (hasAttemptedFetch && !skipCache && !forceGenerate) {
      console.log(`Already attempted fetch for ${conversationId}, not fetching again`);
      setIsLoading(false);
      return;
    }

    if (!skipCache && !forceGenerate && checkExistingArtifacts(conversationId)) {
      console.log(`Using cached artifacts for ${conversationId}`);
      return;
    }

    if (abortControllerRef.current) {
      console.log("Aborting previous fetch request");
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (forceGenerate || shouldGenerateForNewMessage()) {
        console.log(`Starting direct generation for conversation ${conversationId}`);
        response = await generateKnowledgeArtifacts(conversationId);
        addDebugLog(`Generated new artifacts directly for new message`);
      } else {
        console.log(`Starting network fetch for conversation ${conversationId}`);
        response = await getKnowledgeArtifacts(conversationId);
      }
      
      if (conversationId !== prevConversationIdRef.current) {
        console.log("Conversation changed during fetch, discarding results");
        return;
      }
      
      console.log(`Fetch successful, received: guidelines=${response.guidelines?.length || 0}, caseStudies=${response.caseStudies?.length || 0}`);
      
      if (response) {
        setGuidelines(response.guidelines || []);
        setCaseStudies(response.caseStudies || []);
        
        setExpandedGuidelines(new Set());
        setExpandedCaseStudies(new Set());
        
        const debugData = {
          guidelineCount: response.guidelines?.length || 0,
          caseStudyCount: response.caseStudies?.length || 0,
          conversationId,
          isUuid: isValidUuid(conversationId),
          timestamp: new Date().toISOString()
        };
        setDebugInfo(JSON.stringify(debugData, null, 2));
        
        setHasAttemptedFetch(true);
      }
    } catch (err) {
      console.error(`Error in fetchArtifacts for ${conversationId}:`, err);
      
      if (err instanceof DOMException && err.name === "AbortError") {
        console.log("Request was aborted");
        return;
      }
      
      setError("Failed to load guidelines and case studies");
      
      if (retryCount < maxRetries) {
        console.log(`Will retry in ${retryDelay}ms (retry ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, retryDelay);
      } else {
        setGivenUp(true);
      }
    } finally {
      console.log(`Fetch attempt complete, setting isLoading=false`);
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, hasAttemptedFetch, checkExistingArtifacts, retryCount, maxRetries, retryDelay, isValidUuid, prevConversationIdRef, shouldGenerateForNewMessage, addDebugLog]);

  const generateArtifacts = useCallback(async () => {
    if (!conversationId) return;
    
    console.log(`Manually generating artifacts for conversation ${conversationId}`);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);
    setGivenUp(false);
    
    try {
      const response = await generateKnowledgeArtifacts(conversationId);
      
      if (conversationId !== prevConversationIdRef.current) {
        console.log("Conversation changed during generation, discarding results");
        return;
      }
      
      console.log(`Generation successful, received: guidelines=${response.guidelines?.length || 0}, caseStudies=${response.caseStudies?.length || 0}`);
      
      setGuidelines(response.guidelines || []);
      setCaseStudies(response.caseStudies || []);
      
      setExpandedGuidelines(new Set());
      setExpandedCaseStudies(new Set());
      
      setHasAttemptedFetch(true);
    } catch (err) {
      console.error(`Error generating artifacts for ${conversationId}:`, err);
      
      if (err instanceof DOMException && err.name === "AbortError") {
        console.log("Generation request was aborted");
        return;
      }
      
      setError("Failed to generate guidelines and case studies");
    } finally {
      console.log("Generation attempt complete");
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, prevConversationIdRef]);

  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      if (prevConversationIdRef.current) {
        addDebugLog(`Conversation changed from ${prevConversationIdRef.current} to ${conversationId}`);
        resetState();
      }
      prevConversationIdRef.current = conversationId;
    }
  }, [conversationId, addDebugLog, resetState]);
  
  useEffect(() => {
    if (isOpen && conversationId) {
      const shouldLoadArtifacts = !hasAttemptedFetch || 
        (guidelines.length === 0 && caseStudies.length === 0);
      
      if (shouldLoadArtifacts) {
        console.log(`KnowledgePanel initializing for conversation: ${conversationId}`);
        setIsLoading(true);
      } else {
        console.log(`KnowledgePanel already has data for conversation: ${conversationId}`);
        setIsLoading(false);
      }
    }
  }, [conversationId, isOpen, hasAttemptedFetch, guidelines.length, caseStudies.length]);
  
  useEffect(() => {
    if (!conversationId) return;

    addDebugLog(`Setting up for conversation: ${conversationId}`);
    prevConversationIdRef.current = conversationId;
    
    resetState();
    
    if (!checkExistingArtifacts(conversationId)) {
      setIsLoading(true);
      
      const timer = setTimeout(() => {
        fetchArtifacts();
      }, initialDelay);
      
      return () => clearTimeout(timer);
    }
  }, [conversationId, fetchArtifacts, resetState, checkExistingArtifacts, addDebugLog, initialDelay]);
  
  useEffect(() => {
    if (!conversationId || !isOpen) return;
    if (autoRefreshCount >= maxAutoRefreshes) {
      addDebugLog(`Reached max auto refreshes (${maxAutoRefreshes}), stopping`);
      return;
    }
    
    const timer = setTimeout(() => {
      if (guidelines.length === 0 && caseStudies.length === 0 && !error && !givenUp) {
        addDebugLog(`Auto-refreshing artifacts (${autoRefreshCount + 1}/${maxAutoRefreshes})`);
        setAutoRefreshCount(prev => prev + 1);
        fetchArtifacts(true);
      }
    }, autoRefreshInterval);
    
    return () => clearTimeout(timer);
  }, [
    isOpen, conversationId, guidelines.length, caseStudies.length,
    autoRefreshCount, maxAutoRefreshes, autoRefreshInterval,
    fetchArtifacts, givenUp, addDebugLog, isValidUuid, error
  ]);

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

  // Notify parent when new knowledge is loaded
  useEffect(() => {
    // Check if we have meaningful content
    if (guidelines.length > 0 || caseStudies.length > 0) {
      // Notify parent component that we have new knowledge
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
          Relevant Guidelines
        </h2>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
          <button
            onClick={() => fetchArtifacts(true, true)}
            className="p-1.5 text-gray-500 hover:text-blue-500 transition-colors"
            aria-label="Refresh knowledge artifacts"
            title="Refresh knowledge artifacts"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {/* Close button (visible on desktop) */}
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

      {/* Debug info button - hidden in production */}
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

      {/* Debug log */}
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
                  onClick={() => generateArtifacts()}
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
                  fetchArtifacts(true, true);
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
                <h4>Relevant Guidelines</h4>
                {guidelines.length > 0 && (
                  <button 
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => setShowAllGuidelines(!showAllGuidelines)}
                  >
                    {showAllGuidelines === true ? 'Collapse All' : 'Expand All'}
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
                <h4>Relevant Case Studies</h4>
                {caseStudies.length > 0 && (
                  <button 
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => setShowAllCaseStudies(!showAllCaseStudies)}
                  >
                    {showAllCaseStudies === true ? 'Collapse All' : 'Expand All'}
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
                  onClick={() => generateArtifacts()}
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