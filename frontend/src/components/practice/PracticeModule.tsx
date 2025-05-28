import React, { useEffect, useState, useRef, useCallback } from 'react';
import api, { backendApi } from '../../services/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import './practice.css'; // Import the CSS file for animations
import { useStore } from '@/store/useStore'; // Import the global store

// Import manager icons
import puppeteerLightPng from '@/assets/manager-icons/puppeteer-manager-light.png';
import puppeteerDarkPng from '@/assets/manager-icons/puppeteer-manager-dark.png';
import diluterLightPng from '@/assets/manager-icons/diluter-manager-light.png';
import diluterDarkPng from '@/assets/manager-icons/diluter-manager-dark.png';
import camouflagerLightPng from '@/assets/manager-icons/camouflager-manager-light.png';
import camouflagerDarkPng from '@/assets/manager-icons/camouflager-manager-dark.png';

// SVG fallbacks if needed
import puppeteerLightSvg from '@/assets/manager-icons/puppeteer-manager-light.svg';
import puppeteerDarkSvg from '@/assets/manager-icons/puppeteer-manager-dark.svg';
import diluterLightSvg from '@/assets/manager-icons/diluter-manager-light.svg';
import diluterDarkSvg from '@/assets/manager-icons/diluter-manager-dark.svg';
import camouflagerLightSvg from '@/assets/manager-icons/camouflager-manager-light.svg';
import camouflagerDarkSvg from '@/assets/manager-icons/camouflager-manager-dark.svg';

// Add CSS for manager icons to ensure they're visible in both light and dark mode
import './manager-icons.css';

// New interfaces for the scenario API
interface ScenarioSessionResponse {
  sessionId: string;
  scenarioId: string;
  scenarioTitle: string;
  scenarioDescription: string;
  issue: string;
  managerType: string;
  currentStatementId: string;
  currentStatement: string;
  choices: Array<{
    index: number;
    text: string;
    category: string;
  }>;
  currentStep: number;
  isComplete: boolean;
}

interface ScenarioChoiceResponse {
  sessionId: string;
  scenarioId: string;
  nextStatementId?: string;
  nextStatement?: string;
  nextChoices?: Array<{
    index: number;
    text: string;
    category: string;
  }>;
  currentStep: number;
  evs: number;
  category: string;
  isComplete: boolean;
  sessionSummary?: {
    totalEvs: number;
    averageEvs: number;
    performanceLevel: string;
    tacticCounts: Record<string, number>;
    choiceHistory: string[];
    categoryHistory: string[];
    evsHistory: number[];
    scenarioTitle: string;
    issue: string;
    managerType: string;
  };
}

interface AvailableScenario {
  id: string;
  title: string;
  description: string;
  issue: string;
  managerType: string;
}

interface ScenarioSuggestion {
  scenarioId: string;
  issue: string;
  managerType: string;
}

interface BaseMessage {
  role: string;
  content: string;
  isTyping?: boolean;
}

interface FeedbackMessage extends BaseMessage {
  role: 'feedback';
  evs: number;
  category?: string;
}

interface UserMessage extends BaseMessage {
  role: 'user';
}

interface ManagerMessage extends BaseMessage {
  role: 'manager';
}

interface FinalEvaluationMessage extends BaseMessage {
  role: 'final_evaluation';
}

type Message = UserMessage | ManagerMessage | FeedbackMessage | FinalEvaluationMessage;

// Updated scenario interface for the new system
interface Scenario {
  id: string;
  title: string;
  description: string;
  issue: string;
  managerType: string;
}

interface ScenarioState {
  scenario: Scenario;
  sessionId: string;
  conversation: Message[];
  currentStatement: string | null;
  currentStatementId: string | null;
  currentChoices: Array<{
    index: number;
    text: string;
    category: string;
  }>;
  currentStep: number;
  isComplete: boolean;
  sessionSummary?: ScenarioChoiceResponse['sessionSummary'];
}

interface PracticeModuleProps {
  onExit?: () => void;
  onComplete?: (results: any) => void;
  scenarioId?: string | null;
  managerType?: string;
  userQuery?: string;
}

// Global singleton for practice module state management
class PracticeModuleSingleton {
  private static instance: PracticeModuleSingleton;
  public isInitializing: boolean = false;
  public isInitialized: boolean = false;
  private currentSessionId: string | null = null;
  private currentScenario: any = null;
  private lockKey = 'practice_module_lock';
  private sessionKey = 'practice_module_session';
  private addingMessage: boolean = false;
  private savingInProgress: Set<string> = new Set(); // Track saves in progress by sessionId
  
  static getInstance(): PracticeModuleSingleton {
    if (!PracticeModuleSingleton.instance) {
      PracticeModuleSingleton.instance = new PracticeModuleSingleton();
    }
    return PracticeModuleSingleton.instance;
  }
  
  acquireLock(componentId: string): boolean {
    const now = Date.now();
    const existingLock = localStorage.getItem(this.lockKey);
    
    if (existingLock) {
      const lockData = JSON.parse(existingLock);
      // If lock is older than 30 seconds, consider it stale
      if (now - lockData.timestamp < 30000) {
        console.log(`🔒 [${componentId}] Lock already held by ${lockData.componentId}`);
        return false;
      }
    }
    
    // Acquire lock
    localStorage.setItem(this.lockKey, JSON.stringify({
      componentId,
      timestamp: now
    }));
    
    console.log(`🔒 [${componentId}] Lock acquired`);
    return true;
  }
  
  releaseLock(componentId: string): void {
    const existingLock = localStorage.getItem(this.lockKey);
    if (existingLock) {
      const lockData = JSON.parse(existingLock);
      if (lockData.componentId === componentId) {
        localStorage.removeItem(this.lockKey);
        console.log(`🔒 [${componentId}] Lock released`);
      }
    }
  }
  
  canInitialize(componentId: string): boolean {
    if (this.isInitializing || this.isInitialized) {
      console.log(`🚫 [${componentId}] Cannot initialize - already initializing/initialized`);
      return false;
    }
    
    return this.acquireLock(componentId);
  }
  
  setInitializing(componentId: string): void {
    this.isInitializing = true;
    console.log(`⏳ [${componentId}] Setting initializing state`);
  }
  
  setInitialized(componentId: string, scenario: any): void {
    this.isInitialized = true;
    this.isInitializing = false;
    this.currentScenario = scenario;
    this.currentSessionId = scenario?.sessionId || null;
    
    // Persist to localStorage
    localStorage.setItem(this.sessionKey, JSON.stringify(scenario));
    console.log(`✅ [${componentId}] Initialization completed, session: ${this.currentSessionId}`);
  }
  
  getCurrentScenario(): any {
    if (this.currentScenario) {
      return this.currentScenario;
    }
    
    // Try to restore from localStorage
    const stored = localStorage.getItem(this.sessionKey);
    if (stored) {
      try {
        this.currentScenario = JSON.parse(stored);
        this.currentSessionId = this.currentScenario?.sessionId || null;
        this.isInitialized = true;
        console.log(`🔄 Restored scenario from localStorage: ${this.currentSessionId}`);
        return this.currentScenario;
      } catch (error) {
        console.error('Failed to restore scenario from localStorage:', error);
        localStorage.removeItem(this.sessionKey);
      }
    }
    
    return null;
  }
  
  updateScenario(scenario: any): void {
    this.currentScenario = scenario;
    localStorage.setItem(this.sessionKey, JSON.stringify(scenario));
  }
  
  reset(componentId: string): void {
    console.log(`🔄 [${componentId}] Resetting singleton state`);
    this.isInitializing = false;
    this.isInitialized = false;
    this.currentSessionId = null;
    this.currentScenario = null;
    this.addingMessage = false;
    this.savingInProgress.clear(); // Clear all save flags
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.lockKey);
  }
  
  isSessionActive(): boolean {
    return this.isInitialized && this.currentScenario !== null;
  }
  
  canAddMessage(componentId: string): boolean {
    if (this.addingMessage) {
      console.log(`🚫 [${componentId}] Message already being added`);
      return false;
    }
    this.addingMessage = true;
    return true;
  }
  
  finishAddingMessage(): void {
    this.addingMessage = false;
  }
  
  // New methods for save protection
  canSave(sessionId: string, componentId: string): boolean {
    if (this.savingInProgress.has(sessionId)) {
      console.log(`🚫 [${componentId}] Save already in progress for session: ${sessionId}`);
      return false;
    }
    
    // Check localStorage for completed saves
    const savedSessionKey = `saved_practice_session_${sessionId}`;
    if (localStorage.getItem(savedSessionKey)) {
      console.log(`🚫 [${componentId}] Session already saved: ${sessionId}`);
      return false;
    }
    
    this.savingInProgress.add(sessionId);
    console.log(`💾 [${componentId}] Starting save for session: ${sessionId}`);
    return true;
  }
  
  finishSave(sessionId: string, componentId: string, success: boolean): void {
    this.savingInProgress.delete(sessionId);
    if (success) {
      const savedSessionKey = `saved_practice_session_${sessionId}`;
      localStorage.setItem(savedSessionKey, 'true');
      console.log(`✅ [${componentId}] Save completed for session: ${sessionId}`);
    } else {
      console.log(`❌ [${componentId}] Save failed for session: ${sessionId}`);
    }
  }
}

// Helper function to get manager descriptions
const getManagerDescription = (managerType: string): string => {
  const normalizedManagerType = (managerType || '').toUpperCase().trim();
  
  switch(normalizedManagerType) {
    case 'PUPPETEER':
      return "This manager actively pressures employees to engage in unethical behavior through direct orders, intimidation, and creating environments where ethical violations feel necessary.";
    case 'DILUTER':
      return "This manager acknowledges ethical concerns but systematically minimizes their importance or urgency, suggesting they're not applicable in the current context.";
    case 'CAMOUFLAGER':
      return "This manager disguises unethical requests as standard business practices or hides problematic aspects behind technical language and euphemisms.";
    default:
      console.log(`Warning: Unknown manager type '${managerType}', normalized to '${normalizedManagerType}'`);
      return "This manager type focuses on making decisions that balance business needs with ethical considerations.";
  }
};

export const PracticeModule: React.FC<PracticeModuleProps> = ({ 
  onExit,
  onComplete,
  scenarioId,
  managerType,
  userQuery
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<ScenarioState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalReport, setFinalReport] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>('practice-' + Math.random().toString(36).substring(7));
  const [isTyping, setIsTyping] = useState(false);
  const [showFeedbackOptions, setShowFeedbackOptions] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState<any>(null);
  const [currentEVSFeedback, setCurrentEVSFeedback] = useState<{
    score: number;
    category: string;
    message: string;
    show: boolean;
  } | null>(null);
  const [processingChoice, setProcessingChoice] = useState(false);
  
  const { user, setManagerType: setGlobalManagerType } = useStore();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Error boundary-like error handling
  const [componentError, setComponentError] = useState<string | null>(null);
  
  // Use singleton for state management
  const practiceModule = PracticeModuleSingleton.getInstance();
  const componentInstanceId = useRef(`practice-${Date.now()}-${Math.random().toString(36).substring(7)}`);
  
  // Component registration and cleanup
  useEffect(() => {
    const instanceId = componentInstanceId.current;
    console.log(`🎯 Practice component ${instanceId.substring(0, 12)} mounted`);
    
    // Clear any stale localStorage data on mount
    localStorage.removeItem('practice_module_lock');
    localStorage.removeItem('practice_module_session');
    localStorage.removeItem('current_practice_session');
    console.log(`🧹 [${instanceId.substring(0, 12)}] Cleared stale localStorage data`);
    
    return () => {
      console.log(`🎯 Practice component ${instanceId.substring(0, 12)} unmounting`);
      practiceModule.releaseLock(instanceId);
    };
  }, []);

  // Initialize scenario or restore existing one
  useEffect(() => {
    const instanceId = componentInstanceId.current;
    
    // Try to restore existing scenario first
    const existingScenario = practiceModule.getCurrentScenario();
    if (existingScenario && practiceModule.isSessionActive()) {
      console.log(`🔄 [${instanceId.substring(0, 12)}] Restoring existing scenario`);
      setCurrentScenario(existingScenario);
      return;
    }
    
    // Only initialize if we can acquire the lock
    if (practiceModule.canInitialize(instanceId)) {
      loadAndStartScenario();
    } else {
      console.log(`🚫 [${instanceId.substring(0, 12)}] Cannot initialize - blocked by singleton`);
    }
  }, []); // Empty dependency array to run only once

  // Catch any runtime errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Practice Module Error:', event.error);
      setComponentError('An error occurred in the practice module. Please refresh and try again.');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // If there's a component error, show error state
  if (componentError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="text-red-500 mb-4">⚠️ {componentError}</div>
        <button
          onClick={() => {
            setComponentError(null);
            window.location.reload();
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  // Get original conversation ID from localStorage or props
  const originalConversationId = useRef<string | null>(
    localStorage.getItem('originalConversationId')
  );
  
  // Check if dark mode is enabled
  useEffect(() => {
    const checkDarkMode = () => {
      const htmlElement = document.documentElement;
      const hasDarkClass = htmlElement.classList.contains('dark');
      setIsDarkMode(hasDarkClass);
    };
    
    checkDarkMode();
    
    const darkModeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkDarkMode();
        }
      });
    });
    
    darkModeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (!document.documentElement.classList.contains('dark') && e.matches) {
        setIsDarkMode(true);
      }
    };
    
    darkModeMediaQuery.addEventListener('change', handleMediaChange);
    
    return () => {
      darkModeObserver.disconnect();
      darkModeMediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  // Load available scenarios and auto-start one with singleton protection
  const loadAndStartScenario = async () => {
    const instanceId = componentInstanceId.current;
    
    try {
      practiceModule.setInitializing(instanceId);
      setLoading(true);
      
      console.log(`🎯 [${instanceId.substring(0, 12)}] Starting scenario initialization...`);
      
      // If a specific scenario was requested, start it directly
      if (scenarioId) {
        console.log(`🎯 [${instanceId.substring(0, 12)}] Using specific scenario:`, scenarioId);
        const response = await backendApi.get<AvailableScenario[]>('/api/v1/scenarios');
        const scenarioData = response.data || [];
        const requestedScenario = scenarioData.find(s => s.id === scenarioId);
        if (requestedScenario) {
          await startNewScenario(requestedScenario);
          return;
        }
      }
      
      // If user query is provided, suggest a scenario
      if (userQuery) {
        console.log(`🎯 [${instanceId.substring(0, 12)}] Using user query:`, userQuery);
        await suggestScenarioFromQuery(userQuery);
        return;
      }
      
      // Default: auto-suggest based on a default privacy query
      const defaultQuery = "I'm concerned about collecting user location data unnecessarily";
      console.log(`🎯 [${instanceId.substring(0, 12)}] Using default query`);
      await suggestScenarioFromQuery(defaultQuery);
      
    } catch (error) {
      console.error(`🎯 [${instanceId.substring(0, 12)}] Error during initialization:`, error);
      setError('Failed to start practice scenario. Please try again.');
      
      // Reset singleton on error
      practiceModule.reset(instanceId);
    } finally {
      setLoading(false);
      console.log(`🎯 [${instanceId.substring(0, 12)}] Initialization completed`);
    }
  };

  // Suggest scenario based on user query with singleton protection
  const suggestScenarioFromQuery = async (query: string) => {
    const instanceId = componentInstanceId.current;
    console.log(`🎯 [${instanceId.substring(0, 12)}] Suggesting scenario from query:`, query);
    
    try {
      console.log(`🎯 [${instanceId.substring(0, 12)}] Making GET request to /api/v1/scenarios/suggest with userQuery:`, query);
      
      const response = await backendApi.get<ScenarioSuggestion>('/api/v1/scenarios/suggest', {
        params: {
          userQuery: query
        }
      });

      console.log(`🎯 [${instanceId.substring(0, 12)}] Scenario suggestion response:`, response.data);

      if (response.data) {
        const { scenarioId, issue, managerType: suggestedManagerType } = response.data;
        
        console.log(`🎯 [${instanceId.substring(0, 12)}] Suggested scenario:`, scenarioId, 'Manager type:', suggestedManagerType);
        
        // Generate a unique session ID
        const sessionId = `practice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🎯 [${instanceId.substring(0, 12)}] Generated session ID:`, sessionId);
        
        console.log(`🎯 [${instanceId.substring(0, 12)}] Starting scenario with POST to /api/v1/scenarios/${scenarioId}/start`);
        
        const sessionResponse = await backendApi.post<ScenarioSessionResponse>(`/api/v1/scenarios/${scenarioId}/start`, {
          sessionId: sessionId
        });

        console.log(`🎯 [${instanceId.substring(0, 12)}] Scenario start response:`, sessionResponse.data);

        if (sessionResponse.data) {
          const newScenario: ScenarioState = {
            scenario: {
              id: sessionResponse.data.scenarioId,
              title: sessionResponse.data.scenarioTitle,
              description: sessionResponse.data.scenarioDescription,
              issue: sessionResponse.data.issue,
              managerType: sessionResponse.data.managerType
            },
            sessionId: sessionResponse.data.sessionId,
            conversation: [
              {
                role: 'manager',
                content: sessionResponse.data.currentStatement,
                isTyping: false
              } as ManagerMessage
            ],
            currentStatement: sessionResponse.data.currentStatement,
            currentStatementId: sessionResponse.data.currentStatementId,
            currentChoices: sessionResponse.data.choices,
            currentStep: sessionResponse.data.currentStep,
            isComplete: sessionResponse.data.isComplete
          };
          
          setCurrentScenario(newScenario);
          
          // Store in singleton and persist to localStorage
          practiceModule.setInitialized(instanceId, newScenario);
          
          console.log(`🎯 [${instanceId.substring(0, 12)}] Successfully started scenario:`, sessionResponse.data.scenarioTitle);
        }
      }
    } catch (error: any) {
      console.error(`🎯 [${instanceId.substring(0, 12)}] Error suggesting scenario:`, error);
      
      // Enhanced error logging
      if (error.response) {
        console.error(`🎯 [${instanceId.substring(0, 12)}] Response error:`, {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error(`🎯 [${instanceId.substring(0, 12)}] Request error:`, error.request);
      } else {
        console.error(`🎯 [${instanceId.substring(0, 12)}] General error:`, error.message);
      }
      
      setError('Failed to suggest scenario. Please try again.');
    }
  };

  // Start a specific scenario with singleton protection
  const startNewScenario = async (scenario: AvailableScenario) => {
    const instanceId = componentInstanceId.current;
    console.log(`🎯 [${instanceId.substring(0, 12)}] Starting specific scenario:`, scenario.id);
    
    try {
      // Generate a unique session ID
      const sessionId = `practice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await backendApi.post<ScenarioSessionResponse>(`/api/v1/scenarios/${scenario.id}/start`, {
        sessionId: sessionId
      });

      if (response.data) {
        const newScenario: ScenarioState = {
          scenario: {
            id: response.data.scenarioId,
            title: response.data.scenarioTitle,
            description: response.data.scenarioDescription,
            issue: response.data.issue,
            managerType: response.data.managerType
          },
          sessionId: response.data.sessionId,
          conversation: [
            {
              role: 'manager',
              content: response.data.currentStatement,
              isTyping: false
            } as ManagerMessage
          ],
          currentStatement: response.data.currentStatement,
          currentStatementId: response.data.currentStatementId,
          currentChoices: response.data.choices,
          currentStep: response.data.currentStep,
          isComplete: response.data.isComplete
        };
        
        setCurrentScenario(newScenario);
        
        // Store in singleton and persist to localStorage
        practiceModule.setInitialized(instanceId, newScenario);
        
        console.log(`🎯 [${instanceId.substring(0, 12)}] Successfully started scenario:`, response.data.scenarioTitle);
      }
    } catch (error) {
      console.error(`🎯 [${instanceId.substring(0, 12)}] Error starting scenario:`, error);
      setError('Failed to start scenario. Please try again.');
    }
  };

  // Get manager icon based on type
  const getManagerIcon = (managerType: string | undefined, isDarkMode: boolean = false) => {
    const normalizedManagerType = (managerType || '').toUpperCase().trim();
    
    switch(normalizedManagerType) {
      case 'PUPPETEER':
        return isDarkMode ? puppeteerDarkPng : puppeteerLightPng;
      case 'DILUTER':
        return isDarkMode ? diluterDarkPng : diluterLightPng;
      case 'CAMOUFLAGER':
        return isDarkMode ? camouflagerDarkPng : camouflagerLightPng;
      default:
        return isDarkMode ? puppeteerDarkPng : puppeteerLightPng;
    }
  };

  // Get message styling based on role (simplified for new design)
  const getMessageBubbleStyle = (role: string) => {
    switch(role) {
      case 'manager':
        return 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800';
      case 'user':
        return 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700';
    }
  };

  // Return to main chat interface and clean up singleton state
  const handleReturnToChat = () => {
    const instanceId = componentInstanceId.current;
    
    console.log(`🎯 [${instanceId.substring(0, 12)}] Returning to chat, cleaning up state`);
    
    // Clean up singleton state
    practiceModule.reset(instanceId);
    
    console.log(`🎯 [${instanceId.substring(0, 12)}] Singleton state and localStorage cleaned up`);
    
    if (onExit) {
      onExit();
    } else {
      // Navigate back to original conversation if available
      if (originalConversationId.current) {
        localStorage.setItem('currentConversationId', originalConversationId.current);
        navigate(`/dashboard/${originalConversationId.current}`);
      } else {
        navigate('/dashboard');
      }
    }
  };

  // Handle user choice selection
  const handleChoice = async (choiceIndex: number) => {
    if (!currentScenario || processingChoice) return;
    
    try {
      setProcessingChoice(true);
      console.log(`Processing choice ${choiceIndex} for scenario ${currentScenario.scenario.id}`);
      
      // Process the choice with backend FIRST to get the response
      const response = await backendApi.post<ScenarioChoiceResponse>(
        `/api/v1/scenarios/${currentScenario.scenario.id}/next`,
        {
          sessionId: currentScenario.sessionId,
          choiceIndex,
          currentStatementId: currentScenario.currentStatementId
        }
      );
      
      // NOW add user's choice to conversation after successful API call
      const userChoice = currentScenario.currentChoices[choiceIndex];
      const userMessage: UserMessage = {
        role: 'user',
        content: userChoice.text
      };
      
      // Show animated EVS feedback
      showEVSFeedback(response.data.evs, response.data.category);
      
      // Check if scenario should be completed (either backend says so, or we've made 5+ choices)
      const shouldComplete = response.data.isComplete || (currentScenario.conversation.length >= 8); // 8 = ~4 conversation pairs + user choice
      
      if (shouldComplete) {
        // Scenario is complete - add user message and finalize
        setCurrentScenario(prev => {
          if (!prev) return null;
          
          const updatedScenario = {
            ...prev,
            conversation: [...prev.conversation, userMessage],
            isComplete: true,
            currentChoices: [], // Clear choices when complete
            sessionSummary: response.data.sessionSummary || {
              totalEvs: response.data.evs || 75,
              averageEvs: response.data.evs || 75,
              performanceLevel: 'Good',
              tacticCounts: { [response.data.category || 'Mixed']: 1 },
              choiceHistory: [userChoice.text],
              categoryHistory: [response.data.category || 'Mixed'],
              evsHistory: [response.data.evs || 75],
              scenarioTitle: prev.scenario.title,
              issue: prev.scenario.issue,
              managerType: prev.scenario.managerType
            }
          };
          
          // Save practice session data immediately with the updated conversation
          setTimeout(async () => {
            const allUserChoices = updatedScenario.conversation
              .filter(msg => msg.role === 'user')
              .map(msg => msg.content);
            
            console.log(`💾 Final save: ${allUserChoices.length} user choices:`, allUserChoices);
            await savePracticeSessionData(updatedScenario.sessionSummary, allUserChoices);
          }, 200);
          
          return updatedScenario;
        });
        
        setFinalReport(true);
        setFinalScore(response.data.sessionSummary?.averageEvs || response.data.evs || 75);
        setShowFeedbackOptions(true);
        setProcessingChoice(false); // Reset processing state immediately
        
        console.log('✅ Scenario completed!');
        console.log('📊 Session summary:', response.data.sessionSummary);
        
        // DO NOT add extra completion message - the scenario is already complete
        
        } else {
        // Continue to next step - add user message and update scenario state
        // DON'T clear choices here - keep them visible but disabled during manager response
        setCurrentScenario(prev => prev ? {
          ...prev,
          conversation: [...prev.conversation, userMessage],
          currentStatement: response.data.nextStatement,
          currentStatementId: response.data.nextStatementId,
          currentStep: response.data.currentStep
          // Keep currentChoices as they are - don't clear them
        } : null);
        
        // Add manager's next message with typing animation
        if (response.data.nextStatement) {
          await addManagerMessageWithTyping(response.data.nextStatement);
          
          // After manager finishes typing, update with new choices
          setCurrentScenario(prev => prev ? {
            ...prev,
            currentChoices: response.data.nextChoices || []
          } : null);
        }
        setProcessingChoice(false);
      }
      
    } catch (error) {
      console.error('Error processing choice:', error);
      setError('Failed to process your choice. Please try again.');
      setProcessingChoice(false);
    }
  };

  // Save practice session data to database with singleton protection
  const savePracticeSessionData = async (sessionSummary: any, userChoicesOverride?: string[]) => {
    try {
      if (!user || !currentScenario) {
        console.log(`🎯 [${componentInstanceId.current.substring(0, 12)}] Cannot save - missing user or scenario`);
        return false;
      }
      
      const instanceId = componentInstanceId.current;
      const sessionId = currentScenario.sessionId;
      
      // Use singleton to check if we can save (prevents race conditions)
      if (!practiceModule.canSave(sessionId, instanceId.substring(0, 12))) {
        return true; // Return true because it's already saved or being saved
      }
      
      try {
        // Get full conversation data for local storage/debugging
        const conversationData = currentScenario.conversation.map((msg, index) => ({
          stepNumber: index + 1,
          role: msg.role,
          content: msg.content
        }));
        
        // Collect ALL user choices from the conversation (not just 4)
        const allUserChoices = userChoicesOverride || currentScenario.conversation
          .filter(msg => msg.role === 'user')
          .map(msg => msg.content);
        
        console.log(`🎯 [${instanceId.substring(0, 12)}] Saving ${allUserChoices.length} user choices:`, allUserChoices);
        
        // Exactly match PracticeSessionRequestDTO structure
        const practiceData = {
          userId: user.id,
          managerType: currentScenario.scenario.managerType,
          scenarioId: currentScenario.scenario.id,
          selectedChoices: allUserChoices, // This should contain ALL user choices
          timestamp: new Date().toISOString(),
          score: Math.round(sessionSummary?.averageEvs || 0)
        };
        
        console.log(`🎯 [${instanceId.substring(0, 12)}] Saving practice session with exact DTO format:`, practiceData);
        
        // The token should already be included by the axios interceptor
        const response = await backendApi.post('/api/v1/practice/save', practiceData);
        console.log(`🎯 [${instanceId.substring(0, 12)}] Practice session saved successfully:`, response.data);
        
        // Store the full data locally for debugging and admin panel 
        localStorage.setItem('practice_detailed_data', JSON.stringify({
          sessionId: currentScenario.sessionId,
          conversationData,
          allUserChoices, // Store all choices for verification
          sessionSummary,
          scenarioData: {
            title: currentScenario.scenario.title,
            issue: currentScenario.scenario.issue,
            managerType: currentScenario.scenario.managerType
          },
          score: practiceData.score
        }));
        
        // Mark save as successful in singleton
        practiceModule.finishSave(sessionId, instanceId.substring(0, 12), true);
        return true;
        
      } catch (error: any) {
        console.error(`🎯 [${instanceId.substring(0, 12)}] Error saving practice session:`, error);
        if (error.response) {
          console.error(`🎯 [${instanceId.substring(0, 12)}] Response status:`, error.response.status);
          console.error(`🎯 [${instanceId.substring(0, 12)}] Response data:`, error.response.data);
        }
        
        // Save data locally as backup
        localStorage.setItem('practice_session_backup', JSON.stringify({
          timestamp: new Date().toISOString(),
          data: currentScenario,
          sessionSummary,
          error: error?.message || 'Unknown error'
        }));
        
        // Mark save as failed in singleton
        practiceModule.finishSave(sessionId, instanceId.substring(0, 12), false);
        return false;
      }
      
    } catch (error: any) {
      const instanceId = componentInstanceId.current;
      console.error(`🎯 [${instanceId.substring(0, 12)}] Unexpected error in save function:`, error);
      return false;
    }
  };

  const handlePracticeAgain = async () => {
    const instanceId = componentInstanceId.current;
    console.log(`🎯 [${instanceId.substring(0, 12)}] Starting new practice session`);
    
    // Clear any existing session-specific flags from localStorage
    if (currentScenario) {
      const sessionId = currentScenario.sessionId;
      localStorage.removeItem(`saved_practice_session_${sessionId}`);
      localStorage.removeItem(`feedback_requested_${sessionId}`);
      console.log(`🎯 [${instanceId.substring(0, 12)}] Cleared previous session flags`);
    }
    
    // Reset global state completely
    practiceModule.reset(instanceId);
    
    // Reset all local states and initialization flags
    setCurrentScenario(null);
    setFinalReport(false);
    setShowOptions(false);
    setShowFeedbackOptions(false);
    setSessionFeedback(null);
    setFinalScore(0);
    setProcessingChoice(false);
    setCurrentEVSFeedback(null);
    setIsTyping(false);
    setError(null);
    setLoading(false);
    
    // Generate a new conversation ID to ensure clean state
    setConversationId('practice-' + Math.random().toString(36).substring(7));
    
    console.log(`🎯 [${instanceId.substring(0, 12)}] All state reset, starting new scenario`);
    
    // Start new scenario after a small delay to ensure clean state
    setTimeout(() => {
      loadAndStartScenario();
    }, 100);
  };

  const handleGetFeedbackFromEVA = async () => {
    if (!currentScenario) return;
    
    // Check if feedback is already in progress to prevent duplicate requests
    if (loading) {
      console.log('Feedback request already in progress, ignoring duplicate request');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Getting feedback from EVA for session:', currentScenario.sessionId);
      
      // Get the original conversation ID we returned from
      const originalConversationId = localStorage.getItem('originalConversationId');
      
      // Use a flag to track if we've already requested feedback for this session
      const feedbackRequestedKey = `feedback_requested_${currentScenario.sessionId}`;
      const feedbackRequested = localStorage.getItem(feedbackRequestedKey);
      
      if (feedbackRequested) {
        console.log('Feedback already requested for this session, not duplicating request');
        setLoading(false);
        return;
      }
      
      // Mark that we've requested feedback for this session
      localStorage.setItem(feedbackRequestedKey, 'true');
      
      if (originalConversationId) {
        // Set up practice to chat integration
        localStorage.setItem('practice_to_chat', 'true');
        localStorage.setItem('practice_feedback_simple', `I just completed a practice scenario about ${currentScenario.scenario.issue.toLowerCase()} with a ${currentScenario.scenario.managerType.toLowerCase()} manager. My ethical decision-making score was ${Math.round(currentScenario.sessionSummary?.averageEvs || 0)}/100. Can you provide detailed feedback on my performance?`);
        
        // Store detailed practice data for the backend
        const detailedPrompt = `
Please analyze this practice session using the EVA Tactic Taxonomy framework:

**Scenario Details:**
- Title: ${currentScenario.scenario.title}
- Issue: ${currentScenario.scenario.issue}
- Manager Type: ${currentScenario.scenario.managerType}

**Performance Summary:**
- Overall Score: ${Math.round(currentScenario.sessionSummary?.averageEvs || 0)}/100
- Performance Level: ${currentScenario.sessionSummary?.performanceLevel}
- Total Decisions: ${currentScenario.sessionSummary?.choiceHistory.length}

**Decision Patterns:**
${Object.entries(currentScenario.sessionSummary?.tacticCounts || {})
  .map(([tactic, count]: [string, any]) => `- ${tactic}: ${count} times`)
  .join('\n')}

**Choice History:**
${currentScenario.sessionSummary?.choiceHistory.map((choice, index) => 
  `${index + 1}. ${choice} (Category: ${currentScenario.sessionSummary?.categoryHistory[index]}, EVS: ${currentScenario.sessionSummary?.evsHistory[index]})`
).join('\n')}

**Detailed Conversation Flow:**
${currentScenario.conversation.map((msg, index) => {
  if (msg.role === 'manager') {
    return `Manager: ${msg.content}`;
  } else if (msg.role === 'user') {
    return `Your Choice: ${msg.content}`;
  }
  return '';
}).filter(msg => msg).join('\n\n')}

**EVA Tactic Taxonomy Reference:**

🟡 **Soft Resistance Tactics (12)** - Subtle strategies to redirect, delay, or ethically influence:
1. **Shifting Scope** - Narrowing or broadening the focus to more ethical alternatives
2. **Delaying** - Postponing decisions to gather information or build consensus
3. **Documenting Dissent** - Creating formal records of ethical concerns
4. **Reframing** - Presenting issues from different ethical perspectives
5. **Making It Visible** - Bringing transparency to hidden or obscured practices
6. **Asking Questions** - Using inquiry to expose ethical problems
7. **Creating Alternatives** - Proposing ethical solutions and options
8. **Constructing Hypothetical Scenarios** - Using "what if" examples to illustrate risks
9. **Emphasizing Harm or Risk** - Highlighting potential negative consequences
10. **Withholding Full Implementation** - Partial compliance while maintaining ethical boundaries
11. **Evoking Empathy** - Appealing to understanding of affected users/stakeholders
12. **Presenting User Data** - Using evidence to support ethical positions

🔵 **Rhetorical Tactics (12)** - Overt persuasive strategies:
1. **Appealing to Organizational Values** - Referencing company mission, values, and culture
2. **Citing Institutional Authority** - Leveraging organizational hierarchy and established policies
3. **Referencing Laws or Regulations** - Invoking legal requirements and compliance obligations
4. **Referencing Best Practices** - Citing industry standards and recognized approaches
5. **Appealing to External Standards** - Referencing professional ethics and external guidelines
6. **Personal Moral Appeals** - Standing on individual ethical principles and integrity

Please provide detailed feedback in the following format:

**Summary of Feedback**
[Brief overview of performance and key insights about their ethical decision-making patterns]

**Detailed Feedback**

### 💪 Strengths
[What they did well in their ethical decision-making, specifically referencing which tactics they used effectively]

### 📈 Areas for Improvement  
[Specific areas where they could improve their ethical reasoning, suggesting underutilized tactics from the taxonomy]

### 🧠 Reasoning Process
[Analysis of their decision-making patterns and thought processes, categorized by soft resistance vs rhetorical approaches]

### 🛠️ Practical Advice
[Concrete recommendations for future similar situations, suggesting specific tactics from the EVA taxonomy that would be most effective for this type of scenario and manager]
        `;
        
        localStorage.setItem('practice_feedback_prompt', detailedPrompt);
        localStorage.setItem('force_conversation_id', originalConversationId);
        
        console.log('Practice feedback integration set up, navigating to chat...');
        
        // Navigate back to the main chat
        if (onExit) {
          onExit();
        } else {
          window.location.href = '/';
        }
        
      } else {
        // Fallback: try to get feedback directly 
        const response = await backendApi.get<any>(
          `/api/v1/scenarios/${currentScenario.scenario.id}/feedback`,
          {
            params: { sessionId: currentScenario.sessionId }
          }
        );
        
        setSessionFeedback(response.data);
        setShowFeedbackOptions(false);
        
        // Add EVA feedback message
        if (currentScenario) {
          setCurrentScenario(prev => prev ? {
            ...prev,
            conversation: [
              ...prev.conversation,
              {
                role: 'final_evaluation',
                content: `🎯 **Performance Analysis**\n\n` +
                        `**Overall Score**: ${response.data.averageEvs?.toFixed(1)}/100 (${response.data.performanceLevel})\n\n` +
                        `**Decision Patterns**:\n${Object.entries(response.data.tacticCounts || {})
                          .map(([tactic, count]: [string, any]) => `• ${tactic}: ${count} times`)
                          .join('\n')}\n\n` +
                        `**Key Insights**: Your choices show ${response.data.performanceLevel.toLowerCase()} ethical decision-making. ` +
                        `Focus on balancing ${response.data.issue.toLowerCase()} concerns with business objectives.`
              } as FinalEvaluationMessage
            ]
          } : null);
        }
      }
      
    } catch (error) {
      console.error('Error getting feedback from EVA:', error);
      setError('Failed to get feedback from EVA. Please try again.');
      
      // Clear the feedback requested flag on error so the user can try again
      const feedbackRequestedKey = `feedback_requested_${currentScenario.sessionId}`;
      localStorage.removeItem(feedbackRequestedKey);
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom when conversation changes
  useEffect(() => {
    scrollToBottom();
  }, [currentScenario?.conversation, isTyping]);

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Add manager message with typing effect and singleton protection
  const addManagerMessageWithTyping = async (content: string) => {
    const instanceId = componentInstanceId.current;
    
    // Prevent duplicate message additions using singleton
    if (!practiceModule.canAddMessage(instanceId)) {
      return;
    }
    
    setIsTyping(true);
    
    try {
      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      
      // Add the manager message to conversation
      setCurrentScenario(prev => prev ? {
        ...prev,
        conversation: [
          ...prev.conversation,
          {
            role: 'manager',
            content: content,
            isTyping: false
          } as ManagerMessage
        ]
      } : null);
      
      // Also update singleton
      const updatedScenario = practiceModule.getCurrentScenario();
      if (updatedScenario) {
        updatedScenario.conversation.push({
          role: 'manager',
          content: content,
          isTyping: false
        });
        practiceModule.updateScenario(updatedScenario);
      }
      
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsTyping(false);
      practiceModule.finishAddingMessage();
    }
  };

  // Generate encouraging message based on EVS score
  const getEncouragingMessage = (score: number, category: string): string => {
    if (score >= 80) {
      return "🎉 Excellent! You made a highly ethical choice!";
    } else if (score >= 60) {
      return "👍 Good decision! You balanced ethics well.";
    } else if (score >= 40) {
      return "⚖️ Fair approach, but consider the ethical implications.";
    } else if (score >= 20) {
      return "🤔 You could have done better. Think about ethics.";
    } else {
      return "💭 Consider the ethical impact of your choices.";
    }
  };

  // Show EVS feedback with animation
  const showEVSFeedback = (score: number, category: string) => {
    const message = getEncouragingMessage(score, category);
    setCurrentEVSFeedback({ score, category, message, show: true });
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setCurrentEVSFeedback(prev => prev ? { ...prev, show: false } : null);
    }, 4000);
    
    // Clear after animation completes
    setTimeout(() => {
      setCurrentEVSFeedback(null);
    }, 4500);
  };

  // Safe scenario rendering with error handling
  try {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-900 relative overflow-hidden">
        {loading && !currentScenario && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="mb-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-center">
              {userQuery ? 'Finding the perfect scenario for you...' : 'Loading practice scenario...'}
            </p>
          </div>
        )}

        {error && !currentScenario && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-red-500 mb-4">⚠️ {error}</div>
            <button
              onClick={loadAndStartScenario}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {currentScenario && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Scenario Header */}
            <div className="bg-white dark:bg-gray-900 p-3 shadow-sm border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <img 
                    src={getManagerIcon(currentScenario.scenario?.managerType, isDarkMode)} 
                    alt="Manager"
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                      {currentScenario.scenario?.title || 'Practice Scenario'}
                    </h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {getManagerDescription(currentScenario.scenario?.managerType || '')}
                    </p>
                  </div>
                </div>
                {onExit && (
                  <button
                    onClick={handleReturnToChat}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">Issue:</span> {currentScenario.scenario?.issue || 'Unknown'}
                <span className="mx-2">•</span>
                <span className="font-medium">Step:</span> {currentScenario.currentStep || 1}
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {currentScenario.conversation.map((message: Message, index: number) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} items-start space-x-1`}>
                  {/* Manager Icon - Bigger and closer to message */}
                  {message.role === 'manager' && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 p-1.5 shadow-md">
                        <img 
                          src={getManagerIcon(currentScenario.scenario?.managerType, isDarkMode)} 
                          alt="Manager"
                          className="w-full h-full object-contain rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`flex flex-col max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* Speaker Label */}
                    <div className={`text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 px-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                      {message.role === 'user' ? 'You' : 
                       message.role === 'manager' ? 'Manager' : 
                       message.role === 'feedback' ? 'Feedback' : 'Evaluation'}
                    </div>

                    {/* Message Content with smooth corners */}
                    <div className={`px-4 py-3 shadow-sm text-gray-800 dark:text-gray-200 ${getMessageBubbleStyle(message.role)} ${
                      message.role === 'manager' 
                        ? 'rounded-2xl rounded-tl-md' 
                        : 'rounded-2xl rounded-tr-md'
                    }`}>
                      <div className="text-sm leading-relaxed">{message.content}</div>
                      
                      {/* EVS Score for feedback messages */}
                      {message.role === 'feedback' && 'evs' in message && (
                        <div className={`mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-600/50 text-xs flex items-center justify-between`}>
                          <span className="font-medium">Choice EVS:</span>
                          <span className={`font-bold ${
                            message.evs >= 70 ? 'text-green-600 dark:text-green-400' : 
                            message.evs >= 40 ? 'text-yellow-600 dark:text-yellow-400' : 
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {message.evs}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Avatar - Bigger and closer to message */}
                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center text-white text-base font-bold shadow-md">
                        E
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Indicator with bigger manager icon */}
              {isTyping && (
                <div className="flex justify-start items-start space-x-1">
                  {/* Manager Icon - Bigger and closer */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 p-1.5 shadow-md">
                      <img 
                        src={getManagerIcon(currentScenario.scenario?.managerType, isDarkMode)} 
                        alt="Manager"
                        className="w-full h-full object-contain rounded-full"
                      />
                    </div>
                  </div>

                  {/* Typing Message Bubble */}
                  <div className="flex flex-col items-start max-w-[75%]">
                    {/* Speaker Label */}
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 px-2">
                      Manager
                    </div>

                    {/* Typing Content with smooth corners */}
                    <div className="relative px-4 py-3 shadow-sm bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-md">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} id="messages-end" style={{ height: "5px" }}></div>
            </div>

            {/* Show final summary if scenario is complete */}
            {finalReport && (
              <div className="mt-4 p-4 bg-teal-50/70 dark:bg-teal-900/10 border border-teal-200/80 dark:border-teal-800/30 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">🎉 Practice Session Complete!</h3>
                
                {/* Total Score Display */}
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {finalScore}/100
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Total EVS Score</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    finalScore >= 80 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : finalScore >= 60
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                    {finalScore >= 80 ? 'Excellent' : finalScore >= 60 ? 'Good' : 'Needs Improvement'}
                  </div>
                </div>
            
                {currentScenario?.sessionSummary && (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <p><strong>Scenario:</strong> {currentScenario.sessionSummary.scenarioTitle || 'Unknown'}</p>
                        <p><strong>Issue Type:</strong> {currentScenario.sessionSummary.issue || 'Unknown'}</p>
                      </div>
                      <div>
                        <p><strong>Total Steps:</strong> {currentScenario.sessionSummary.choiceHistory?.length || 0}</p>
                        <p><strong>Manager Type:</strong> {currentScenario.sessionSummary.managerType || 'Unknown'}</p>
                      </div>
                    </div>

                    {/* Simplified Decision Pattern Summary */}
                    <div className="mb-4 p-3 bg-white/50 dark:bg-gray-800/30 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Decision Patterns:</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentScenario.sessionSummary.tacticCounts && Object.entries(currentScenario.sessionSummary.tacticCounts).map(([tactic, count]: [string, any]) => (
                          <span key={tactic} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                            {tactic}: {count}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {/* Always show feedback options when session is complete */}
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={handleGetFeedbackFromEVA}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 font-medium flex items-center justify-center space-x-2 transition-all duration-200"
                  >
                    <span>🤖</span>
                    <span>{loading ? 'Getting Feedback...' : 'Get Feedback from EVA'}</span>
                  </button>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePracticeAgain}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      🔄 Practice Again
                    </button>
                    {onExit && (
                      <button
                        onClick={handleReturnToChat}
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                      >
                        💬 Return to Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Show choices if available and scenario is not complete */}
            {currentScenario?.currentChoices && currentScenario.currentChoices.length > 0 && !currentScenario.isComplete && !finalReport && (
              <div className="bg-white dark:bg-gray-900 p-3 shadow-sm border-t border-gray-200 dark:border-gray-700">
                
                {/* Animated EVS Feedback */}
                {currentEVSFeedback && (
                  <div className={`mb-3 p-3 rounded-lg transition-all duration-500 ease-in-out transform ${
                    currentEVSFeedback.show 
                      ? 'opacity-100 translate-y-0 scale-100' 
                      : 'opacity-0 translate-y-2 scale-95'
                  } ${
                    currentEVSFeedback.score >= 70 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : currentEVSFeedback.score >= 40
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {currentEVSFeedback.message}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${
                          currentEVSFeedback.score >= 70 
                            ? 'text-green-600 dark:text-green-400' 
                            : currentEVSFeedback.score >= 40
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          EVS: {currentEVSFeedback.score}
                        </span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                          {currentEVSFeedback.category}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <h3 className={`text-sm font-medium mb-1.5 transition-opacity duration-300 ${
                  processingChoice || isTyping 
                    ? 'text-gray-400 dark:text-gray-500' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {processingChoice 
                    ? 'Processing your choice...' 
                    : isTyping 
                    ? 'Manager is responding...'
                    : 'How do you respond?'
                  }
                </h3>
                <div className="space-y-1.5 mb-1">
                  {currentScenario.currentChoices.map((choice, index) => (
                    <button
                      key={index}
                      className={`w-full text-left p-2.5 border rounded-lg transition-all duration-300 text-sm ${
                        processingChoice || isTyping
                          ? 'bg-gray-50/30 dark:bg-gray-800/20 border-gray-200/50 dark:border-gray-700/50 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                          : 'bg-gray-50/70 dark:bg-gray-800/30 border-gray-200/80 dark:border-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer'
                      }`}
                      onClick={() => handleChoice(index)}
                      disabled={processingChoice || isTyping}
                    >
                      <div className="flex justify-between items-start">
                        <span className="flex-1">{choice.text}</span>
                        <span className="ml-2 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                          {choice.category}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error rendering PracticeModule:', error);
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="text-red-500 mb-4">⚠️ An error occurred. Please refresh and try again.</div>
        <button
          onClick={loadAndStartScenario}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }
};

export default PracticeModule; 