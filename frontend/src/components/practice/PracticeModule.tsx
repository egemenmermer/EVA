import React, { useEffect, useState, useRef, useCallback } from 'react';
import api, { backendApi } from '../../services/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import './practice.css'; // Import the CSS file for animations
import { useStore } from '@/store/useStore'; // Import the global store
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    originalIndex?: number;
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
    originalIndex?: number;
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
    endingMessage?: string;
    endingTitle?: string;
    endingType?: string;
    endingKey?: string;
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
  endings?: {
    [key: string]: {
      text: string;
      title: string;
      learning: string;
    };
  };
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
    originalIndex?: number;
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

import { PracticeIntroModal } from '../modals/PracticeIntroModal';

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
  const [processingChoice, setProcessingChoice] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false); // Add flag to track if session is saved
  const [showColorExplanationModal, setShowColorExplanationModal] = useState(false);
  const [hasShownInfoModal, setHasShownInfoModal] = useState(false); // Track if info modal has been shown
  const [hoveredTactic, setHoveredTactic] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [complianceCount, setComplianceCount] = useState(0);
  const [showIntroModal, setShowIntroModal] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('eva_practice_intro_dismissed');
    }
    return true;
  });
  
  
  const { user, setUser, setManagerType: setGlobalManagerType } = useStore();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to refresh user data from API
  const refreshUserData = async () => {
    try {
      console.log('Refreshing user data after practice completion...');
      const response = await backendApi.get('/api/v1/user/profile');
      const updatedUser = response.data;
      console.log('Updated user data:', updatedUser);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return null;
    }
  };

  // Error boundary-like error handling
  const [componentError, setComponentError] = useState<string | null>(null);
  
  // Function to determine if this is the first practice scenario
  const isFirstPracticeScenario = (): boolean => {
    // Check if user has completed any practice scenarios before
    const hasCompletedAccessibility = user?.accessibilityScenariosCompleted || false;
    const hasCompletedPrivacy = user?.privacyScenariosCompleted || false;
    
    console.log('DEBUG isFirstPracticeScenario:', {
      hasCompletedAccessibility,
      hasCompletedPrivacy,
      user: user?.id,
      result: !hasCompletedAccessibility && !hasCompletedPrivacy
    });
    
    // If neither scenario type is completed, this is the first practice
    return !hasCompletedAccessibility && !hasCompletedPrivacy;
  };
  
  // Function to get tactic type color based on our scenario structure
  const getTacticTypeColor = (category: string): string => {
    // Handle direct category names
    if (category === 'Rhetorical Tactics') {
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
    } else if (category === 'Logical Fallacies') {
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
    } else if (category === 'Soft Resistance') {
      return 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400';
    }
    
    // Map specific tactic names to their category colors
    const lowercaseCategory = category.toLowerCase();
    
    // Rhetorical Tactics
    if (lowercaseCategory.includes('persistent advocacy') || 
        lowercaseCategory.includes('being the user') || 
        lowercaseCategory.includes('broadening who the user is') || 
        lowercaseCategory.includes('guerilla methods') || 
        lowercaseCategory.includes('organizational memory') || 
        lowercaseCategory.includes('envisioning') || 
        lowercaseCategory.includes('rhetorical')) {
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
    }
    
    // Logical Fallacies
    if (lowercaseCategory.includes('strawman') || 
        lowercaseCategory.includes('false dilemma') || 
        lowercaseCategory.includes('appeal to popularity') || 
        lowercaseCategory.includes('hasty generalization') || 
        lowercaseCategory.includes('fallacy')) {
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
    }
    
    // Soft Resistance (Note: "Compliance" is NOT soft resistance - it's the bad choice!)
    if (lowercaseCategory.includes('acquiesce') || 
        lowercaseCategory.includes('distract and pacify') || 
        lowercaseCategory.includes('usable enough') || 
        lowercaseCategory.includes('ethical resistance') ||
        lowercaseCategory.includes('standing firm') ||
        lowercaseCategory.includes('moral courage') ||
        lowercaseCategory.includes('soft resistance')) {
      return 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400';
    }
    
    // Compliance should be colored gray/dark (bad choices)
    if (lowercaseCategory.includes('compliance')) {
      return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
    }
    
    // Default color for unknown categories
    return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
  };
  
  // Function to get tactic type display name
  const getTacticTypeName = (category: string): string => {
    // Handle direct category names
    if (category === 'Rhetorical Tactics') {
      return 'Rhetoric';
    } else if (category === 'Logical Fallacies') {
      return 'Fallacy';
    } else if (category === 'Soft Resistance') {
      return 'Soft';
    }
    
    // Map specific tactic names to their categories
    const lowercaseCategory = category.toLowerCase();
    
    // Rhetorical Tactics
    if (lowercaseCategory.includes('persistent advocacy') || 
        lowercaseCategory.includes('being the user') || 
        lowercaseCategory.includes('broadening who the user is') || 
        lowercaseCategory.includes('guerilla methods') || 
        lowercaseCategory.includes('organizational memory') || 
        lowercaseCategory.includes('envisioning') || 
        lowercaseCategory.includes('rhetorical')) {
      return 'Rhetoric';
    }
    
    // Logical Fallacies
    if (lowercaseCategory.includes('strawman') || 
        lowercaseCategory.includes('false dilemma') || 
        lowercaseCategory.includes('appeal to popularity') || 
        lowercaseCategory.includes('hasty generalization') || 
        lowercaseCategory.includes('fallacy')) {
      return 'Fallacy';
    }
    
    // Soft Resistance (Note: "Compliance" is NOT soft resistance - it's the bad choice!)
    if (lowercaseCategory.includes('acquiesce') || 
        lowercaseCategory.includes('distract and pacify') || 
        lowercaseCategory.includes('usable enough') || 
        lowercaseCategory.includes('ethical resistance') ||
        lowercaseCategory.includes('standing firm') ||
        lowercaseCategory.includes('moral courage') ||
        lowercaseCategory.includes('soft resistance')) {
      return 'Soft';
    }
    
    // Compliance should map to a special "Compliance" category (bad choices)
    if (lowercaseCategory.includes('compliance')) {
      return 'Compliance';
    }
    
    return 'Other'; // Return fallback for unknown tactics
  };

  // Research-based tactical database
  const tacticDatabase = {
    // Values Work Tactics (Section 4)
    'Broadening Who the "User" is in User Research': { 
      emoji: '🔹', 
      description: 'Expand the definition of \'user\' to include marginalized or overlooked groups.',
      example: 'We should also consider how this change affects rural or underrepresented users. We\'ve seen real differences in needs there.'
    },
    'Designing Affordances Subversively': { 
      emoji: '🔹', 
      description: 'Subtly introduce design elements that support ethical values without overtly challenging norms.',
      example: 'What if we added an optional feedback box here to give users more control over their data?'
    },
    'Making Values Visible Rhetorically to Other Organizational Stakeholders': { 
      emoji: '🔹', 
      description: 'Reframe ethical concerns in terms that align with business goals, like risk or trust.',
      example: 'If we ignore this, it could damage user trust and hurt retention metrics.'
    },
    'Expanding On and Subverting Design Resources for Others': { 
      emoji: '🔹', 
      description: 'Adapt familiar design tools (e.g., personas) to highlight values or ethical issues.',
      example: 'We created personas that specifically include accessibility needs to stress inclusion early on.'
    },
    'Making Values Visible and Legible Through Organizational Metrics': { 
      emoji: '🔹', 
      description: 'Use existing organizational metrics systems to track and surface ethical issues.',
      example: 'We\'ve logged this as an \'ethical bug\', it affects fairness in how users are treated.'
    },
    'Using Organizational Values to Create Spaces for New Forms of Values Work': { 
      emoji: '🔹', 
      description: 'Invoke the company\'s stated values (like diversity or responsibility) to support ethics work.',
      example: 'This aligns with our mission to build inclusive products, this feature really supports that.'
    },
    
    // UX Tactics (Section 5)
    'Guerilla methods': { 
      emoji: '🔹', 
      description: 'Use informal, scrappy methods to gather user insights quickly and cost-effectively.',
      example: 'We ran quick hallway tests with five people, three hit the same issue immediately.'
    },
    'Models that synthesize': { 
      emoji: '🔹', 
      description: 'Create simplified conceptual models that unify complex ideas for easier communication.',
      example: 'Here\'s a visual model that maps all the user pain points onto our current flow.'
    },
    'Usability studies': { 
      emoji: '🔹', 
      description: 'Use observed user behavior in structured testing to support design arguments.',
      example: 'In our test, every user got stuck at this point, this is a usability red flag.'
    },
    'Embodied knowledge of users': { 
      emoji: '🔹', 
      description: 'Use your own or others\' lived experience to represent user perspectives.',
      example: 'Honestly, as someone who uses the app daily, that feature feels unintuitive.'
    },
    'Fidelity as a rhetorical strategy': { 
      emoji: '🔹', 
      description: 'Use polished or realistic mockups to make a design idea more persuasive.',
      example: 'Here\'s a high-fidelity prototype that shows the smoother experience we\'re aiming for.'
    },
    'Envisioning': { 
      emoji: '🔹', 
      description: 'Imagine and articulate future use scenarios to show long-term value.',
      example: 'Imagine a user trying this with a screen reader, they\'d be stuck without this fix.'
    },
    'Heuristics': { 
      emoji: '🔹', 
      description: 'Invoke common design principles or standards as evidence.',
      example: 'This violates our core usability heuristics, it\'s not consistent or predictable.'
    },
    'Credibility and expertise': { 
      emoji: '🔹', 
      description: 'Leverage your own or your team\'s authority and past work to strengthen arguments.',
      example: 'We\'ve successfully done this in the past, our approach has worked for similar challenges.'
    },
    'Organizational memory': { 
      emoji: '🔹', 
      description: 'Reference past decisions, successes, or failures to argue for or against a choice.',
      example: 'Last time we skipped user testing here, it came back to bite us post-launch.'
    },
    'Usable enough': { 
      emoji: '🤲', 
      description: 'Frame a design as sufficiently good to meet minimum goals when perfection isn\'t feasible.',
      example: 'It\'s not perfect, but it gets us to MVP and avoids the major pitfalls.'
    },
    'Distract and pacify': { 
      emoji: '🤲', 
      description: 'Offer surface-level solutions to delay or soften resistance to ethical concerns.',
      example: 'We\'ll add a toggle for now, at least it shows we\'re doing something.'
    },
    'Acquiesce': { 
      emoji: '🤲', 
      description: 'Concede on less critical values or features in order to maintain influence or avoid conflict.',
      example: 'Okay, we can drop that part for now if it means we keep the opt-in controls.'
    },
    'Negotiation and cooperation': { 
      emoji: '🤲', 
      description: 'Compromise with others to move a values-based goal forward in some form.',
      example: 'What if we reduce the data collected, but still keep enough for the feature to work?'
    },
    'Being the user': { 
      emoji: '🤲', 
      description: 'Adopt the user\'s perspective in discussion to highlight their experience.',
      example: 'If I were a new user, this error message would be completely confusing.'
    },
    
    // Logical Fallacies
    'False Dilemma': { emoji: '🔄', description: 'Frames the issue as a black-or-white choice when other options exist.' },
    'Appeal to Ignorance': { emoji: '🔄', description: 'Assumes something is true just because it hasn\'t been disproven.' },
    'Appeal to Popularity': { emoji: '🔄', description: 'Justifies decisions because "everyone else does it".' },
    'Strawman': { emoji: '🔄', description: 'Misrepresents your point to argue against an easier version.' },
    'Red Herring': { emoji: '🔄', description: 'Introduces irrelevant info to distract from the real issue.' },
    'Slippery Slope': { emoji: '🔄', description: 'Claims one action will inevitably lead to extreme consequences.' },
    'Appeal to Authority': { emoji: '🔄', description: 'Uses an authority figure\'s opinion instead of logic.' },
    'Hasty Generalization': { emoji: '🔄', description: 'Draws broad conclusions from limited examples.' },
    'Circular Reasoning': { emoji: '🔄', description: 'Repeats the claim as evidence, without real support.' },
    'principled resistance': { emoji: '🔹', description: 'Assertive, direct, and value-driven tactics.' },
    'soft resistance': { emoji: '🤲', description: 'Subtle, less confrontational, and collaborative tactics.' },
    'creative resistance': { emoji: '🔹', description: 'Creative, innovative, and value-driven tactics.' },
  };

  // Function to get tooltip content for specific tactics
  const getTacticTooltipContent = (category: string): { title: string; description: string; emoji: string } => {
    // Check if it's a specific tactic first
    if (tacticDatabase[category as keyof typeof tacticDatabase]) {
      const tactic = tacticDatabase[category as keyof typeof tacticDatabase];
      return {
        emoji: tactic.emoji,
        title: category,
        description: tactic.description
      };
    }
    
    // Fallback for generic categories or unknown tactics
    const tacticTypeName = getTacticTypeName(category);
    switch (tacticTypeName) {
      case 'Rhetoric':
        return {
          emoji: '🔹',
          title: 'Rhetorical Approach',
          description: 'This choice uses persuasive reasoning to convince your manager.'
        };
      case 'Soft':
        return {
          emoji: '🤲',
          title: 'Subtle Resistance',
          description: 'This choice indirectly pushes back on the request.'
        };
      case 'Fallacy':
        return {
          emoji: '🔄',
          title: 'Logical Weakness',
          description: 'This choice uses flawed reasoning that may backfire.'
        };
      case 'Compliance':
        return {
          emoji: '⚪',
          title: 'Accepting Direction',
          description: 'This choice goes along with the manager\'s request.'
        };
      default:
        return {
          emoji: '❓',
          title: 'Unknown Approach',
          description: 'This tactical approach is not recognized.'
        };
    }
  };

  // Handle tooltip hover
  const handleTacticHover = (event: React.MouseEvent, category: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setHoveredTactic(category);
  };

  // Handle tooltip leave
  const handleTacticLeave = () => {
    setHoveredTactic(null);
    setTooltipPosition(null);
  };

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
        
        // Create initial user prompt message
        const scenarioForPrompt = {
          id: sessionResponse.data.scenarioId,
          title: sessionResponse.data.scenarioTitle,
          description: sessionResponse.data.scenarioDescription,
          issue: sessionResponse.data.issue,
          managerType: sessionResponse.data.managerType
        };
        
        const initialUserMessage: UserMessage = {
          role: 'user',
          content: generateInitialUserPrompt(scenarioForPrompt)
        };
        
        // Create initial manager message (responding to user's concern)
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
          conversation: [initialUserMessage, initialManagerMessage], // Start with user prompt, then manager response
          currentStatement: sessionResponse.data.currentStatement,
          currentStatementId: sessionResponse.data.currentStatementId,
          currentChoices: [...sessionResponse.data.choices]
          .map((choice, index) => ({ ...choice, originalIndex: index }))
          .sort(() => Math.random() - 0.5),
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

  // Generate initial user prompt based on scenario
  const generateInitialUserPrompt = (scenario: AvailableScenario): string => {
    const firstTime = isFirstPracticeScenario();
    if (firstTime) {
      return ` I'm facing a situation where my manager, who tends to be a ${scenario.managerType.toLowerCase()}, is pressuring me about ${scenario.issue}. What should I do?`;
    }
    return `I'd like to practice a new scenario. This time, my manager is a ${scenario.managerType.toLowerCase()} and the issue is ${scenario.issue}. What are my options?`;
  };

  const startNewScenario = async (scenario: AvailableScenario) => {
    try {
      const sessionId = uuid();
      const response = await backendApi.post<ScenarioSessionResponse>(
        `/api/v1/scenarios/${scenario.id}/start`,
        { sessionId }
      );
      
      // Create initial user prompt message
      const initialUserMessage: UserMessage = {
        role: 'user',
        content: generateInitialUserPrompt(scenario)
      };
      
      // Create initial manager message (responding to user's concern)
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
        conversation: [initialUserMessage, initialManagerMessage], // Start with user prompt, then manager response
        currentStatement: response.data.currentStatement,
        currentStatementId: response.data.currentStatementId,
        currentChoices: [...response.data.choices]
          .map((choice, index) => ({ ...choice, originalIndex: index }))
          .sort(() => Math.random() - 0.5),
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
    console.log('🚀 handleChoice called with choiceIndex:', choiceIndex);
    
    if (!currentScenario || processingChoice) {
      console.log('❌ Early return: currentScenario=', !!currentScenario, 'processingChoice=', processingChoice);
      return;
    }

    console.log('✅ Proceeding with choice processing...');
      setProcessingChoice(true);

    try {
      // Validate choiceIndex first
      if (choiceIndex < 0 || choiceIndex >= currentScenario.currentChoices.length) {
        console.error('❌ choiceIndex out of bounds:', choiceIndex, 'Max:', currentScenario.currentChoices.length - 1);
        throw new Error(`Choice index ${choiceIndex} is out of bounds`);
      }
      
      const selectedChoice = currentScenario.currentChoices[choiceIndex];
      console.log('👤 User choice:', selectedChoice);

      // Add user message to conversation (declare early so it can be used in failure logic)
      const userMessage: UserMessage = {
        role: 'user',
        content: selectedChoice.text
      };

      // Track compliance choices for failure detection
      const isComplianceChoice = selectedChoice.category.toLowerCase().includes('compliance');
      if (isComplianceChoice) {
        const newComplianceCount = complianceCount + 1;
        setComplianceCount(newComplianceCount);
        
        // If this is the second compliance choice, trigger failure ending
        if (newComplianceCount >= 2) {
          // Create a failure session summary
          const failureSessionSummary = {
            totalEvs: 0,
            averageEvs: 0,
            performanceLevel: 'Failed',
            tacticCounts: { 'Compliance': newComplianceCount },
            choiceHistory: [...(currentScenario.sessionSummary?.choiceHistory || []), selectedChoice.text],
            categoryHistory: [...(currentScenario.sessionSummary?.categoryHistory || []), 'Compliance'],
            evsHistory: [...(currentScenario.sessionSummary?.evsHistory || []), 0],
            scenarioTitle: currentScenario.scenario.title,
            issue: currentScenario.scenario.issue,
            managerType: currentScenario.scenario.managerType,
            endingMessage: "You've chosen compliance twice. This approach doesn't develop your ethical advocacy skills. Ethical advocacy requires standing up for what's right.",
            endingTitle: "Practice Failed",
            endingType: "failure_ending",
            endingKey: "failure_ending"
          };

          // Add user message to conversation
          const updatedConversation = [...currentScenario.conversation, userMessage];
          
          setCurrentScenario(prev => prev ? {
            ...prev,
            conversation: updatedConversation,
            isComplete: true,
            currentChoices: [],
            sessionSummary: failureSessionSummary,
          } : null);
          
          setFinalScore(0);
          setFinalReport(true);
          setShowFeedbackOptions(false); // Don't show EVA feedback for failures
          setProcessingChoice(false);
          return;
        }
      }

      // Use original index for backend API call (to handle randomized display order)
      const originalChoiceIndex = selectedChoice.originalIndex !== undefined ? selectedChoice.originalIndex : choiceIndex;
      console.log('🔄 Display index:', choiceIndex, 'Original index:', originalChoiceIndex);
      
      // Validate that the original index is within bounds
      if (originalChoiceIndex < 0 || !Number.isInteger(originalChoiceIndex)) {
        console.error('❌ Invalid originalChoiceIndex:', originalChoiceIndex, 'Using display index instead');
        throw new Error(`Invalid choice index: ${originalChoiceIndex}`);
      }
      
      // Validate that the original index is within bounds
      if (originalChoiceIndex < 0 || !Number.isInteger(originalChoiceIndex)) {
        console.error('❌ Invalid originalChoiceIndex:', originalChoiceIndex, 'Using display index instead');
        throw new Error(`Invalid choice index: ${originalChoiceIndex}`);
      }

      console.log('📤 Making API call to:', `/api/v1/scenarios/${currentScenario.scenario.id}/next`);
      console.log('📤 API payload:', {
        sessionId: currentScenario.sessionId,
        choiceIndex: originalChoiceIndex,
        currentStatementId: currentScenario.currentStatementId
      });

      // Make API call to backend using original choice index
      const response = await backendApi.post<ScenarioChoiceResponse>(
        `/api/v1/scenarios/${currentScenario.scenario.id}/next`,
        {
          sessionId: currentScenario.sessionId,
          choiceIndex: originalChoiceIndex,
          currentStatementId: currentScenario.currentStatementId
        }
      );
      
      console.log('📥 API response received:', response.data);
      console.log('📥 Response keys:', Object.keys(response.data));
      console.log('📥 isComplete:', response.data.isComplete);
      console.log('📥 sessionSummary:', response.data.sessionSummary);

      // Skip EVS feedback - removed for cleaner conversation
      
      // NOW add user's choice to conversation after successful API call
      const updatedConversation = [...currentScenario.conversation, userMessage];
      
      console.log('🔍 Response from backend:', response.data);
      console.log('🔍 isComplete:', response.data.isComplete);
      console.log('🔍 nextChoices length:', response.data.nextChoices?.length);
      console.log('🔍 sessionSummary exists:', !!response.data.sessionSummary);
      
      // Check if backend says scenario is complete OR we have no more choices
      const backendSaysComplete = response.data.isComplete;
      const isAtEnding = response.data.nextChoices && response.data.nextChoices.length === 0;
      
      // Debug logging for completion logic
      console.log('🔍 Completion check:', {
        backendSaysComplete,
        hasSessionSummary: !!response.data.sessionSummary,
        nextStatementId: response.data.nextStatementId,
        isAtEnding,
        nextChoicesLength: response.data.nextChoices?.length
      });
      
      // If backend says complete with session summary, show completion immediately
      if (backendSaysComplete && response.data.sessionSummary) {
        const sessionSummary = response.data.sessionSummary;
        
        console.log('🎉 COMPLETION TRIGGERED! Backend says complete with summary');
        console.log('📊 Session summary received:', sessionSummary);
        
        // Determine the ending key
        const performanceData = calculatePerformanceRating(sessionSummary.totalEvs);
        const endingKey = sessionSummary.endingType || (sessionSummary.totalEvs >= 6.0 ? "good_ending" : "bad_ending");

        // Find the scenario definition to get the ending text
        const scenarioDefinition = scenarios.find(s => s.id === currentScenario.scenario.id);
        const ending = scenarioDefinition?.endings?.[endingKey];
        const endingMessage = ending?.text || sessionSummary.endingMessage || "Your practice session is complete.";
        const endingTitle = ending?.title || "Practice Complete";

        const finalSessionSummary = {
          ...sessionSummary,
          endingMessage: endingMessage,
          endingTitle: endingTitle,
          endingType: endingKey,
        };
        
        setCurrentScenario(prev => prev ? {
          ...prev,
          conversation: updatedConversation,
          isComplete: true,
          currentChoices: [],
          sessionSummary: finalSessionSummary,
        } : null);
        
        setFinalScore(sessionSummary.totalEvs || 0);
        
        console.log('✅ Scenario completed with summary!');
        console.log('📊 Session summary:', sessionSummary);
        
        // Save practice session data
        if (!sessionSaved) {
          await savePracticeSessionData(finalSessionSummary, updatedConversation);
        }
        
        // Also set the localstorage flag as a robust fallback
        if (isFirstPracticeScenario()) {
            localStorage.setItem('auto_open_tactics_guide', 'true');
            localStorage.setItem('show_tactics_glow', 'true'); // For the glow effect
        }
        
        // Show completion popup immediately
        setFinalReport(true);
        setShowFeedbackOptions(true);
        setProcessingChoice(false);
        navigate('/dashboard');
        return;
      }
      
      // If we're at ending but no completion data yet, try to get it
      // ONLY if we don't already have sessionSummary from the first response
      if ((isAtEnding || (response.data.nextStatementId && response.data.nextStatementId.startsWith('end'))) && !response.data.sessionSummary) {
        console.log('🔍 At ending, trying to get completion data...');
        
        try {
          const completionResponse = await backendApi.post<ScenarioChoiceResponse>(
            `/api/v1/scenarios/${currentScenario.scenario.id}/next`,
            {
              sessionId: currentScenario.sessionId,
              choiceIndex: 0, // Dummy choice for completion
              currentStatementId: response.data.nextStatementId || currentScenario.currentStatementId
            }
          );
          
          console.log('🔍 Completion response:', completionResponse.data);
          
          // Check if we have session summary (completion) regardless of isComplete flag
          if (completionResponse.data.sessionSummary) {
            const sessionSummary = completionResponse.data.sessionSummary;
            
            setCurrentScenario(prev => prev ? {
              ...prev,
              conversation: updatedConversation,
              isComplete: true,
              currentChoices: [],
              sessionSummary
            } : null);
            
            setFinalScore(sessionSummary.totalEvs || 0);
            
            console.log('✅ Scenario completed via second call!');
            console.log('📊 Session summary:', sessionSummary);
            
            // Save practice session data
            if (!sessionSaved) {
              await savePracticeSessionData(sessionSummary, updatedConversation);
            }
            
            // Show completion popup immediately
            setFinalReport(true);
            setShowFeedbackOptions(true);
            setProcessingChoice(false);
            navigate('/dashboard');
            return;
          }
        } catch (error) {
          console.error('Error getting completion data:', error);
        }
        
        setProcessingChoice(false);
        return;
      }
      
      // Check if we need to fallback complete (emergency case)
      const shouldComplete = currentScenario.conversation.length >= 20;
      
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
              performanceLevel: finalScaledScore >= 6.4 ? 'Excellent' : finalScaledScore >= 4.8 ? 'Good' : finalScaledScore >= 3.2 ? 'Fair' : 'Needs Improvement',
              tacticCounts: { [response.data.category || 'Mixed']: 1 },
              choiceHistory: [selectedChoice.text],
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
          
        setFinalScore(sessionSummary?.totalEvs || 0);
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
        
        // Add final completion message with typing animation using ending from scenario
        setTimeout(async () => {
          const endingMessage = sessionSummary?.endingMessage || "Well done! Your practice session is complete. Let's review your performance.";
          await addManagerMessageWithTyping(endingMessage);
          
          // ONLY show final report AFTER the ending message is fully displayed
          setTimeout(() => {
            setFinalReport(true);
            setShowFeedbackOptions(true);
          }, 1000); // Give time for the ending message to be read
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
          
          // Randomize choice order while preserving original indices
          const randomizedChoices = response.data.nextChoices ? 
            [...response.data.nextChoices]
              .map((choice, index) => ({ ...choice, originalIndex: index }))
              .sort(() => Math.random() - 0.5) : [];

          // After manager finishes typing, update with new choices
          setCurrentScenario(prev => prev ? {
            ...prev,
            currentChoices: randomizedChoices
          } : null);
        }
        setProcessingChoice(false);
      }
      
    } catch (error) {
      console.error('❌ An error occurred in handleChoice:', error);
      
      const userMessage: UserMessage = {
        role: 'user',
        content: "An error occurred while processing your choice. Please try again or restart the practice." // Generic message
      };

      // Attempt to update the UI with an error message
      if (currentScenario) {
          const updatedConversation = [...currentScenario.conversation, userMessage];
          
          setCurrentScenario(prev => prev ? {
            ...prev,
            conversation: updatedConversation,
          } : null);
      }
      
      setError('An error occurred. Please refresh and try again.');
      
      // Ensure processing is reset on error
      console.log('✅ Resetting processingChoice due to error.');
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
        // Add detailed choices with EVS scores and tactics
        choices: sessionSummary?.choiceHistory?.map((choice: string, index: number) => ({
          stepNumber: index + 1,
          choiceText: choice,
          evsScore: sessionSummary?.evsHistory?.[index] || null,
          tactic: sessionSummary?.categoryHistory?.[index] || 'Unknown'
        })) || [],
        timestamp: new Date().toISOString(), // This gets converted to LocalDateTime on server
        score: sessionSummary?.totalEvs || 0 // Use scaled totalEvs instead of averageEvs
      };
      
      console.log('DEBUG: Session summary data:', sessionSummary);
      console.log('DEBUG: Choice history:', sessionSummary?.choiceHistory);
      console.log('DEBUG: EVS history:', sessionSummary?.evsHistory); 
      console.log('DEBUG: Category history:', sessionSummary?.categoryHistory);
      console.log('DEBUG: Detailed choices being sent:', practiceData.choices);
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
      
      // **IMPORTANT: Refresh user data to update completion flags for Post Survey button**
      // TEMPORARILY DISABLED FOR DEBUGGING - This was causing both scenarios to be marked as completed
      // await refreshUserData();
      console.log('User data refresh DISABLED for debugging - this was fetching old database state');
      
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
    setIsTyping(false);
    setError(null);
    setLoading(false);
    setSessionSaved(false); // Reset the session saved flag
    setHasShownInfoModal(false); // Reset info modal state
    setShowColorExplanationModal(false); // Reset color modal state
    
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
      
      // Create a user-friendly query about the practice session
      const query = `I just completed an ethical decision-making practice scenario. My score was ${currentScore}/8. Can you provide feedback on my performance and suggest improvements for similar situations?`;
      
      console.log('Query sent to EVA:', query);
      
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
        try {
          // Clear any existing practice feedback to prevent duplication
          localStorage.removeItem('practice_to_chat');
          localStorage.removeItem('practice_feedback_simple');
          localStorage.removeItem('practice_feedback_prompt');
          
          // Set up practice to chat integration
          localStorage.setItem('practice_to_chat', 'true');
          localStorage.setItem('practice_feedback_simple', query);
          
          // Store detailed practice data for the backend (hidden from user)
          const detailedPracticeInfo = `
**Practice Scenario Analysis (Internal)**
- Scenario: ${currentScenario.scenario.title}
- Issue: ${currentScenario.scenario.issue}
- Manager Type: ${currentScenario.scenario.managerType}
- Final Score: ${currentScore}/8
- Performance Level: ${calculatePerformanceRating(currentScore).rating}
- Total Decisions: ${currentScenario.sessionSummary?.choiceHistory.length || 0}

**Internal Tactical Analysis:**
${currentScenario.sessionSummary?.categoryHistory ? (() => {
  const tactics = currentScenario.sessionSummary.categoryHistory || [];
  const uniqueUsedTactics = [...new Set(tactics.filter(t => t !== 'None'))];
  const tacticCounts = tactics.reduce((acc: any, tactic: string) => {
    acc[tactic] = (acc[tactic] || 0) + 1;
    return acc;
  }, {});
  
  return `User's tactical choices: ${uniqueUsedTactics.join(', ') || 'None'}
Tactical distribution: ${Object.entries(tacticCounts).map(([tactic, count]: [string, any]) => `${tactic} (${count}x)`).join(', ')}`;
})() : 'No tactical data available'}

**Feedback Guidelines:**
- Provide constructive feedback on the user's decision-making approach
- Suggest alternative strategies for similar ethical scenarios
- Focus on practical advice rather than exposing internal scoring mechanisms
- Help user understand different approaches to ethical challenges
- Keep technical details about tactics and scoring in the background
- Make feedback conversational and supportive
`;
          
          localStorage.setItem('practice_feedback_prompt', detailedPracticeInfo);
          localStorage.setItem('force_conversation_id', originalConversationId);
          
          // Set flag to auto-open tactics guide after returning to chat using database
          try {
            const practiceSessionData = {
              tacticCounts: currentScenario.sessionSummary.tacticCounts || {},
              scenarioTitle: currentScenario.sessionSummary.scenarioTitle || currentScenario.scenario.title,
              issue: currentScenario.sessionSummary.issue || currentScenario.scenario.issue
            };
            
            // Store the auto-open flag and practice data in the database
            await backendApi.post('/api/v1/practice/set-auto-open-tactics', {
              conversationId: originalConversationId,
              practiceData: practiceSessionData
            });
            
            console.log('Saved auto-open tactics flag and practice session data to database:', practiceSessionData);
          } catch (dbError) {
            console.error('Failed to save auto-open tactics flag to database:', dbError);
            // Fallback to localStorage as backup
            localStorage.setItem('auto_open_tactics_guide', 'true');
            if (currentScenario.sessionSummary) {
              const practiceSessionData = {
                tacticCounts: currentScenario.sessionSummary.tacticCounts || {},
                scenarioTitle: currentScenario.sessionSummary.scenarioTitle || currentScenario.scenario.title,
                issue: currentScenario.sessionSummary.issue || currentScenario.scenario.issue
              };
              localStorage.setItem('last_practice_session_data', JSON.stringify(practiceSessionData));
            }
          }
          
          console.log('Practice feedback integration set up, navigating to chat...');
          
          // Navigate back to the main chat
          if (onExit) {
            onExit();
          } else {
            window.location.href = '/';
          }
        } catch (integrationError) {
          console.error('Error setting up practice feedback integration:', integrationError);
          // Fall back to direct feedback
          showDirectFeedback();
        }
      } else {
        // No original conversation ID, show feedback directly
        showDirectFeedback();
      }
      
    } catch (error) {
      console.error('Error getting feedback from EVA:', error);
      setError('Failed to get feedback from EVA. Please try again.');
      // Show a fallback message if we have scenario data
      if (currentScenario?.sessionSummary) {
        const performanceData = calculatePerformanceRating(currentScenario.sessionSummary.totalEvs || 0);
        setCurrentScenario(prev => prev ? {
          ...prev,
          conversation: [
            ...prev.conversation,
            {
              role: 'final_evaluation',
              content: `🎯 **Performance Analysis**\n\n` +
                      `You did well in this scenario! Your tactical choices were effective.\n\n` +
                      `Remember that you can use different tactics in different situations:\n\n` +
                      `- **Direct Confrontation** when ethical issues need immediate attention\n` +
                      `- **Persuasive Rhetoric** to convince others using logical arguments\n` +
                      `- **Process-Based Advocacy** to suggest systematic improvements\n` +
                      `- **Soft Resistance** when subtle pushback is more appropriate\n\n` +
                      `Try practicing with different approaches next time!`
            } as FinalEvaluationMessage
          ]
        } : null);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to show direct feedback when chat integration fails
  const showDirectFeedback = async () => {
    try {
      // Fallback: try to get feedback directly 
      const response = await backendApi.get<any>(
        `/api/v1/scenarios/${currentScenario?.scenario.id}/feedback`,
        {
          params: { sessionId: currentScenario?.sessionId }
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
                      `**Overall Score**: ${response.data.totalEvs?.toFixed(1)}/8 (${response.data.performanceLevel})\n\n` +
                      `**Key Insights**: Your choices show ${response.data.performanceLevel.toLowerCase()} ethical decision-making. ` +
                      `Focus on balancing ${response.data.issue.toLowerCase()} concerns with business objectives.`
            } as FinalEvaluationMessage
          ]
        } : null);
      }
    } catch (feedbackError) {
      console.error('Error getting direct feedback:', feedbackError);
      // Show a generic feedback message as last resort
      if (currentScenario) {
        const performanceData = calculatePerformanceRating(currentScenario?.sessionSummary?.totalEvs || 0);
        setCurrentScenario(prev => prev ? {
          ...prev,
          conversation: [
            ...prev.conversation,
            {
              role: 'final_evaluation',
              content: `🎯 **Performance Analysis**\n\n` +
                      `You completed this scenario with a ${performanceData.rating.toLowerCase()} approach to ethical decision-making.\n\n` +
                      `Remember that you can use different tactics in different situations:\n\n` +
                      `- **Direct Confrontation** when ethical issues need immediate attention\n` +
                      `- **Persuasive Rhetoric** to convince others using logical arguments\n` +
                      `- **Process-Based Advocacy** to suggest systematic improvements\n` +
                      `- **Soft Resistance** when subtle pushback is more appropriate\n\n` +
                      `Try practicing with different approaches next time!`
            } as FinalEvaluationMessage
          ]
        } : null);
      }
    }
  };

  // Initialize the component with auto-start
  useEffect(() => {
    loadAndStartScenario();
  }, [scenarioId, userQuery]);

  // Check if user should see color explanation modal
  useEffect(() => {
    if (currentScenario && !isFirstPracticeScenario() && !showColorExplanationModal && !hasShownInfoModal) {
      // Show modal only once per session when colors are actually visible
      const modalShownKey = `color_explanation_shown_${currentScenario.sessionId}`;
      const hasShownModal = sessionStorage.getItem(modalShownKey);
      
      if (!hasShownModal && currentScenario.currentChoices && currentScenario.currentChoices.length > 0) {
        setShowColorExplanationModal(true);
        setHasShownInfoModal(true);
        sessionStorage.setItem(modalShownKey, 'true');
      }
    }
  }, [currentScenario, hasShownInfoModal]);

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

  // EVS feedback removed for cleaner conversation experience

  // Calculate final performance rating based on total EVS
  const calculatePerformanceRating = (totalScore: number): { rating: string; emoji: string; description: string; score: number } => {
    let rating = 'Needs Improvement';
    let emoji = '🔴';
    let description = 'Significant room for growth in navigating ethical challenges.';
    
    if (totalScore >= 6.4) {
      rating = 'Excellent Ethical Advocate';
      emoji = '🌟';
      description = 'Outstanding ethical leadership with strong resistance to unethical requests.';
    } else if (totalScore >= 4.8) {
      rating = 'Good Ethical Awareness';
      emoji = '👍';
      description = 'Solid ethical reasoning with good resistance to problematic requests.';
    } else if (totalScore >= 3.2) {
      rating = 'Developing Ethics';
      emoji = '😐';
      description = 'Some ethical awareness but inconsistent resistance to unethical requests.';
    } else if (totalScore >= 1.6) {
      rating = 'Needs Improvement';
      emoji = '🟠';
      description = 'Developing ethical awareness, but missed key opportunities for advocacy.';
    } else if (totalScore >= 0.8) {
      rating = 'Compliance Focused';
      emoji = '⚠️';
      description = 'Tendency to comply with problematic requests rather than advocate for ethical alternatives.';
    } else {
      rating = 'Requires Training';
      emoji = '❌';
      description = 'Significant compliance with unethical requests. Consider additional ethics training.';
    }
    
    return { rating, emoji, description, score: totalScore };
  };

  // Tooltip Component
  const TacticTooltip: React.FC = () => {
    if (!hoveredTactic || !tooltipPosition) return null;

    const tooltipContent = getTacticTooltipContent(hoveredTactic);

    return (
      <div 
        className="fixed z-50 pointer-events-none"
        style={{
          left: tooltipPosition.x - 420, // Position to the left of cursor
          top: tooltipPosition.y - 10   // Position slightly above cursor
        }}
      >
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg px-4 py-3 w-96">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{tooltipContent.emoji}</span>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {tooltipContent.title}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            {tooltipContent.description}
          </p>
          {/* Tooltip arrow pointing to the right */}
          <div className="absolute top-4 left-full">
            <div className="w-2 h-2 bg-white dark:bg-gray-800 border-t border-r border-gray-200 dark:border-gray-600 transform rotate-45 -translate-x-1"></div>
          </div>
        </div>
      </div>
    );
  };

  // Color Explanation Modal Component
  const ColorExplanationModal: React.FC = () => {
    if (!showColorExplanationModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
          <div className="p-5">
            {/* Header */}
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">🎨</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Your Second Practice Module!
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                This time, we're adding visual cues to help you recognize different tactical approaches.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                Note: Colors only appear from your second practice session onwards to help you learn the different tactical patterns.
              </p>
            </div>

            {/* Color System Explanation */}
            <div className="space-y-3 mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                📋 Color-Coded Tactic System
              </h3>
              
              <div className="space-y-2">
                {/* Rhetorical Tactics */}
                <div className="flex items-center space-x-3 p-2.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                  <div className="w-4 h-4 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-purple-800 dark:text-purple-200">🔹 Rhetorical Tactics</span>
                      <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">Rhetoric</span>
                    </div>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Direct, persuasive arguments using logic and evidence
                    </p>
                  </div>
                </div>

                {/* Soft Resistance */}
                <div className="flex items-center space-x-3 p-2.5 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg">
                  <div className="w-4 h-4 bg-teal-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-teal-800 dark:text-teal-200">🤲 Soft Resistance</span>
                      <span className="text-xs px-2 py-1 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full">Soft</span>
                    </div>
                    <p className="text-sm text-teal-700 dark:text-teal-300">
                      Subtle pushback that doesn't directly confront
                    </p>
                  </div>
                </div>

                {/* Logical Fallacies */}
                <div className="flex items-center space-x-3 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                  <div className="w-4 h-4 bg-amber-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-amber-800 dark:text-amber-200">🔄 Logical Fallacies</span>
                      <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">Fallacy</span>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Weak arguments that may not advance your ethical goals
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Learn More Section */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
              <div className="flex items-start space-x-2">
                <span className="text-xl">💡</span>
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-1.5 text-sm">
                    Interactive Learning Features
                  </h4>
                  <p className="text-xs text-green-700 dark:text-green-400 mb-1.5">
                    • <strong>Hover over tactic labels</strong> to see instant explanations of what each approach means<br/>
                    • Check out the <strong>Tactics Guide</strong> in the left sidebar for detailed explanations
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 italic">
                    The colors and interactive tooltips help you quickly understand different strategic approaches as you practice!
                  </p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="text-center">
              <button
                onClick={() => setShowColorExplanationModal(false)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl text-sm"
              >
                Got it! Let's practice
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleCloseIntroModal = () => {
    setShowIntroModal(false);
    localStorage.setItem('eva_practice_intro_dismissed', '1');
  };

  // Show loading while scenario is being set up
  if (!currentScenario) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold">Ethical Decision-Making Practice</h1>
          {/* {onExit && (
            <div className="flex items-center space-x-2">
            <button
              onClick={handleReturnToChat}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Return to Chat
            </button>
            </div>
          )} */}
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
    <>
      <PracticeIntroModal isOpen={showIntroModal} onClose={handleCloseIntroModal} />
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
        {/* {onExit && (
          <div className="flex items-center space-x-2">
          <button
            onClick={handleReturnToChat}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Return to Chat
          </button>
          </div>
        )} */}
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
                  // Skip feedback messages for cleaner conversation
                  if (message.role === 'feedback') {
                      return null;
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
                <div className={`mt-4 p-4 rounded-lg ${
                  currentScenario?.sessionSummary?.endingType === 'failure_ending'
                    ? 'bg-red-50/70 dark:bg-red-900/10 border border-red-200/80 dark:border-red-800/30'
                    : 'bg-teal-50/70 dark:bg-teal-900/10 border border-teal-200/80 dark:border-teal-800/30'
                }`}>
                  <h3 className="font-semibold text-lg mb-1 text-center">
                    {currentScenario?.sessionSummary?.endingType === 'failure_ending' ? '❌' : '🎉'} {currentScenario?.sessionSummary?.endingTitle || 'Practice Complete'}
                  </h3>
                  
                  {currentScenario?.sessionSummary?.endingMessage && (
                    <p className="text-center text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4 px-4">
                        {currentScenario.sessionSummary.endingMessage}
                    </p>
                  )}
                  
                  {/* Updated Total Score Display with smaller, more compact sizing */}
                  <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
                    {(() => {
                      // Use the most current score from session summary, fall back to finalScore state
                        let currentScore = currentScenario?.sessionSummary?.totalEvs || finalScore || 0;
                        const maxScore = 8;
                        if (currentScore > maxScore) currentScore = maxScore;
                      const performanceData = calculatePerformanceRating(currentScore);
                      
                      return (
                        <>
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                            {currentScore.toFixed(1)}/8
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Total Ethical Valence Score</div>
                          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-1 ${
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
                          <div className="text-xs text-gray-600 dark:text-gray-400 px-1">
                            {performanceData.description}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Button layout - show both buttons for failure, single button for success */}
                  <div className="flex space-x-3">
                    {currentScenario?.sessionSummary?.endingType === 'failure_ending' ? (
                      <>
                        <button
                          onClick={async () => {
                            setComplianceCount(0);
                            setCurrentScenario(null);
                            setFinalReport(false);
                            setShowFeedbackOptions(false);
                            setSessionSaved(false);
                            setError(null);
                            await loadAndStartScenario();
                          }}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium flex items-center justify-center space-x-2 transition-all duration-200"
                        >
                          <span>🔄</span>
                          <span>Try Again</span>
                        </button>
                        <button
                          onClick={handleGetFeedbackFromEVA}
                          disabled={loading}
                          className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-medium flex items-center justify-center space-x-2 transition-all duration-200"
                        >
                          <span>🤖</span>
                          <span>{loading ? 'Getting Feedback...' : 'Get Feedback from EVA'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleGetFeedbackFromEVA}
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-medium flex items-center justify-center space-x-2 transition-all duration-200"
                      >
                        <span>🤖</span>
                        <span>{loading ? 'Getting Feedback...' : 'Get Feedback from EVA'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Show choices if available and scenario is not complete */}
            {currentScenario?.currentChoices && currentScenario.currentChoices.length > 0 && !currentScenario.isComplete && !finalReport && (
              <div className="bg-white/90 dark:bg-gray-900/90 p-3 shadow-sm backdrop-blur-sm border-t border-gray-200/80 dark:border-gray-700/30">
                
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
                  {currentScenario.currentChoices.map((choice, index) => {
                    const isFirstPractice = isFirstPracticeScenario();
                    const tacticTypeColor = getTacticTypeColor(choice.category);
                    const tacticTypeName = getTacticTypeName(choice.category);
                    
                    return (
                      <button
                        key={index}
                        className={`w-full text-left p-2.5 border rounded-lg transition-all duration-300 text-sm ${
                          processingChoice || isTyping
                            ? 'bg-gray-50/30 dark:bg-gray-800/20 border-gray-200/50 dark:border-gray-700/50 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                            : !isFirstPractice 
                            ? (() => {
                                // Use our unified tactic type detection
                                const tacticType = getTacticTypeName(choice.category);
                                if (tacticType === 'Fallacy') {
                                  return 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer';
                                } else if (tacticType === 'Rhetoric') {
                                  return 'bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40 cursor-pointer';
                                } else if (tacticType === 'Soft') {
                                  return 'bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/40 cursor-pointer';
                                } else if (tacticType === 'Compliance') {
                                  return 'bg-gray-50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800/40 cursor-pointer';
                                } else {
                                  return 'bg-gray-50 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900/40 cursor-pointer';
                                }
                              })()
                            : 'bg-gray-50 dark:bg-gray-800/30 border-gray-200/80 dark:border-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer'
                        }`}
                        onClick={() => handleChoice(index)}
                        disabled={processingChoice || isTyping}
                      >
                        <div className="flex justify-between items-start">
                          <span className="flex-1">{choice.text}</span>
                          {!isFirstPractice && (
                            <span 
                              className={`text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0 cursor-help transition-all duration-200 hover:scale-105 hover:shadow-sm ${getTacticTypeColor(choice.category)}`}
                              onMouseEnter={(e) => handleTacticHover(e, choice.category)}
                              onMouseLeave={handleTacticLeave}
                            >
                              {tacticTypeName}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
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

      {/* Tactic Tooltip */}
      <TacticTooltip />

      {/* Color Explanation Modal */}
              <ColorExplanationModal />

    </div>
    </>
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