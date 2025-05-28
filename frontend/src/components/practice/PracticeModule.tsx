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
        
        setCurrentScenario({
          scenario: {
            id: sessionResponse.data.scenarioId,
            title: sessionResponse.data.scenarioTitle,
            description: sessionResponse.data.scenarioDescription,
            issue: sessionResponse.data.issue,
            managerType: sessionResponse.data.managerType
          },
          sessionId: sessionResponse.data.sessionId,
          conversation: [],
          currentStatement: sessionResponse.data.currentStatement,
          currentStatementId: sessionResponse.data.currentStatementId,
          currentChoices: sessionResponse.data.choices,
          currentStep: sessionResponse.data.currentStep,
          isComplete: sessionResponse.data.isComplete
        });
        
        console.log('Successfully started scenario:', sessionResponse.data.scenarioTitle);
        
        // Add initial manager message with typing animation
        setTimeout(() => {
          addManagerMessageWithTyping(sessionResponse.data.currentStatement);
        }, 500);
        
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
      
      setCurrentScenario({
        scenario: {
          id: response.data.scenarioId,
          title: response.data.scenarioTitle,
          description: response.data.scenarioDescription,
          issue: response.data.issue,
          managerType: response.data.managerType
        },
        sessionId: response.data.sessionId,
        conversation: [],
        currentStatement: response.data.currentStatement,
        currentStatementId: response.data.currentStatementId,
        currentChoices: response.data.choices,
        currentStep: response.data.currentStep,
        isComplete: response.data.isComplete
      });
      
      console.log('Successfully started scenario:', response.data.scenarioTitle);
      
      // Add initial manager message with typing animation
      setTimeout(() => {
        addManagerMessageWithTyping(response.data.currentStatement);
      }, 500);
      
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
      
      // Immediately add user's choice to conversation (smooth transition)
      const userChoice = currentScenario.currentChoices[choiceIndex];
      const userMessage: UserMessage = {
        role: 'user',
        content: userChoice.text
      };
      
      // Update conversation with user choice immediately (keep choices visible but disabled)
      setCurrentScenario(prev => prev ? {
        ...prev,
        conversation: [...prev.conversation, userMessage]
      } : null);
      
      // Scroll to show the user message
      setTimeout(scrollToBottom, 100);
      
      // Process the choice with backend
      const response = await backendApi.post<ScenarioChoiceResponse>(
        `/api/v1/scenarios/${currentScenario.scenario.id}/next`,
        {
          sessionId: currentScenario.sessionId,
          choiceIndex,
          currentStatementId: currentScenario.currentStatementId
        }
      );
      
      // Show animated EVS feedback
      showEVSFeedback(response.data.evs, response.data.category);
      
      if (response.data.isComplete) {
        // Scenario is complete - update scenario state
        console.log('Scenario completed! Session summary:', response.data.sessionSummary);
        
        setCurrentScenario(prev => prev ? {
          ...prev,
          isComplete: true,
          currentChoices: [], // Clear choices when complete
          sessionSummary: response.data.sessionSummary
        } : null);
        
        setFinalReport(true);
        setFinalScore(response.data.sessionSummary?.averageEvs || response.data.evs);
        setShowFeedbackOptions(true);
        setProcessingChoice(false); // Reset processing state immediately
        
        console.log('Final report set to true, finalScore:', response.data.sessionSummary?.averageEvs || response.data.evs);
        
        // Add final completion message with typing animation
        setTimeout(async () => {
          await addManagerMessageWithTyping("Well done! Your practice session is complete. Let's review your performance.");
        }, 500);
        
      } else {
        // Continue to next step - update scenario state
        setCurrentScenario(prev => prev ? {
          ...prev,
          currentStatement: response.data.nextStatement,
          currentStatementId: response.data.nextStatementId,
          currentStep: response.data.currentStep
        } : null);
        
        // Add manager's next message with typing animation
        if (response.data.nextStatement) {
          await addManagerMessageWithTyping(response.data.nextStatement);
          
          // After manager finishes typing, show the new choices and enable them
          setCurrentScenario(prev => prev ? {
            ...prev,
            currentChoices: response.data.nextChoices || []
          } : null);
          setProcessingChoice(false);
        }
      }
      
    } catch (error) {
      console.error('Error processing choice:', error);
      setError('Failed to process your choice. Please try again.');
      setProcessingChoice(false);
    }
  };

  const handlePracticeAgain = () => {
    console.log('Starting new practice session');
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
    loadAndStartScenario();
  };

  const handleGetFeedbackFromEVA = async () => {
    if (!currentScenario) return;
    
    try {
      setLoading(true);
      console.log('Getting feedback from EVA for session:', currentScenario.sessionId);
      
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Add typing animation for manager messages
  const addManagerMessageWithTyping = async (content: string) => {
    setIsTyping(true);
    
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
    
    setIsTyping(false);
    setTimeout(scrollToBottom, 100);
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

  // Show loading while scenario is being set up
  if (!currentScenario) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold">Ethical Decision-Making Practice</h1>
          {onExit && (
            <button
              onClick={handleReturnToChat}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Return to Chat
            </button>
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

  // Show the current scenario
  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold">Ethical Decision-Making Practice</h1>
          {currentScenario?.scenario && (
            <h2 className="text-base text-gray-600 dark:text-gray-300">
              {currentScenario.scenario.issue}
            </h2>
          )}
        </div>
        {onExit && (
          <button
            onClick={handleReturnToChat}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Return to Chat
          </button>
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
                  <strong>Issue:</strong> {currentScenario.scenario.issue}
                </p>
                <p className="text-sm">
                  <strong>Manager Type:</strong> {currentScenario.scenario.managerType}
                </p>
                <p className="text-sm italic mt-2 text-gray-600 dark:text-gray-400">
                  {getManagerDescription(currentScenario.scenario.managerType)}
                </p>
              </div>
            )}

            {currentScenario?.conversation && currentScenario.conversation.length > 0 ? (
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
            {finalReport && currentScenario?.sessionSummary && (
              <div className="mt-4 p-4 bg-teal-50/70 dark:bg-teal-900/10 border border-teal-200/80 dark:border-teal-800/30 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">🎉 Practice Session Complete!</h3>
                
                {/* Total Score Display */}
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {currentScenario.sessionSummary.averageEvs.toFixed(1)}/100
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Total EVS Score</div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    currentScenario.sessionSummary.averageEvs >= 80 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : currentScenario.sessionSummary.averageEvs >= 60
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                    {currentScenario.sessionSummary.performanceLevel}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p><strong>Scenario:</strong> {currentScenario.sessionSummary.scenarioTitle}</p>
                    <p><strong>Issue Type:</strong> {currentScenario.sessionSummary.issue}</p>
                  </div>
                  <div>
                    <p><strong>Total Steps:</strong> {currentScenario.sessionSummary.choiceHistory.length}</p>
                    <p><strong>Manager Type:</strong> {currentScenario.sessionSummary.managerType}</p>
                  </div>
                </div>

                {/* Decision Pattern Summary */}
                <div className="mb-4 p-3 bg-white/50 dark:bg-gray-800/30 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Decision Patterns:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(currentScenario.sessionSummary.tacticCounts || {}).map(([tactic, count]: [string, any]) => (
                      <span key={tactic} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                        {tactic}: {count}
                      </span>
                    ))}
                  </div>
                </div>
                
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
          </div>

          {/* Show choices if available and scenario is not complete */}
          {currentScenario?.currentChoices && currentScenario.currentChoices.length > 0 && !currentScenario.isComplete && !finalReport && (
            <div className="bg-white/90 dark:bg-gray-900/90 p-3 shadow-sm backdrop-blur-sm border-t border-gray-200/80 dark:border-gray-700/30">
              
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
    </div>
  );
};

export default PracticeModule; 