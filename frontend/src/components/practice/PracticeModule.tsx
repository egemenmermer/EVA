import React, { useEffect, useState, useRef, useCallback } from 'react';
import api, { backendApi } from '../../services/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import './practice.css'; // Import the CSS file for animations
import { useStore } from '@/store/useStore'; // Import the global store
import { EVATacticsInfoModal } from '@/components/modals/EVATacticsInfoModal';

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
  feedback?: string;
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
  const [sessionSaved, setSessionSaved] = useState(false); // Add flag to track if session is saved
  const [showInfoModal, setShowInfoModal] = useState(false); // Add state for info modal
  
  const { user, setManagerType: setGlobalManagerType } = useStore();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Error boundary-like error handling
  const [componentError, setComponentError] = useState<string | null>(null);

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

  // Load available scenarios and auto-start one
  const loadAndStartScenario = async () => {
    try {
    setLoading(true);
      console.log('Loading scenarios and auto-starting...');
      
      // If a specific scenario was requested, start it directly
      if (scenarioId) {
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
        await suggestScenarioFromQuery(userQuery);
        return;
      }
      
      // Default: auto-suggest based on a default privacy query
      const defaultQuery = "I'm concerned about collecting user location data unnecessarily";
      await suggestScenarioFromQuery(defaultQuery);
      
    } catch (error) {
      console.error('Error loading and starting scenario:', error);
      setError('Failed to start practice scenario. Please try again.');
    } finally {
    setLoading(false);
    }
  };

  const suggestScenarioFromQuery = async (query: string) => {
    try {
      const response = await backendApi.get<ScenarioSuggestion>('/api/v1/scenarios/suggest', {
        params: { userQuery: query }
      });
      
      if (response.data?.scenarioId) {
        const sessionId = uuid();
        const sessionResponse = await backendApi.post<ScenarioSessionResponse>(
          `/api/v1/scenarios/${response.data.scenarioId}/start`,
          { sessionId }
        );
        
        // Create initial manager message (without typing animation)
        const initialManagerMessage: ManagerMessage = {
            role: 'manager',
          content: sessionResponse.data.currentStatement
        };
        
            setCurrentScenario({
          scenario: {
            id: sessionResponse.data.scenarioId,
            title: sessionResponse.data.scenarioTitle,
            description: sessionResponse.data.scenarioDescription,
            issue: sessionResponse.data.issue,
            managerType: sessionResponse.data.managerType
          },
          sessionId: sessionResponse.data.sessionId,
          conversation: [initialManagerMessage], // Start with initial manager message
          currentStatement: sessionResponse.data.currentStatement,
          currentStatementId: sessionResponse.data.currentStatementId,
          currentChoices: sessionResponse.data.choices,
          currentStep: sessionResponse.data.currentStep,
          isComplete: sessionResponse.data.isComplete
        });
        
        console.log('Successfully started scenario:', sessionResponse.data.scenarioTitle);
        
      } else {
        throw new Error('No scenario suggested');
      }
    } catch (error) {
      console.error('Error suggesting scenario:', error);
      setError('Failed to start suggested scenario. Please try again.');
    }
  };

  const startNewScenario = async (scenario: AvailableScenario) => {
    try {
      const sessionId = uuid();
      const response = await backendApi.post<ScenarioSessionResponse>(
        `/api/v1/scenarios/${scenario.id}/start`,
        { sessionId }
      );
      
      // Create initial manager message (without typing animation)
      const initialManagerMessage: ManagerMessage = {
        role: 'manager',
        content: response.data.currentStatement
      };
      
      setCurrentScenario({
        scenario: {
          id: response.data.scenarioId,
          title: response.data.scenarioTitle,
          description: response.data.scenarioDescription,
          issue: response.data.issue,
          managerType: response.data.managerType
        },
        sessionId: response.data.sessionId,
        conversation: [initialManagerMessage], // Start with initial manager message
        currentStatement: response.data.currentStatement,
        currentStatementId: response.data.currentStatementId,
        currentChoices: response.data.choices,
        currentStep: response.data.currentStep,
        isComplete: response.data.isComplete
      });
      
      console.log('Successfully started scenario:', response.data.scenarioTitle);
      
        } catch (error) {
      console.error('Error starting scenario:', error);
      setError('Failed to start scenario. Please try again.');
    }
  };

  // Function to get the appropriate manager icon
  const getManagerIcon = (managerType: string | undefined, isDarkMode: boolean = false) => {
    const normalizedType = (managerType || 'PUPPETEER').toUpperCase().trim();
    
    switch (normalizedType) {
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

  const getMessageStyle = (role: string) => {
    switch (role) {
      case 'manager':
        return 'p-3 pl-5 bg-amber-50/70 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-800 rounded-2xl rounded-tl-none max-w-[80%] mr-auto relative mt-3';
      case 'user':
        return 'p-3 bg-blue-50/70 dark:bg-blue-900/10 border border-blue-200/80 dark:border-blue-800/30 rounded-2xl rounded-tr-none max-w-[80%] ml-auto';
      case 'feedback':
        return 'p-2 bg-indigo-50/70 dark:bg-indigo-900/10 border border-indigo-200/80 dark:border-indigo-800/30 rounded-lg w-full my-1 text-sm';
      case 'final_evaluation':
        return 'p-3 bg-teal-50/70 dark:bg-teal-900/10 border border-teal-200/80 dark:border-teal-800/30 rounded-lg w-full my-3';
      default:
        return 'p-3 bg-gray-50/70 dark:bg-gray-800/30 border border-gray-200/80 dark:border-gray-700/30 rounded-lg';
    }
  };

  const handleReturnToChat = () => {
    console.log('Return to Chat button clicked');
    if (onExit) {
      onExit();
    } else {
      window.location.href = '/';
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
      showEVSFeedback(response.data.evs, response.data.category, response.data.feedback);
      
      // Check if scenario should be completed (either backend says so, or we've made 10+ choices)
      const shouldComplete = response.data.isComplete || (currentScenario.conversation.length >= 20); // 20 = ~10 conversation pairs + user choice
      
      if (shouldComplete) {
        // Add user's final choice to conversation
        const updatedConversation = [...currentScenario.conversation, userMessage];
        
        // If backend didn't provide session summary, fetch it manually
        let sessionSummary = response.data.sessionSummary;
        if (!sessionSummary) {
          console.log('⚠️ No session summary from backend, fetching manually...');
          try {
            const feedbackResponse = await backendApi.get(
              `/api/v1/scenarios/${currentScenario.scenario.id}/feedback`,
              { params: { sessionId: currentScenario.sessionId } }
            );
            sessionSummary = feedbackResponse.data;
            console.log('✅ Fetched session summary manually:', sessionSummary);
          } catch (error) {
            console.error('❌ Failed to fetch session summary:', error);
            // Fall back to creating a basic summary using proper scoring logic
            const feedbackMessages = currentScenario.conversation.filter(msg => msg.role === 'feedback');
            const evsScores = feedbackMessages.map((msg: any) => msg.evs || 0);
            const totalRawEvs = evsScores.reduce((sum, evs) => sum + evs, 0);
            
            // Apply same scaling logic as backend
            const numChoices = evsScores.length;
            const minPossibleScore = numChoices * (-3); // Worst case: all -3 choices
            const maxPossibleScore = numChoices * 3;    // Best case: all +3 choices
            
            let scaledScore;
            if (maxPossibleScore === minPossibleScore) {
              scaledScore = 5.0; // Default middle score if no range
            } else {
              scaledScore = ((totalRawEvs - minPossibleScore) / (maxPossibleScore - minPossibleScore)) * 10.0;
            }
            
            // Keep decimal precision, round to 1 decimal place (same as backend)
            const finalScaledScore = Math.max(0.0, Math.min(10.0, Math.round(scaledScore * 10.0) / 10.0));
            
            sessionSummary = {
              totalEvs: finalScaledScore,
              averageEvs: numChoices > 0 ? totalRawEvs / numChoices : 0,
              performanceLevel: finalScaledScore >= 8.0 ? 'Excellent' : finalScaledScore >= 6.0 ? 'Good' : finalScaledScore >= 4.0 ? 'Fair' : 'Needs Improvement',
              tacticCounts: { [response.data.category || 'Mixed']: 1 },
              choiceHistory: [userChoice.text],
              categoryHistory: [response.data.category || 'Mixed'],
              evsHistory: [response.data.evs || 0],
              scenarioTitle: currentScenario.scenario.title,
              issue: currentScenario.scenario.issue,
              managerType: currentScenario.scenario.managerType
            };
            
            console.log('🔧 Fallback scoring calculation:', {
              numChoices,
              totalRawEvs,
              minPossibleScore,
              maxPossibleScore,
              scaledScore,
              finalScaledScore
            });
          }
        }
        
        setCurrentScenario(prev => prev ? {
          ...prev,
          conversation: updatedConversation,
          isComplete: true,
          currentChoices: [], // Clear choices when complete
          sessionSummary
        } : null);
        
        setFinalReport(true);
        setFinalScore(sessionSummary?.totalEvs || 0);
        setShowFeedbackOptions(true);
        setProcessingChoice(false); // Reset processing state immediately
        
        console.log('✅ Scenario completed!');
        console.log('📊 Session summary:', sessionSummary);
        console.log('🔍 Debug - Full response data:', response.data);
        console.log('🎯 Setting final score to:', sessionSummary?.totalEvs);
        
        // Save practice session data to database ONLY ONCE when scenario completes
        // Use the updated conversation that includes the final user choice
        if (!sessionSaved) {
          await savePracticeSessionData(sessionSummary, updatedConversation);
        }
        
        // Add final completion message with typing animation
        setTimeout(async () => {
          await addManagerMessageWithTyping("Well done! Your practice session is complete. Let's review your performance.");
        }, 500);
        
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

  // Save practice session data to database
  const savePracticeSessionData = async (sessionSummary: any, conversation?: Message[]) => {
    try {
      if (!user || !currentScenario) return;
      
      // Use provided conversation or fall back to currentScenario.conversation
      const conversationToUse = conversation || currentScenario.conversation;
      
      // Get full conversation data for local storage/debugging
      const conversationData = conversationToUse.map((msg, index) => ({
        stepNumber: index + 1,
        role: msg.role,
        content: msg.content
      }));
      
      // Collect user choices with context for local storage/debugging
      const detailedChoices = [];
      conversationToUse.forEach((msg, index) => {
        if (msg.role === 'user') {
          const previousManagerMsg = conversationToUse
            .slice(0, index)
            .reverse()
            .find(m => m.role === 'manager');
          
          detailedChoices.push({
            userChoice: msg.content,
            managerStatement: previousManagerMsg?.content || ''
          });
        }
      });
      
      // Exactly match PracticeSessionRequestDTO structure
      const practiceData = {
        userId: user.id,
        managerType: currentScenario.scenario.managerType,
        scenarioId: currentScenario.scenario.id,
        selectedChoices: conversationToUse
          .filter(msg => msg.role === 'user')
          .map(msg => msg.content),
        timestamp: new Date().toISOString(), // This gets converted to LocalDateTime on server
        score: sessionSummary?.totalEvs || 0 // Use scaled totalEvs instead of averageEvs
      };
      
      console.log('Saving practice session with exact DTO format:', practiceData);
      
      // The token should already be included by the axios interceptor
      const response = await backendApi.post('/api/v1/practice/save', practiceData);
      console.log('Practice session saved successfully:', response.data);
      
      // Store the full data locally for debugging and admin panel 
      localStorage.setItem('practice_detailed_data', JSON.stringify({
        sessionId: currentScenario.sessionId,
        conversationData,
        detailedChoices,
        sessionSummary,
        scenarioData: {
          title: currentScenario.scenario.title,
          issue: currentScenario.scenario.issue,
          managerType: currentScenario.scenario.managerType
        },
        score: practiceData.score
      }));
      
      setSessionSaved(true);
      
      return true;
    } catch (error: any) {
      console.error('Error saving practice session:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // Save data locally as backup
      if (currentScenario) {
        localStorage.setItem('practice_session_backup', JSON.stringify({
          timestamp: new Date().toISOString(),
          data: currentScenario,
          sessionSummary,
          error: error?.message || 'Unknown error'
        }));
      }
      
      return false;
    }
  };

  const handlePracticeAgain = async () => {
    console.log('Starting new practice session');
    
    // Save current session data before starting new one (if not already saved)
    if (currentScenario && currentScenario.sessionSummary && !sessionSaved) {
      try {
        await savePracticeSessionData(currentScenario.sessionSummary);
        console.log('Previous practice session data saved before starting new session');
      } catch (error) {
        console.error('Error saving previous session data:', error);
      }
    }
    
    // Reset all states
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
    setSessionSaved(false); // Reset the session saved flag
    
    // Start new scenario
    loadAndStartScenario();
  };

  const handleGetFeedbackFromEVA = async () => {
    if (!currentScenario) return;
    
    try {
      setLoading(true);
      console.log('Getting feedback from EVA for practice module with query...');
      
      // Get the current score from the scenario session
      const currentScore = currentScenario?.sessionSummary?.totalEvs || finalScore || 0;
      
      // Create a comprehensive query about the practice session
      const query = `I just completed an ethical decision-making practice scenario. My ethical decision-making score was ${currentScore}/10. Can you provide detailed feedback on my performance?`;
      
      console.log('Query sent to EVA:', query);
      
      const debugInfo = `
## Practice Session Debug Info for EVA:
- Final Score: ${currentScore}/10 (scaled score from EVS)
- Performance Level: ${calculatePerformanceRating(currentScore).rating}
`;
      
      // FIRST: Ensure practice session data is saved before getting feedback (only if not already saved)
      if (currentScenario.sessionSummary && !sessionSaved) {
        const saveResult = await savePracticeSessionData(currentScenario.sessionSummary);
        if (saveResult) {
          console.log('Practice session data saved before getting feedback');
        } else {
          console.warn('Failed to save practice session data to server, but continuing with feedback');
        }
      } else if (sessionSaved) {
        console.log('Practice session already saved, skipping duplicate save');
      }
      
      // Get the original conversation ID we returned from
      const originalConversationId = localStorage.getItem('originalConversationId');
      
      if (originalConversationId) {
        // Clear any existing practice feedback to prevent duplication
        localStorage.removeItem('practice_to_chat');
        localStorage.removeItem('practice_feedback_simple');
        localStorage.removeItem('practice_feedback_prompt');
        
        // Set up practice to chat integration
      localStorage.setItem('practice_to_chat', 'true');
        localStorage.setItem('practice_feedback_simple', query);
        
        // Store detailed practice data for the backend
        const detailedPracticeInfo = `
  **Practice Scenario Completed**
  - Scenario: ${currentScenario.scenario.title}
  - Issue: ${currentScenario.scenario.issue}
  - Manager Type: ${currentScenario.scenario.managerType}
  
  **Performance Summary:**
  - Final Score: ${currentScore}/10 (scaled EVS score)
  - Performance Level: ${calculatePerformanceRating(currentScore).rating}
  - Total Decisions: ${currentScenario.sessionSummary?.choiceHistory.length}
`;
        
        localStorage.setItem('practice_feedback_prompt', detailedPracticeInfo);
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
                        `**Overall Score**: ${response.data.totalEvs?.toFixed(1)}/10 (${response.data.performanceLevel})\n\n` +
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
    } finally {
      setLoading(false);
    }
  };

  // Initialize the component with auto-start
  useEffect(() => {
    loadAndStartScenario();
  }, [scenarioId, userQuery]);

  // Scroll to bottom when conversation changes
  useEffect(() => {
    scrollToBottom();
  }, [currentScenario?.conversation, isTyping]);

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    const container = document.getElementById('message-container');
    if (container) {
      setTimeout(() => container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }), 100);
    }
  };

  // Add typing animation for manager messages
  const addManagerMessageWithTyping = async (content: string) => {
    if (!currentScenario) return;

    setIsTyping(true);
    
    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const managerMessage: ManagerMessage = {
      role: 'manager',
      content: content
    };

    setCurrentScenario(prev => prev ? {
      ...prev,
      conversation: [...prev.conversation, managerMessage]
    } : null);

    setIsTyping(false);
    setTimeout(scrollToBottom, 100);
  };

  // Show EVS feedback with animation - now uses backend feedback
  const showEVSFeedback = (score: number, category: string, feedbackText?: string) => {
    const tacticFeedback = generateTacticBasedFeedback(score, category);
    
    const feedbackMessage: FeedbackMessage = {
      role: 'feedback',
      content: tacticFeedback,
      evs: score,
      category: category,
      isTyping: false
    };

    setCurrentScenario(prev => prev ? {
      ...prev,
      conversation: [...prev.conversation, feedbackMessage]
    } : null);
  };

  // Generate tactic-based feedback
  const generateTacticBasedFeedback = (score: number, category: string): string => {
    const tacticType = getTacticType(category);
    
    if (score >= 3) {
      return `🌟 Excellent ${tacticType}! You used '${category}' to strongly advocate for ethical principles.`;
    } else if (score >= 2) {
      return `👍 Good ${tacticType}! You used '${category}' to effectively resist unethical requests.`;
    } else if (score >= 1) {
      return `😐 ${tacticType} approach using '${category}'. This shows awareness but could be stronger.`;
    } else if (score >= 0) {
      return `⚠️ Passive response using '${category}'. Consider more assertive ethical resistance.`;
    } else {
      return `❌ This '${category}' choice shows compliance with unethical requests.`;
    }
  };

  // Determine tactic type based on category
  const getTacticType = (category: string): string => {
    const persuasiveRhetoric = [
      'Evoking Empathy', 'Emphasizing Harm or Risk', 'Personal Moral Appeals', 
      'Referencing Laws or Regulations', 'Presenting User Data', 'Reframing'
    ];
    
    const processBasedAdvocacy = [
      'Documenting Dissent', 'Making It Visible', 'Creating Alternatives', 
      'Appealing to External Standards', 'Referencing Best Practices', 'Constructing Hypothetical Scenarios'
    ];
    
    const softResistance = [
      'Asking Questions', 'Delaying', 'Withholding Full Implementation', 'Shifting Scope'
    ];
    
    if (persuasiveRhetoric.includes(category)) {
      return 'Persuasive Rhetoric';
    } else if (processBasedAdvocacy.includes(category)) {
      return 'Process-Based Advocacy';
    } else if (softResistance.includes(category)) {
      return 'Soft Resistance';
    } else {
      return 'Tactic';
    }
  };

  // Calculate final performance rating based on total EVS
  const calculatePerformanceRating = (totalScore: number): { rating: string; emoji: string; description: string } => {
    if (totalScore >= 8.0) {
      return {
        rating: 'Excellent Ethical Advocate',
        emoji: '🌟',
        description: 'Outstanding ethical leadership with strong resistance to unethical requests.'
      };
    } else if (totalScore >= 6.0) {
      return {
        rating: 'Good Ethical Awareness',
        emoji: '👍',
        description: 'Solid ethical reasoning with good resistance to problematic requests.'
      };
    } else if (totalScore >= 4.0) {
      return {
        rating: 'Passive Ethics',
        emoji: '😐',
        description: 'Some ethical awareness but inconsistent resistance to unethical requests.'
      };
    } else if (totalScore >= 0.0) {
      return {
        rating: 'Ethical Risk Zone',
        emoji: '⚠️',
        description: 'Concerning compliance with unethical requests. Needs improvement.'
      };
    } else {
      return {
        rating: 'Ethical Blindspot',
        emoji: '❌',
        description: 'Significant ethical concerns. Strong tendency to enable harmful actions.'
      };
    }
  };

  // Show loading while scenario is being set up
  if (!currentScenario) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold">Ethical Decision-Making Practice</h1>
          {onExit && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowInfoModal(true)}
                className="group relative px-4 py-2 text-sm rounded-lg overflow-hidden
                          bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500
                          hover:from-purple-600 hover:via-blue-600 hover:to-cyan-600
                          text-white shadow-md hover:shadow-lg
                          transform hover:scale-[1.02] active:scale-[0.98]
                          transition-all duration-500 ease-out
                          before:absolute before:inset-0 before:bg-gradient-to-r 
                          before:from-pink-500 before:via-purple-500 before:to-blue-500
                          before:opacity-0 before:transition-opacity before:duration-700
                          hover:before:opacity-100"
                title="Learn about EVA Tactics"
              >
                <span className="relative z-10 flex items-center space-x-1.5">
                  <span className="text-sm">💡</span>
                  <span>Argumentation Tactics</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                               translate-x-[-100%] group-hover:translate-x-[100%] 
                               transition-transform duration-1500 ease-in-out"></div>
              </button>
            <button
              onClick={handleReturnToChat}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Return to Chat
            </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-gray-600 dark:text-gray-300">Starting practice scenario...</p>
            </div>
          ) : error ? (
            <div className="text-center">
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                  {error}
                </div>
                    <button
                onClick={loadAndStartScenario}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
                      </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-4">Setting up your practice scenario...</p>
              <button
                onClick={loadAndStartScenario}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start Practice
                    </button>
                </div>
          )}
        </div>
      </div>
    );
  }

  // Safe scenario rendering with error handling
  try {
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold">Ethical Decision-Making Practice</h1>
          {currentScenario?.scenario && (
            <h2 className="text-base text-gray-600 dark:text-gray-300">
                {currentScenario.scenario.issue || 'Practice Scenario'}
            </h2>
          )}
        </div>
        {onExit && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowInfoModal(true)}
              className="group relative px-4 py-2 text-sm rounded-lg overflow-hidden
                        bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500
                        hover:from-purple-600 hover:via-blue-600 hover:to-cyan-600
                        text-white shadow-md hover:shadow-lg
                        transform hover:scale-[1.02] active:scale-[0.98]
                        transition-all duration-500 ease-out
                        before:absolute before:inset-0 before:bg-gradient-to-r 
                        before:from-pink-500 before:via-purple-500 before:to-blue-500
                        before:opacity-0 before:transition-opacity before:duration-700
                        hover:before:opacity-100"
                title="Learn about EVA Tactics"
              >
                <span className="relative z-10 flex items-center space-x-1.5">
                  <span className="text-sm">💡</span>
                  <span>Argumentation Tactics</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                               translate-x-[-100%] group-hover:translate-x-[100%] 
                               transition-transform duration-1500 ease-in-out"></div>
              </button>
          <button
            onClick={handleReturnToChat}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Return to Chat
          </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="text-gray-600 dark:text-gray-300">Loading scenario...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 pb-4" id="message-container">
            {currentScenario?.scenario && (
              <div className="mb-4 bg-gray-50/70 dark:bg-gray-800/30 border border-gray-200/80 dark:border-gray-700/30 p-4 rounded-lg">
                <p className="text-sm">
                    <strong>Issue:</strong> {currentScenario.scenario.issue || 'Unknown'}
                </p>
                <p className="text-sm">
                    <strong>Manager Type:</strong> {currentScenario.scenario.managerType || 'Unknown'}
                </p>
                <p className="text-sm italic mt-2 text-gray-600 dark:text-gray-400">
                    {getManagerDescription(currentScenario.scenario.managerType)}
                </p>
              </div>
            )}

              {currentScenario?.conversation && Array.isArray(currentScenario.conversation) && currentScenario.conversation.length > 0 ? (
              <div className="space-y-2 mb-2">
                {currentScenario.conversation.map((message, index) => {
                  if (message.role === 'feedback') {
                      const feedbackMsg = message as FeedbackMessage;
                      return (
                        <div key={index} className="p-2 bg-indigo-50/70 dark:bg-indigo-900/10 border border-indigo-200/80 dark:border-indigo-800/30 rounded-lg w-full my-1 text-sm">
                          <span className="font-semibold">EVS: {feedbackMsg.evs}</span>
                          {feedbackMsg.category && <span className="ml-2">({feedbackMsg.category})</span>}
                        </div>
                      );
                    }

                    if (message.role === 'final_evaluation') {
                      return (
                        <div key={index} className="p-4 bg-teal-50/70 dark:bg-teal-900/10 border border-teal-200/80 dark:border-teal-800/30 rounded-lg w-full my-3">
                          <div className="mb-2 text-xs font-semibold text-teal-600 dark:text-teal-400 flex items-center">
                            🎯 EVA Analysis
                          </div>
                          <div className="whitespace-pre-line text-sm">{message.content}</div>
                        </div>
                      );
                    }
                  
                  return (
                      <div key={index} className="mb-2">
                      {(message.role === 'manager' || message.role === 'user') && (
                        <div className={message.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start ml-12'}>
                            <div className={`mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400 mx-2 flex items-center`}>
                              {message.role === 'manager' ? 'Manager' : 'You'}
                          </div>
                          <div className={getMessageStyle(message.role)} data-role={message.role}>
                              {message.role === 'manager' && (
                              <div className="absolute -left-12 -top-5">
                                <div className="relative w-16 h-16 rounded-full manager-icon-container border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center overflow-hidden shadow-lg">
                                  <img 
                                      src={getManagerIcon(currentScenario?.scenario?.managerType, isDarkMode)} 
                                    alt="Manager" 
                                    className="w-14 h-14 object-cover manager-icon" 
                                  />
                                </div>
                              </div>
                            )}
                              <div className="pl-1">{message.content}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                  {/* Show typing indicator at the bottom of conversation */}
                  {isTyping && (
                    <div className="mb-2">
                      <div className="flex flex-col items-start ml-12">
                        <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400 mx-2 flex items-center">
                          Manager
                  </div>
                        <div className="p-3 pl-5 bg-amber-50/70 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-800 rounded-2xl rounded-tl-none max-w-[80%] mr-auto relative mt-3">
                          <div className="absolute -left-12 -top-5">
                            <div className="relative w-16 h-16 rounded-full manager-icon-container border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center overflow-hidden shadow-lg">
                              <img 
                                src={getManagerIcon(currentScenario?.scenario?.managerType, isDarkMode)} 
                                alt="Manager" 
                                className="w-14 h-14 object-cover manager-icon" 
                              />
              </div>
              </div>
                          <div className="pl-1 flex items-center space-x-1">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
                              </div>
                          </div>
                </div>
              </div>
            )}

                  <div ref={messagesEndRef} id="messages-end" style={{ height: "5px" }}></div>
          </div>
              ) : null}

              {/* Show final summary if scenario is complete */}
              {finalReport && (
                <div className="mt-4 p-4 bg-teal-50/70 dark:bg-teal-900/10 border border-teal-200/80 dark:border-teal-800/30 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">🎉 Practice Session Complete!</h3>
                  
                  {/* Updated Total Score Display with new ranges */}
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                    {(() => {
                      // Use the most current score from session summary, fall back to finalScore state
                      const currentScore = currentScenario?.sessionSummary?.totalEvs || finalScore || 0;
                      const performanceData = calculatePerformanceRating(currentScore);
                      return (
                        <>
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                            {currentScore.toFixed(1)}/10
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">Total Ethical Valence Score</div>
                          <div className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium mb-2 ${
                            currentScore >= 8.0 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : currentScore >= 6.0
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              : currentScore >= 4.0
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : currentScore >= 2.0
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}>
                            {performanceData.emoji} {performanceData.rating}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 px-2">
                            {performanceData.description}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Compact button layout - side by side */}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleGetFeedbackFromEVA}
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 font-medium flex items-center justify-center space-x-2 transition-all duration-200"
                    >
                      <span>🤖</span>
                      <span>{loading ? 'Getting Feedback...' : 'Get Feedback from EVA'}</span>
                    </button>
                    
                    <button
                      onClick={handlePracticeAgain}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <span>🔄</span>
                      <span>Practice Again</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Show choices if available and scenario is not complete */}
            {currentScenario?.currentChoices && currentScenario.currentChoices.length > 0 && !currentScenario.isComplete && !finalReport && (
              <div className="bg-white/90 dark:bg-gray-900/90 p-3 shadow-sm backdrop-blur-sm border-t border-gray-200/80 dark:border-gray-700/30">
                
                {/* Animated EVS Feedback with updated color scheme */}
                {currentEVSFeedback && (
                  <div className={`mb-3 p-3 rounded-lg transition-all duration-500 ease-in-out transform ${
                    currentEVSFeedback.show 
                      ? 'opacity-100 translate-y-0 scale-100' 
                      : 'opacity-0 translate-y-2 scale-95'
                  } ${
                    currentEVSFeedback.score >= 2 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : currentEVSFeedback.score >= 1
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : currentEVSFeedback.score >= 0
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      : currentEVSFeedback.score >= -1
                      ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
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
                          currentEVSFeedback.score >= 2 
                            ? 'text-green-600 dark:text-green-400' 
                            : currentEVSFeedback.score >= 1
                            ? 'text-blue-600 dark:text-blue-400'
                            : currentEVSFeedback.score >= 0
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : currentEVSFeedback.score >= -1
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          EVS: {currentEVSFeedback.score >= 0 ? '+' : ''}{currentEVSFeedback.score}
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
                        <span className={`ml-2 text-xs px-2 py-1 rounded transition-colors duration-300 ${
                          processingChoice || isTyping
                            ? 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500'
                            : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        }`}>
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

      {/* Info Modal */}
      {showInfoModal && (
        <EVATacticsInfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
          currentChoices={currentScenario?.currentChoices || []}
        />
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