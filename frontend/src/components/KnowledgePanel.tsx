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
    /*
    addDebugLog("Main useEffect triggered.");

    if (conversationId && conversationId !== prevConversationIdRef.current) {
      addDebugLog(`Conversation ID changed from ${prevConversationIdRef.current} to ${conversationId}`);
      resetState();
      prevConversationIdRef.current = conversationId;
    }
    
    if (isOpen && conversationId && !hasAttemptedFetch && !isLoading) {
      addDebugLog("Component is open, fetching artifacts for the first time.");
      setTimeout(() => fetchArtifacts(false), initialDelay);
    }
    */
  }, [conversationId, isOpen, hasAttemptedFetch, isLoading, resetState, fetchArtifacts, addDebugLog]);

  useEffect(() => {
    /*
    addDebugLog("Auto-refresh useEffect triggered.");
    if (
      isOpen &&
      hasAttemptedFetch && 
      !isLoading && 
      (guidelines.length === 0 && caseStudies.length === 0) &&
      autoRefreshCount < maxAutoRefreshes
    ) {
      const refreshTimer = setTimeout(() => {
        addDebugLog(`Auto-refreshing (attempt ${autoRefreshCount + 1})`);
        setAutoRefreshCount(prev => prev + 1);
        fetchArtifacts(true);
      }, autoRefreshInterval);

      return () => clearTimeout(refreshTimer);
    }
    */
  }, [
    isOpen, 
    hasAttemptedFetch, 
    guidelines.length, 
    caseStudies.length, 
    isLoading, 
    autoRefreshCount, 
    fetchArtifacts,
    addDebugLog
  ]);

  const handleManualRefresh = useCallback(() => {
    /*
    addDebugLog("Manual refresh triggered.");
    resetState();
    setTimeout(() => fetchArtifacts(true), 250);
    */
  }, [resetState, fetchArtifacts, addDebugLog]);

  // If the panel is not open, don't render anything
  if (!isOpen) {
    return null;
  }

  /*
  return (
    <aside className={`knowledge-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <h3 className="panel-title">Knowledge Artifacts</h3>
        <button onClick={onClose} className="close-button">
          &times;
        </button>
      </div>
      <div className="panel-content">
        {isLoading ? (
          <div className="loading-indicator">
            <Loader2 className="animate-spin" />
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <AlertCircle />
            <p>{error}</p>
            <button onClick={() => fetchArtifacts(true)}>Retry</button>
          </div>
        ) : (
          <>
            <section>
              <h4>Guidelines</h4>
              {guidelines.length > 0 ? (
                <ul>
                  {guidelines.map(g => <li key={g.id}>{g.title}</li>)}
                </ul>
              ) : <p>No guidelines found.</p>}
            </section>
            <section>
              <h4>Case Studies</h4>
              {caseStudies.length > 0 ? (
                <ul>
                  {caseStudies.map(cs => <li key={cs.id}>{cs.title}</li>)}
                </ul>
              ) : <p>No case studies found.</p>}
            </section>
          </>
        )}
      </div>
    </aside>
  );
  */
  return null;
};

export default KnowledgePanel;