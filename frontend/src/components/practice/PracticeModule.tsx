import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../services/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import './practice.css'; // Import the CSS file for animations

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

interface BaseMessage {
  role: string;
  content: string;
  isTyping?: boolean;
}

interface FeedbackMessage extends BaseMessage {
  role: 'feedback';
  evs: number;
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

interface Scenario {
  id: string;
  concern: string;
  issue: string;
  manager_type: string;
  manager_description: string;
  ethical_breach_intensity: string;
  userScore?: number;
  scoreCount?: number;
}

interface ScenarioState {
  scenario: Scenario;
  conversation: Message[];
  currentStatement: string | null;
  currentChoices: string[];
  currentStep: number;
}

interface ResponseFeedback {
  feedback: string;
  evs: number;
  is_complete: boolean;
  next_statement: string | null;
  available_choices: string[];
  final_report?: {
    evaluation: string;
  };
}

interface ScenariosListResponse {
  scenarios: Scenario[];
}

interface PracticeModuleProps {
  onExit?: () => void;
  onComplete?: (results: any) => void;
  scenarioId?: string | null;
  managerType?: string;
}

// Add this function at the top of your component, before the main component definition
const createScenarioFromUserQuery = (userQuery: string, managerType: string): ScenarioState => {
  const issueMatch = userQuery.match(/(concerned about|worried about|issue with|problem with) (.+)$/i);
  const issue = issueMatch ? issueMatch[2] : 'ethical concern in technology';
  const concernMatch = issue.match(/(privacy|data collection|bias|discrimination|security|transparency)/i);
  const concern = concernMatch ? concernMatch[0] : 'Privacy';
  
  // Create manager description based on type
  const managerDescription = getManagerDescription(managerType);
  
  return {
    scenario: {
      id: `custom-scenario-${Date.now()}`,
      concern,
      issue,
      manager_type: managerType,
      manager_description: managerDescription,
      ethical_breach_intensity: 'Medium',
      userScore: 0, // Initialize with zero, will be updated during practice
      scoreCount: 0 // Initialize with zero, will be updated during practice
    },
    conversation: [],
    currentStatement: "Look, we need to get this feature done by next week. Just implement it and we'll deal with these concerns later.",
    currentChoices: [
      "I understand the timeline pressure, but I'm concerned about compliance issues. Maybe we should have a quick chat with legal first?",
      "Before we commit, could we take a day to run some user tests to see if this is even necessary?",
      "I'll implement it, but I think we should note in our documentation that we need to revisit these issues later.",
      "You're right, I'll get it done by next week."
    ],
    currentStep: 0
  };
};

// Helper function to get manager descriptions
const getManagerDescription = (managerType: string): string => {
  switch(managerType.toUpperCase()) {
    case 'PUPPETEER':
      return "This manager actively pressures employees to engage in unethical behavior through direct orders, intimidation, and creating environments where ethical violations feel necessary.";
    case 'DILUTER':
      return "This manager acknowledges ethical concerns but systematically minimizes their importance or urgency, suggesting they're not applicable in the current context.";
    case 'CAMOUFLAGER':
      return "This manager disguises unethical requests as standard business practices or hides problematic aspects behind technical language and euphemisms.";
    default:
      return "This manager type focuses on making decisions that balance business needs with ethical considerations.";
  }
};

// Helper function to get score based on choice index and current step
const getChoiceScore = (choiceIndex: number, currentStep: number): number => {
  // Map of optimal choice indices for each step
  const optimalChoices = [0, 0, 0, 1, 0];
  // Map of worst choice indices for each step
  const worstChoices = [1, 1, 1, 2, 1];
  
  // Score based on choice quality
  if (choiceIndex === optimalChoices[currentStep]) {
    return 90 + Math.floor(Math.random() * 10); // 90-99
  } else if (choiceIndex === worstChoices[currentStep]) {
    return 20 + Math.floor(Math.random() * 30); // 20-49
  } else {
    return 50 + Math.floor(Math.random() * 30); // 50-79
  }
};

// Helper function to evaluate a choice
const evaluateChoice = (choice: string, managerType: string, choiceIndex: number, currentStep: number): ResponseFeedback => {
  let feedback = '';
  let evs = 0; // Ethical Value Score
  let nextStatement = '';
  let nextChoices: string[] = [];
  let isComplete = false;
  
  // Map of optimal choice indices for each manager type
  const optimalChoices: {[key: string]: number} = {
    'PUPPETEER': 0, // Pushing back while acknowledging pressure
    'DILUTER': 0,   // Standing firm on ethical principles
    'CAMOUFLAGER': 0 // Calling out the camouflaging
  };
  
  // Map of worst choice indices for each manager type
  const worstChoices: {[key: string]: number} = {
    'PUPPETEER': 1, // Immediate compliance
    'DILUTER': 1,   // Agreeing it's not a big deal
    'CAMOUFLAGER': 1 // Accepting the framing
  };
  
  // Score based on choice quality
  if (choiceIndex === optimalChoices[managerType.toUpperCase()]) {
    evs = 85 + Math.floor(Math.random() * 15); // 85-99
    feedback = "Excellent response! You stood firm on ethical principles while remaining professional. This approach directly addresses the ethical issue without being confrontational.";
  } else if (choiceIndex === worstChoices[managerType.toUpperCase()]) {
    evs = 20 + Math.floor(Math.random() * 30); // 20-49
    feedback = "This response fails to address the ethical concern and essentially enables the problematic practice. Consider how you might advocate for ethics while still respecting the management chain.";
  } else {
    evs = 50 + Math.floor(Math.random() * 30); // 50-79
    feedback = "This response strikes a balance between ethical concerns and business needs. You've maintained your ethical stance while offering practical alternatives.";
  }
  
  // Different responses for each step of the conversation
  switch(currentStep) {
    case 0:
      if (choiceIndex === optimalChoices[managerType.toUpperCase()]) {
        nextStatement = "I appreciate your perspective, but I need you to be a team player here. Let's compromise - can you implement a limited version for now?";
      } else if (choiceIndex === worstChoices[managerType.toUpperCase()]) {
        nextStatement = "Great, I knew I could count on you. Let's also expand this to collect user browsing history while we're at it.";
      } else {
        nextStatement = "I see your point. Let's discuss this further with the team before making a final decision.";
      }
      
      nextChoices = [
        "I can implement a version that collects only anonymous, aggregated data with explicit user consent.",
        "Okay, I'll implement it as requested, but I want my concerns documented.",
        "I need to escalate this to higher management or ethics committee before proceeding.",
        "What specific business goals are we trying to achieve? Maybe there's another approach."
      ];
      break;
    
    case 1:
      if (choiceIndex === optimalChoices[managerType.toUpperCase()]) {
        nextStatement = "That's not going to work for us. The executives are expecting full user data. The competition is already doing this - we're just catching up. Don't you want the company to succeed?";
      } else if (choiceIndex === worstChoices[managerType.toUpperCase()]) {
        nextStatement = "Perfect. And let's not mention the full scope of data collection in the privacy policy - just keep it vague. Users never read those anyway.";
      } else {
        nextStatement = "Our goal is to boost user engagement and retention. We need this data to better understand user behavior and tailor our product accordingly.";
      }
      
      nextChoices = [
        "Success built on unethical practices isn't sustainable. We should differentiate ourselves with stronger privacy protections.",
        "You're right, I'll implement everything as requested to help the company succeed.",
        "Could we conduct a user survey first to see if they'd be willing to share this data in exchange for better features?",
        "I'm concerned about regulatory compliance risks."
      ];
      break;
    
    case 2:
      if (choiceIndex === optimalChoices[managerType.toUpperCase()]) {
        nextStatement = "You're being naive. This is how business works in the real world. I need you to be practical here - implement this feature by the end of the week or I'll find someone who will.";
      } else if (choiceIndex === worstChoices[managerType.toUpperCase()]) {
        nextStatement = "Excellent! I'll let the executives know you're on board. By the way, we should also track user contacts and their social connections while we're at it.";
      } else {
        nextStatement = "We don't have time for surveys or regulatory analysis. Our competitors are moving fast, and we need to keep pace. Can I count on you to implement this?";
      }
      
      nextChoices = [
        "I'll document this conversation and escalate to HR, as this request violates our company ethics policy.",
        "Since you put it that way, I'll implement it exactly as requested.",
        "I'll implement a modified version that meets business needs while minimizing ethical concerns.",
        "I'll implement it if you provide written confirmation of this request and accept responsibility for any issues that arise."
      ];
      break;
    
    case 3:
      if (choiceIndex === optimalChoices[managerType.toUpperCase()]) {
        nextStatement = "Are you threatening me? Look, let's be reasonable. What if we offer users an incentive for sharing their data? Would that address your concerns?";
      } else if (choiceIndex === worstChoices[managerType.toUpperCase()]) {
        nextStatement = "I knew you'd come around. Once we have this data, we can also start selling it to our marketing partners. That's where the real money is.";
      } else {
        nextStatement = "Fine, we can make some adjustments, but I need the core functionality in place. The executives are expecting a demo next week.";
      }
      
      nextChoices = [
        "Transparency and genuine consent are key. We should clearly inform users what data we're collecting and why.",
        "Selling user data without explicit consent could violate multiple regulations. I can't be part of that.",
        "I'll build the demo with synthetic data first, so we can show the functionality without using real user data.",
        "I think we need legal consultation before proceeding with any of this."
      ];
      break;
    
    case 4:
      // This is the final round - after this, we display the final evaluation
      isComplete = true;
      nextStatement = '';
      nextChoices = [];
      break;
  }
  
  // For the final report, ensure the evaluation message has a score that doesn't exceed 100
  const finalEvaluation = isComplete ? {
    evaluation: `Your ethical decision-making score is ${Math.min(evs, 100)}/100. ${evs >= 80 ? 'You demonstrated excellent ethical judgment!' : evs >= 50 ? 'You showed good awareness of ethical principles.' : 'Consider being more assertive in upholding ethical standards.'}`
  } : undefined;
  
  return {
    feedback,
    evs,
    is_complete: isComplete,
    next_statement: nextStatement,
    available_choices: nextChoices,
    ...(isComplete && { final_report: finalEvaluation })
  };
};

// Add PracticeResponse interface right after other interface definitions
interface PracticeResponse {
  role?: string;
  content?: string;
  question?: string;
  userResponse?: string;
  score?: number;
}

export const PracticeModule: React.FC<PracticeModuleProps> = ({ 
  onExit,
  onComplete,
  scenarioId,
  managerType 
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<ScenarioState | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingChoice, setProcessingChoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ResponseFeedback | null>(null);
  const [conversationId, setConversationId] = useState<string>('practice-' + Math.random().toString(36).substring(7));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [finalReport, setFinalReport] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [currentFeedback, setCurrentFeedback] = useState<string>('');
  const navigate = useNavigate();

  // Get original conversation ID from localStorage or props
  const originalConversationId = useRef<string | null>(
    localStorage.getItem('originalConversationId')
  );
  
  // Track the original conversation ID when component mounts
  useEffect(() => {
    // If we don't have an original conversation ID yet, check localStorage
    if (!originalConversationId.current) {
      const storedId = localStorage.getItem('originalConversationId');
      if (storedId) {
        originalConversationId.current = storedId;
        console.log('Retrieved original conversation ID:', storedId);
      }
    }
  }, []);

  // Fix the scrolling function to ensure it works consistently but with gentler movement
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      try {
        // Directly scroll to the messages end ref with gentler behavior
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest' // Less aggressive scrolling
        });
        
        console.log("Direct scroll executed");
        
        // Also try a fallback scroll approach with the parent
        const container = messagesEndRef.current.parentElement;
        if (container) {
          console.log("Also scrolling container");
          
          // Calculate a gentler scroll position (not all the way to the bottom)
          const targetPosition = messagesEndRef.current.offsetTop - container.clientHeight * 0.7;
          
          // Force scroll with a timeout to ensure DOM has updated
          setTimeout(() => {
            container.scrollTo({
              top: targetPosition > 0 ? targetPosition : 0,
              behavior: 'smooth'
            });
          }, 50);
        }
      } catch (err) {
        console.error("Scrolling failed:", err);
      }
    } else {
      console.warn("messagesEndRef.current is null");
    }
  };

  // Use useEffect to scroll to bottom when messages change
  useEffect(() => {
    // Add a small delay to ensure rendering is complete
    const timer = setTimeout(() => {
      console.log("Message change detected, scrolling...");
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [currentScenario?.conversation]);

  // Add an additional effect to handle scrolling after feedback is shown
  useEffect(() => {
    if (currentFeedback) {
      // Use a slightly longer timeout to ensure the feedback has rendered
      const timer = setTimeout(() => {
        console.log("Feedback change detected, scrolling...");
        scrollToBottom();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentFeedback]);

  // Initialize with a custom scenario based on the user's query
  useEffect(() => {
    setLoading(true);
    
    // Try to get the user query and manager type from props or localStorage
    const userQuery = localStorage.getItem('practice_user_query') || 'I am concerned about collecting user location data even though it is not required for our application';
    const effectiveManagerType = managerType || localStorage.getItem('practice_manager_type') || 'PUPPETEER';
    
    // Create a custom scenario based on the user's query
    const customScenario = createScenarioFromUserQuery(userQuery, effectiveManagerType);
    
    // Initialize the conversation with the user's query and the manager's first statement
    customScenario.conversation = [
      {
        role: 'user',
        content: userQuery
      } as UserMessage,
      {
        role: 'manager',
        content: customScenario.currentStatement || ''
      } as ManagerMessage
    ];
    
    setCurrentScenario(customScenario);
    setLoading(false);
    
    // Clean up
    return () => {
      localStorage.removeItem('practice_user_query');
      localStorage.removeItem('practice_agent_response');
    };
  }, [managerType]);

  const handleChoice = async (choiceIndex: number) => {
    if (!currentScenario) return;
    
    // Set processing state to disable buttons during animation
    setProcessingChoice(true);
    
    try {
      // Record the current state before we update
      const currentChoices = {...currentScenario.scenario};
      const userChoice = currentScenario.currentChoices[choiceIndex];
      
      // Get score from evaluateChoice instead of getChoiceScore for consistency
      const evaluation = evaluateChoice(
        userChoice, 
        currentScenario.scenario.manager_type, 
        choiceIndex, 
        currentScenario.currentStep
      );
      
      // Use the score from the evaluation
      const roundScore = evaluation.evs;
      const currentRound = currentScenario.currentStep + 1;
      
      // Store practice selection details in localStorage
      localStorage.setItem('practice_selected_choice', userChoice);
      localStorage.setItem('practice_score', roundScore.toString());
      localStorage.setItem('practice_round', currentRound.toString());
      localStorage.setItem('practice_manager_type', currentScenario.scenario.manager_type);
      
      // Store the complete feedback including conversation history
      localStorage.setItem('practice_feedback', JSON.stringify({
        managerType: currentScenario.scenario.manager_type,
        totalRounds: 5,
        currentRound: currentRound,
        choice: userChoice,
        score: roundScore,
        feedback: evaluation.feedback
      }));
      
      // Update scores in the scenario with the actual EVS score from evaluation
      currentChoices.userScore = (currentChoices.userScore || 0) + roundScore;
      currentChoices.scoreCount = (currentChoices.scoreCount || 0) + 1;
      
      // First, add only the user message to the conversation
      const userMessageOnly = [
        ...currentScenario.conversation,
        { role: 'user', content: userChoice } as UserMessage,
      ];
      
      // Update the state to show only the user's message first
      setCurrentScenario({
        ...currentScenario,
        conversation: userMessageOnly
      });
      
      // Force scroll after user's message
      setTimeout(() => {
        console.log("User message added, scrolling...");
        scrollToBottom();
      }, 100);
      
      // Now prepare the full updated conversation that will include manager response
      const updatedConversation = [...userMessageOnly];
      
      if (!evaluation.is_complete) {
        // Set a timeout to simulate the manager thinking
        setTimeout(() => {
          // Add the manager's typing indicator
          const typingIndicator = {
            role: 'manager',
            content: '...',
            isTyping: true
          };
          
          // Show typing indicator
          setCurrentScenario(prevState => ({
            ...prevState!,
            conversation: [...userMessageOnly, typingIndicator as any]
          }));
          
          // Force scroll for typing indicator
          setTimeout(() => {
            console.log("Typing indicator added, scrolling...");
            scrollToBottom();
          }, 50);
          
          // After a delay, show the manager's response and feedback
          setTimeout(() => {
            // If not complete, add the feedback and continue
            updatedConversation.push({ 
              role: 'feedback', 
              content: evaluation.feedback,
              evs: roundScore 
            } as FeedbackMessage);
            
            updatedConversation.push({
              role: 'manager',
              content: evaluation.next_statement || ''
            } as ManagerMessage);
            
            // Fix the feedback type issue
            setFeedback({
              feedback: evaluation.feedback,
              evs: roundScore,
              is_complete: false,
              next_statement: evaluation.next_statement,
              available_choices: evaluation.available_choices
            });
            
            // Update the current feedback state to force animation refresh
            setCurrentFeedback(`${evaluation.feedback}-${roundScore}-${Date.now()}`);
            
            // Update the current scenario
            setCurrentScenario({
              ...currentScenario,
              scenario: currentChoices,
              conversation: updatedConversation,
              currentStatement: evaluation.next_statement || null,
              currentChoices: evaluation.available_choices || [],
              currentStep: currentScenario.currentStep + 1
            });
            
            // End processing state after everything is updated
            setProcessingChoice(false);
            
            // Force scroll for manager response and feedback
            setTimeout(() => {
              console.log("Manager response added, scrolling...");
              scrollToBottom();
            }, 200);
          }, 1500); // Show the response after 1.5 seconds
        }, 800); // Start typing after 0.8 seconds
      } else {
        // For the final round, also use delays
        setTimeout(() => {
          // Add the manager's typing indicator for the final response
          const typingIndicator = {
            role: 'manager',
            content: '...',
            isTyping: true
          };
          
          // Show typing indicator
          setCurrentScenario(prevState => ({
            ...prevState!,
            conversation: [...userMessageOnly, typingIndicator as any]
          }));
          
          // Force scroll for final typing indicator
          setTimeout(() => {
            console.log("Final typing indicator, scrolling...");
            scrollToBottom();
          }, 50);
          
          // After a delay, show the final feedback
          setTimeout(() => {
            // Practice session complete - add feedback
            updatedConversation.push({ 
              role: 'feedback', 
              content: evaluation.feedback,
              evs: roundScore 
            } as FeedbackMessage);
            
            // Update the current feedback state to force animation refresh for the final feedback
            // Using a special marker for final feedback
            setCurrentFeedback(`${evaluation.feedback}-${roundScore}-final-${Date.now()}`);
            
            // Add final evaluation
            if (evaluation.final_report) {
              // Calculate final score properly
              const totalScore = currentChoices.userScore || 0;
              const scoreCount = currentChoices.scoreCount || 1;
              
              // Calculate average score from individual round scores
              const averageScore = Math.round(totalScore / scoreCount);
              
              // Create a final evaluation message with the correct score
              const finalEvalContent = `Your ethical decision-making score is ${averageScore}/100. ${
                averageScore >= 80 
                  ? 'You demonstrated excellent ethical judgment!' 
                  : averageScore >= 50 
                    ? 'You showed good awareness of ethical principles.' 
                    : 'Consider being more assertive in upholding ethical standards.'
              }`;
              
              updatedConversation.push({
                role: 'final_evaluation',
                content: finalEvalContent
              } as FinalEvaluationMessage);
              
              // Store the final score for feedback
              localStorage.setItem('practice_final_score', averageScore.toString());
              setFinalScore(averageScore);
            }
            
            // Show completion status
            setCurrentScenario({
              ...currentScenario,
              scenario: currentChoices,
              conversation: updatedConversation,
              currentStatement: null,
              currentChoices: [],
              currentStep: currentScenario.currentStep + 1
            });
            
            // End processing state before showing final report options
            setProcessingChoice(false);
            
            // Set final report state after a short delay to ensure smooth transition
            setTimeout(() => {
              // Then set final report and options
              setFinalReport(true);
              setShowOptions(true);
              
              // Force scroll for final report
              setTimeout(() => {
                console.log("Final report shown, scrolling...");
                scrollToBottom();
              }, 100);
            }, 800);
          }, 1500); // Show the final response after 1.5 seconds
        }, 800); // Start typing after 0.8 seconds
      }
    } catch (err: any) {
      console.error("Error processing choice:", err);
      setError("Failed to process your choice. Please try again.");
      setProcessingChoice(false); // Make sure to reset processing state on error
    } finally {
      setLoading(false); // Keep this to ensure loading is reset
    }
  };

  // Replace the old handleGetFeedback function completely
  const handleGetFeedback = () => {
    console.log('Get Feedback button clicked, using enhanced feedback request');
    // Call our improved submitFeedbackRequest function
    submitFeedbackRequest().catch(error => {
      console.error('Error processing feedback request:', error);
      if (onExit) {
        onExit();
      } else {
        navigate("/");
      }
    });
  };

  const handlePracticeAgain = () => {
    console.log('Practice Again button clicked');
    setLoading(true);
    
    try {
      // Save current practice history before starting a new session
      if (currentScenario && currentScenario.conversation && currentScenario.conversation.length > 0) {
        // Get existing practice history or initialize a new array
        const existingHistory = localStorage.getItem('practice_history') || '[]';
        try {
          const historyArray = JSON.parse(existingHistory);
          
          // Add current session to history with timestamp and score
          const sessionSummary = {
            id: `practice-${Date.now()}`,
            timestamp: new Date().toISOString(),
            score: finalScore,
            managerType: currentScenario.scenario?.manager_type || 'unknown',
            issue: currentScenario.scenario?.issue || 'ethical dilemma',
            conversation: currentScenario.conversation
          };
          
          // Add to history and save back to localStorage
          historyArray.push(sessionSummary);
          localStorage.setItem('practice_history', JSON.stringify(historyArray));
          
          console.log('Saved practice session to history:', sessionSummary.id);
        } catch (parseError) {
          console.error('Error parsing practice history:', parseError);
        }
      }
      
      // Use a setTimeout to ensure state has been reset before creating a new scenario
      setTimeout(() => {
        try {
          // Create a new scenario with the same parameters
          const userQuery = localStorage.getItem('practice_user_query') || 'I am concerned about collecting user location data even though it is not required for our application';
          const effectiveManagerType = managerType || localStorage.getItem('practice_manager_type') || 'PUPPETEER';
          
          console.log('Creating new scenario with:', { userQuery, effectiveManagerType });
          
          // Create a fresh scenario with a new ID to ensure complete reset
          const freshScenario = createScenarioFromUserQuery(userQuery, effectiveManagerType);
          freshScenario.scenario.id = 'custom-scenario-' + Date.now(); // Ensure unique ID
          
          // Initialize the conversation for the new scenario
          freshScenario.conversation = [
            {
              role: 'user',
              content: userQuery
            } as UserMessage,
            {
              role: 'manager',
              content: freshScenario.currentStatement || ''
            } as ManagerMessage
          ];
          
          // Add a reset marker to identify this is a new practice session
          localStorage.setItem('practice_is_new_session', 'true');
          
          // Update state with the new scenario
          setCurrentScenario(freshScenario);
          setLoading(false);
          
          // Reset UI state for new session
          setFinalReport(false);
          setShowOptions(false);
          setFinalScore(0);
          
          console.log('Created new practice scenario:', freshScenario.scenario.id);
        } catch (error) {
          console.error('Error creating new scenario:', error);
          setError('Failed to create a new practice scenario. Please try again.');
          setLoading(false);
        }
      }, 300); // Increase timeout slightly to ensure state is updated
    } catch (error) {
      console.error('Error in practice again flow:', error);
      setError('Failed to reset and create a new practice scenario. Please try again.');
      setLoading(false);
    }
  };

  const resetSession = () => {
    console.log('Resetting practice session');
    try {
      // Clear the current scenario state
      setCurrentScenario(null);
      setFeedback(null);
      
      // Generate a new conversation ID
      const newConversationId = 'practice-' + Math.random().toString(36).substring(7);
      console.log('New conversation ID:', newConversationId);
      setConversationId(newConversationId);
      
      // Reset UI states
      setError(null);
      setFinalReport(false);
      setShowOptions(false);
      setFinalScore(0);
      
      // Clear specific localStorage values that might affect a new session
      // but keep feedback data if we're returning with feedback
      const preserveFeedback = localStorage.getItem('practice_returning_with_feedback') === 'true';
      console.log('Preserving feedback data:', preserveFeedback);
      
      localStorage.removeItem('practice_selected_choice');
      localStorage.removeItem('practice_score');
      localStorage.removeItem('practice_round');
      localStorage.removeItem('practice_returning_with_feedback');
      
      // Only clear these if we're not returning with feedback
      if (!preserveFeedback) {
        localStorage.removeItem('practice_feedback');
        localStorage.removeItem('practice_final_score');
        localStorage.removeItem('practice_user_query');
        localStorage.removeItem('practice_manager_type');
        localStorage.removeItem('practice_agent_response');
        localStorage.removeItem('return_to_chat');
      }
      
      console.log('Session reset complete');
      return true;
    } catch (err) {
      console.error('Error resetting session:', err);
      setError('Failed to reset session. Please try again.');
      return false;
    }
  };

  const handleReturnToChat = () => {
    console.log('Return to Chat button clicked');
    
    // Check if we have feedback to send
    const hasFeedback = finalReport && finalScore > 0;
    
    if (hasFeedback) {
      console.log('Returning to chat with feedback, not clearing feedback data');
      // Set a flag to indicate we're returning with feedback
      localStorage.setItem('practice_returning_with_feedback', 'true');
    } else {
      // Attempt normal cleanup if we're not returning with feedback
      console.log('Returning to chat without feedback, doing normal cleanup');
      resetSession();
    }
    
    // Call the onExit prop directly if provided
    if (onExit) {
      console.log('Calling onExit callback to return to chat');
      onExit();
    } else {
      // Fallback if onExit isn't provided
      console.log('No onExit callback provided, navigating directly');
      window.location.href = '/';
    }
  };

  const getScenarioIntensityColor = (intensity: string) => {
    switch (intensity.toLowerCase()) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-orange-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getMessageStyle = (role: string) => {
    switch (role) {
      case 'manager':
        return 'p-3 pl-5 bg-amber-50/70 dark:bg-amber-900/10 border-2 border-amber-200 dark:border-amber-800 rounded-2xl rounded-tl-none max-w-[80%] mr-auto relative mt-3';
      case 'user':
        return 'p-3 bg-blue-50/70 dark:bg-blue-900/10 border border-blue-200/80 dark:border-blue-800/30 rounded-2xl rounded-tr-none max-w-[80%] ml-auto';
      case 'feedback':
        return 'p-2 bg-indigo-50/70 dark:bg-indigo-900/10 border border-indigo-200/80 dark:border-indigo-800/30 rounded-lg w-full my-1 text-sm'; // Smaller padding and font
      case 'final_evaluation':
        return 'p-3 bg-teal-50/70 dark:bg-teal-900/10 border border-teal-200/80 dark:border-teal-800/30 rounded-lg w-full my-3';
      default:
        return 'p-3 bg-gray-50/70 dark:bg-gray-800/30 border border-gray-200/80 dark:border-gray-700/30 rounded-lg';
    }
  };

  // Add a second useEffect to handle auto-selection of scenarios by manager type
  useEffect(() => {
    // If we have scenarios loaded and a manager type specified
    if (scenarios.length > 0 && managerType && !currentScenario) {
      console.log(`Filtering for scenarios with manager type: ${managerType}`);
      
      // Find scenarios matching the manager type
      const matchingScenarios = scenarios.filter(
        s => s.manager_type.toUpperCase() === managerType.toUpperCase()
      );
      
      console.log(`Found ${matchingScenarios.length} matching scenarios`);
      
      // This code is no longer needed since we're creating scenarios directly
      // It's replaced by the custom scenario creation in the other useEffect
    }
  }, [scenarios, managerType, currentScenario]);

  const handleFinishPractice = () => {
    if (currentScenario && currentScenario.conversation) {
      // Set final score instead of a responsiveness score
      setFinalScore(finalScore);
      setShowOptions(true);
      setFinalReport(true);
    }
    
    // Prepare feedback request when practice is finished
    // handleGetFeedback is called here but we'll let the user click the button manually
    // to avoid forcing an immediate transition to chat
    
    console.log('Practice session completed, showing completion options');
  };

  // Submit practice score to the backend
  useEffect(() => {
    const handlePracticeFeedback = async () => {
      const feedbackPrompt = localStorage.getItem("practice_feedback_prompt");
      const practiceScore = localStorage.getItem("practice_score");
      
      if (feedbackPrompt && practiceScore && conversationId) {
        console.log("Submitting practice score to backend:", practiceScore, "for conversation:", conversationId);
        
        // Send the score to the database
        try {
          // Ensure the conversation ID is in UUID format if possible
          let formattedConversationId = conversationId;
          
          // Try the direct endpoint first (most likely to work)
          try {
            const response = await fetch("/api/v1/practice-score/submit", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                score: parseInt(practiceScore, 10),
                conversationId: formattedConversationId
              }),
            });
            
            if (!response.ok) {
              console.error("Failed to send practice score to database, status:", response.status);
              const responseText = await response.text();
              console.error("Error response:", responseText);
              throw new Error(`Server returned ${response.status}: ${responseText}`);
            } else {
              console.log("Successfully sent practice score to database");
              const responseData = await response.json();
              console.log("Response data:", responseData);
            }
          } catch (error) {
            console.error("Error sending practice score to backend:", error);
            
            // If the direct endpoint fails, try the fallback
            console.log("Attempting fallback endpoint");
            try {
              const fallbackResponse = await fetch("/api/practice-score", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  score: parseInt(practiceScore, 10),
                  conversationId: formattedConversationId
                }),
              });
              
              if (!fallbackResponse.ok) {
                console.error("Fallback endpoint also failed:", fallbackResponse.status);
                const responseText = await fallbackResponse.text();
                console.error("Error response:", responseText);
              } else {
                console.log("Fallback endpoint succeeded");
                const responseData = await fallbackResponse.json();
                console.log("Response data:", responseData);
              }
            } catch (fallbackError) {
              console.error("Fallback endpoint error:", fallbackError);
            }
          }
        } catch (error) {
          console.error("Fatal error sending practice score to database:", error);
        }
        
        // Clear the practice score from localStorage
        localStorage.removeItem("practice_score");
      }
    };
    
    handlePracticeFeedback();
  }, [conversationId]);

  // Add safe event dispatching with browser compatibility checks
  const dispatchFeedbackEvent = () => {
    try {
      // Create and dispatch the event with compatibility checks
      if (typeof window !== 'undefined' && window.document) {
        let event;
        if (typeof Event === 'function') {
          // Modern browsers
          event = new Event('practice-feedback-request');
        } else {
          // IE11 and older browsers
          event = document.createEvent('Event');
          event.initEvent('practice-feedback-request', true, true);
        }
        window.dispatchEvent(event);
        console.log('Practice feedback event dispatched successfully');
      } else {
        console.warn('Window or document not available, could not dispatch event');
      }
    } catch (error) {
      console.error('Error dispatching practice feedback event:', error);
      // Continue with flow even if event dispatch fails
    }
  };

  // Store original conversation ID when entering practice mode
  useEffect(() => {
    // Get the conversation ID that was active when entering practice mode
    const currentConvId = localStorage.getItem('current-conversation-id') || localStorage.getItem('currentConversationId');
    if (currentConvId && !currentConvId.startsWith('practice-')) {
      console.log('Storing original conversation ID:', currentConvId);
      localStorage.setItem('originalConversationId', currentConvId);
      // Also ensure it's stored in the ref for immediate access
      originalConversationId.current = currentConvId;
    }
  }, []);
  
  // Fix the submitFeedbackRequest function
  const submitFeedbackRequest = async () => {
    try {
      // Only submit score if we have a current scenario
      if (currentScenario && typeof finalScore === 'number') {
        // Map scenario conversation to practice responses
        const practiceResponses: PracticeResponse[] = currentScenario.conversation.map(m => {
          return {
            role: m.role,
            content: m.content,
            question: m.role === 'manager' ? m.content : undefined,
            userResponse: m.role === 'user' ? m.content : undefined,
            // Use type check instead of instanceof for feedback messages
            score: m.role === 'feedback' ? (m as FeedbackMessage).evs : undefined
          };
        });
        
        await submitPracticeScore(finalScore, practiceResponses);
      }
      
      // Set feedback request in localStorage
      const userQuery = localStorage.getItem('practice_user_query') || '';
      const managerType = localStorage.getItem('practice_manager_type') || 'Unknown';
      const currentScore = finalScore;
      
      // Create practice responses from current scenario if available
      const practiceResponses: PracticeResponse[] = currentScenario ? 
        currentScenario.conversation.map(m => {
          return {
            role: m.role,
            content: m.content,
            question: m.role === 'manager' ? m.content : undefined,
            userResponse: m.role === 'user' ? m.content : undefined,
            score: m.role === 'feedback' ? (m as FeedbackMessage).evs : undefined
          };
        }) : [];
      
      // IMPORTANT: Create a SIMPLE prompt for user display
      const userVisiblePrompt = `I've just completed a practice scenario with a ${managerType} manager about "${userQuery}". My ethical decision-making score was ${currentScore}/100. Can you provide detailed feedback on my performance?`;
      
      // Generate the detailed prompt for the backend only
      const completeFeedbackPrompt = generateDetailedFeedbackPrompt(
        userQuery, 
        managerType, 
        currentScore, 
        currentScenario?.conversation || [] // Pass empty array if null
      );
      
      // Store both prompts - the simple one for display, detailed one for API
      localStorage.setItem('feedbackRequest', userVisiblePrompt);
      localStorage.setItem('practice_feedback_prompt', completeFeedbackPrompt);
      localStorage.setItem('practice_feedback_simple', userVisiblePrompt);
      
      // CRITICAL: Determine the correct original conversation ID from multiple possible sources
      let originalConversationIdValue = localStorage.getItem('originalConversationId') || 
                                    localStorage.getItem('current-conversation-id') || 
                                    originalConversationId.current || 
                                    conversationId;
                                    
      // Log all possible IDs for debugging
      console.log('Conversation ID options:', {
        'from originalConversationId localStorage': localStorage.getItem('originalConversationId'),
        'from current-conversation-id': localStorage.getItem('current-conversation-id'),
        'from originalConversationId.current': originalConversationId.current,
        'from conversationId state': conversationId,
        'final chosen ID': originalConversationIdValue
      });
      
      // Ensure we're not using a practice conversation ID
      if (originalConversationIdValue && originalConversationIdValue.startsWith('practice-')) {
        console.warn('Original conversation ID appears to be a practice ID, searching for a better ID');
        // Try to find a non-practice ID from other sources
        const alternateId = localStorage.getItem('current-conversation-id') || 
                           localStorage.getItem('currentConversationId');
        if (alternateId && !alternateId.startsWith('practice-')) {
          originalConversationIdValue = alternateId;
          console.log('Found better conversation ID:', originalConversationIdValue);
        }
      }
      
      console.log('Using original conversation ID for feedback:', originalConversationIdValue);
      
      // Store the ID to use in the chat window - use BOTH formats for maximum compatibility
      localStorage.setItem('currentConversationId', originalConversationIdValue);
      localStorage.setItem('current-conversation-id', originalConversationIdValue);
      
      // Generate a message ID
      const messageId = `user-practice-${Date.now()}`;
      
      // Create a properly formatted user message object with the SIMPLE prompt
      const userMessage = {
        id: messageId,
        role: 'user',
        content: userVisiblePrompt, // Use simple prompt for the visible message
        conversationId: originalConversationIdValue,
        createdAt: new Date().toISOString()
      };
      
      // IMPORTANT: Try to get existing messages and APPEND to them, not replace
      let existingMessages = [];
      try {
        // Check each possible storage format for existing messages
        const storageKeys = [
          `messages_${originalConversationIdValue}`,
          `messages-${originalConversationIdValue}`,
          `exact_messages_${originalConversationIdValue}`,
          `backup_messages_${originalConversationIdValue}`
        ];
        
        for (const key of storageKeys) {
          const storedData = localStorage.getItem(key);
          if (storedData) {
            const parsedMessages = JSON.parse(storedData);
            if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
              console.log(`Found ${parsedMessages.length} existing messages in ${key}`);
              existingMessages = parsedMessages;
              break;
            }
          }
        }
      } catch (e) {
        console.error('Error reading existing messages:', e);
      }
      
      // Check if there are existing messages to append to
      if (existingMessages.length > 0) {
        console.log('Appending feedback message to existing messages');
        // Add the user message to existing messages
        existingMessages.push(userMessage);
      } else {
        console.log('No existing messages found, creating new message array');
        existingMessages = [userMessage];
      }
      
      // Save the updated messages to all storage formats
      const messagesJSON = JSON.stringify(existingMessages);
      localStorage.setItem(`messages_${originalConversationIdValue}`, messagesJSON);
      localStorage.setItem(`messages-${originalConversationIdValue}`, messagesJSON);
      localStorage.setItem(`exact_messages_${originalConversationIdValue}`, messagesJSON);
      localStorage.setItem(`backup_messages_${originalConversationIdValue}`, messagesJSON);
      
      // Store the complete practice data for the agent
      localStorage.setItem('practice_data', JSON.stringify({
        userQuery,
        managerType,
        finalScore: currentScore,
        responses: practiceResponses,
        // Store BOTH prompts - user visible and backend complete
        userVisiblePrompt: userVisiblePrompt,
        feedbackPrompt: completeFeedbackPrompt,
        messageId: messageId,
        conversationId: originalConversationIdValue,
        needNewConversation: false // Don't create a new conversation, use the original one
      }));
      
      // Set the flag that we're transitioning from practice to chat
      localStorage.setItem('practice_to_chat', 'true');
      localStorage.setItem('practice_message_preloaded', 'true');
      localStorage.setItem('practice_use_simple_prompt', 'true'); // Flag to use simple prompt in UI
      
      // Force the use of the original conversation
      localStorage.setItem('force_conversation_id', originalConversationIdValue);
      
      // Dispatch a custom event to notify that feedback is requested
      dispatchFeedbackEvent();
      
      // Call the onExit callback to return to chat view
      if (onExit) {
        onExit();
      }
    } catch (error) {
      console.error('Error submitting feedback request:', error);
    }
  };
  
  // Fix submitPracticeScore function to properly handle types
  const submitPracticeScore = async (score: number, responses: PracticeResponse[]) => {
    try {
      // Get required data from localStorage
      const conversationId = localStorage.getItem('currentConversationId') || undefined;
      const userId = localStorage.getItem('userId') || 'anonymous';
      
      // If conversationId is a draft ID, create a proper UUID-formatted ID
      let validConversationId = conversationId;
      if (conversationId && conversationId.startsWith('draft-')) {
        // Generate a proper UUID for draft conversations
        validConversationId = crypto.randomUUID();
        console.log('Generated valid UUID for draft conversation:', validConversationId);
      }
      
      // Create data object
      const practiceScoreData = {
        conversationId: validConversationId,
        userId,
        score
      };
      
      console.log('Submitting practice score:', practiceScoreData);
      
      // Store score locally first as a backup
      storeScoreLocally(practiceScoreData, responses);
      
      // Try multiple endpoints with different formats for maximum compatibility
      const endpoints = [
        '/api/v1/practice-score/submit',   // Spring endpoint
        '/api/practice-score'              // Alternative simpler endpoint
      ];
      
      let success = false;
      let attempts = 0;
      
      // Try different endpoints and formats
      for (const endpoint of endpoints) {
        if (success) break;
        
        try {
          console.log(`Trying to submit score to ${endpoint}...`);
          
          // Try with fetch API for more control
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              score: score,
              conversationId: validConversationId
            }),
          });
          
          if (response.ok) {
            console.log(`Successfully submitted practice score to ${endpoint}`);
            success = true;
            break;
          } else {
            const errorText = await response.text();
            console.error(`Failed to submit to ${endpoint}: ${response.status} ${errorText}`);
          }
        } catch (error) {
          console.error(`Error submitting to ${endpoint}:`, error);
        }
        
        attempts++;
      }
      
      // Fallback to axios/api library if fetch attempts failed
      if (!success) {
        try {
          console.log('Trying axios fallback...');
          const response = await api.post('/api/v1/practice-score/submit', {
            score: score,
            conversationId: validConversationId
          });
          console.log('Successfully submitted practice score via axios:', response.data);
          success = true;
        } catch (error) {
          console.error('Axios fallback also failed:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error in submitPracticeScore:', error);
      return false;
    }
  };
  
  // Store score locally for future sync with proper typing
  const storeScoreLocally = (scoreData: { conversationId?: string, userId: string, score: number }, responses: PracticeResponse[]) => {
    try {
      const storedScores = localStorage.getItem('practice_scores') || '[]';
      const scoresArray = JSON.parse(storedScores);
      
      scoresArray.push({
        ...scoreData,
        responses: responses.map(r => ({ 
          question: r.question || '',
          response: r.userResponse || '',
          score: r.score || 0
        })),
        timestamp: new Date().toISOString(),
        pendingSync: true
      });
      
      localStorage.setItem('practice_scores', JSON.stringify(scoresArray));
      console.log('Practice score saved locally for future sync');
    } catch (error) {
      console.error('Error storing score locally:', error);
    }
  };
  
  // Add error handling to ensure the generateDetailedFeedbackPrompt function works even with limited data
  const generateDetailedFeedbackPrompt = (
    userQuery: string,
    managerType: string,
    finalScore: number,
    responses: Message[] // Correct type is Message[] from conversation
  ): string => {
    // Ensure we have valid inputs
    const safeUserQuery = userQuery || 'ethical dilemma';
    const safeManagerType = managerType || 'unknown';
    const safeScore = Number.isNaN(finalScore) ? 0 : finalScore;
    // Use the correct type for responses
    const safeResponses: Message[] = Array.isArray(responses) ? responses : [];
    
    let detailedPrompt = `I've just completed a practice scenario with a ${safeManagerType} manager about "${safeUserQuery}". \nMy ethical decision-making score was ${safeScore}/100. \n\nHere's a summary of my practice session:\n1. The ethical dilemma: ${safeUserQuery}\n2. My decisions during the practice:\n`;

    let decisionCounter = 0;
    // Iterate through the conversation to find manager -> user -> feedback sequences
    for (let i = 0; i < safeResponses.length - 2; i++) {
      const managerMsg = safeResponses[i];
      const userMsg = safeResponses[i + 1];
      const feedbackMsg = safeResponses[i + 2];

      // Check if the sequence is correct
      if (
        managerMsg.role === 'manager' &&
        userMsg.role === 'user' &&
        feedbackMsg.role === 'feedback'
      ) {
        decisionCounter++;
        // Safely cast feedbackMsg to access evs
        const score = (feedbackMsg as FeedbackMessage).evs;
        
        detailedPrompt += `\n   Decision ${decisionCounter}:`;
        detailedPrompt += `\n     Manager Prompt: ${managerMsg.content}`;
        detailedPrompt += `\n     My Choice: ${userMsg.content}`;
        detailedPrompt += `\n     Score: ${score !== undefined ? score : 'N/A'}/100\n`; // Assuming EVS is out of 100 now based on feedback structure
        
        // Skip the next two messages as they've been processed
        i += 2;
      }
    }

    if (decisionCounter === 0) {
      detailedPrompt += `\n   No valid decision sequences found in the practice session history.`;
    }

    detailedPrompt += `\n\nPlease analyze my ethical decision-making performance based *only* on the decisions listed above, highlighting:\n- The ethical principles I applied correctly\n- Any areas where I could have made better ethical choices\n- Specific feedback on my reasoning process\n- Practical advice for handling similar situations in the future\n\nCan you provide detailed feedback on my performance?`;

    return detailedPrompt;
  };

  const calculateFinalScore = useCallback(() => {
    let score = 0;
    let count = 0;
    
    if (currentScenario?.conversation?.length) {
      currentScenario.conversation.forEach(message => {
        if (message.role === 'feedback' && message.evs !== undefined) {
          score += message.evs;
          count++;
        }
      });
    }
    
    // Calculate the average score
    const calculatedScore = count > 0 ? Math.round(score / count) : 0;
    
    // Update finalScore state
    setFinalScore(calculatedScore);
    
    // Store the final score in the current scenario
    if (currentScenario && currentScenario.conversation && currentScenario.conversation.length > 0) {
      const updatedScenario = {
        ...currentScenario,
        finalScore: calculatedScore
      };
      setCurrentScenario(updatedScenario);
      localStorage.setItem('currentScenario', JSON.stringify(updatedScenario));
    }
    
    return calculatedScore;
  }, [currentScenario]);

  // Function to get the appropriate manager icon based on manager type and dark mode
  const getManagerIcon = (managerType: string | undefined, isDarkMode: boolean = false) => {
    const type = managerType?.toUpperCase() || 'PUPPETEER';
    
    switch (type) {
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

  // Detect dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check if dark mode is enabled
  useEffect(() => {
    // Check if the user has dark mode preference set
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Check if the document has a class that indicates dark mode
    const htmlElement = document.documentElement;
    const hasDarkClass = htmlElement.classList.contains('dark');
    
    // Set dark mode state based on user preference or document class
    setIsDarkMode(darkModeMediaQuery.matches || hasDarkClass);
    
    // Add listener for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches || hasDarkClass);
    };
    
    darkModeMediaQuery.addEventListener('change', handleChange);
    
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  if (!currentScenario && !scenarioId) {
    // Show loading indicator or scenario list
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold">Practice Module</h1>
          {onExit && (
            <button
              onClick={handleReturnToChat}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Return to Chat
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-gray-600 dark:text-gray-300">Loading scenarios...</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4">Available Scenarios</h2>
              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}
              {scenarios.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">No scenarios available. Please try again later.</p>
              ) : (
                <div className="grid gap-4">
                  {scenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => setCurrentScenario(createScenarioFromUserQuery(localStorage.getItem('practice_user_query') || '', scenario.manager_type))}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{scenario.issue}</h3>
                        <span className={getScenarioIntensityColor(scenario.ethical_breach_intensity)}>
                          {scenario.ethical_breach_intensity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Ethical Concern: {scenario.concern}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Manager Type: {scenario.manager_type}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
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
                  <strong>Ethical Concern:</strong> {currentScenario.scenario.concern}
                </p>
                <p className="text-sm">
                  <strong>Manager Type:</strong> {currentScenario.scenario.manager_type}
                </p>
                <p className="text-sm italic mt-2 text-gray-600 dark:text-gray-400">
                  {currentScenario.scenario.manager_description}
                </p>
              </div>
            )}

            {currentScenario?.conversation && currentScenario.conversation.length > 0 ? (
              <div className="space-y-2 mb-2">
                {currentScenario.conversation.map((message, index) => {
                  // Skip feedback messages as they'll be shown in the sticky section instead
                  if (message.role === 'feedback') {
                    return null;
                  }
                  
                  // Get the next message for better spacing decisions
                  const nextMessage = currentScenario.conversation[index + 1];
                  const isFollowedByFeedback = nextMessage?.role === 'feedback';
                  const prevMessage = index > 0 ? currentScenario.conversation[index - 1] : null;
                  const isSameRoleAsPrev = prevMessage?.role === message.role;
                  
                  return (
                    <div 
                      key={index} 
                      className={`
                        ${isFollowedByFeedback ? 'mb-0 pb-0' : 'mb-2'}
                        ${isSameRoleAsPrev ? 'message-compact' : ''}
                      `}
                    >
                      {/* Normal conversation messages */}
                      {(message.role === 'manager' || message.role === 'user') && (
                        <div className={message.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start ml-12'}>
                          <div className={`mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400 mx-2 flex items-center ${isSameRoleAsPrev ? 'hidden' : ''}`}>
                            {message.role === 'manager' ? null : 'You'}
                          </div>
                          <div className={getMessageStyle(message.role)} data-role={message.role}>
                            {message.role === 'manager' && !isSameRoleAsPrev && (
                              <div className="absolute -left-12 -top-5">
                                <div className="relative w-16 h-16 rounded-full bg-white dark:bg-gray-800 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center overflow-hidden shadow-lg">
                                  <img 
                                    src={getManagerIcon(currentScenario?.scenario?.manager_type, isDarkMode)} 
                                    alt="Manager" 
                                    className="w-14 h-14 object-cover" 
                                  />
                                </div>
                              </div>
                            )}
                            {/* Show typing indicator for manager messages with isTyping flag */}
                            {message.role === 'manager' && (message as any).isTyping ? (
                              <div className="flex items-center space-x-1 pl-1">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                              </div>
                            ) : (
                              <div className="pl-1">{message.content}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Add an empty div with minimal height for scrolling target */}
                <div ref={messagesEndRef} id="messages-end" style={{ height: "5px" }}></div>
                
                {/* Show final score card if completed */}
                {showOptions && finalReport && (
                  <div className="mt-2">
                    <h3 className="text-lg font-semibold">Practice Complete</h3>
                    <p>Your ethical decision-making score is {finalScore}/100.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50/70 dark:bg-amber-900/10 border border-amber-200/80 dark:border-amber-800/30 rounded-lg mb-4">
                <p>No conversation history yet.</p>
              </div>
            )}
          </div>

          {/* Fixed sections at the bottom - first feedback, then practice complete or choices */}
          <div className="sticky bottom-0 border-t border-gray-200/80 dark:border-gray-700/30 z-10">
            {/* Feedback section above the response options - appears when feedback exists */}
            {currentScenario?.conversation && currentScenario.conversation.some(msg => msg.role === 'feedback') && (
              <div 
                key={`feedback-wrapper-${currentFeedback || Date.now()}`} 
                className={`mb-0 pb-0 feedback-container ${finalReport ? 'feedback-final pt-1' : 'feedback-active'}`}
              >
                <div className={`${finalReport ? 'bg-white/95 dark:bg-gray-900/95' : 'bg-white dark:bg-gray-900'} feedback-transition pb-0`}>
                  {currentScenario.conversation
                    .filter(msg => msg.role === 'feedback')
                    .slice(-1)
                    .map((feedbackMsg, index) => (
                      <div 
                        key={`feedback-${currentFeedback || ((feedbackMsg as FeedbackMessage).evs + '-' + Date.now())}`} 
                        className="p-2 feedback-appear"
                      >
                        <div className="flex flex-col items-center">
                          <div className={`${getMessageStyle('feedback')} animate-slideIn mb-0 max-w-full ${finalReport ? 'border-indigo-300 dark:border-indigo-700' : ''}`}>
                            <div>{feedbackMsg.content}</div>
                            {(feedbackMsg as FeedbackMessage).evs !== undefined && (
                              <div className="mt-1 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                                Ethical Value Score: {(feedbackMsg as FeedbackMessage).evs}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Practice Complete section when practice is complete */}
            {showOptions && (
              <div className="bg-white/90 dark:bg-gray-900/90 pt-2 pb-3 px-3 shadow-sm backdrop-blur-sm">
                <div className="p-3 bg-blue-50/70 dark:bg-blue-900/10 border border-blue-200/80 dark:border-blue-800/30 rounded-lg mt-2">
                  <h3 className="text-lg font-semibold mb-2">Practice Complete</h3>
                  
                  {/* Display the final score - always use the calculated finalScore */}
                  <p className="mb-4">Your ethical decision-making score is {finalScore}/100. {
                    finalScore >= 80 
                      ? 'You demonstrated excellent ethical judgment!' 
                      : finalScore >= 50 
                        ? 'You showed good awareness of ethical principles.' 
                        : 'Consider being more assertive in upholding ethical standards.'
                  }</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <button
                      onClick={handleGetFeedback}
                      className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Get Feedback from EVA
                    </button>
                    
                    {/* Always show Practice Again button, regardless of score */}
                    <button
                      onClick={handlePracticeAgain}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                      Practice Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create a sticky footer for the choices when options are available */}
            {currentScenario?.currentChoices && currentScenario.currentChoices.length > 0 && (
              <div className="bg-white/90 dark:bg-gray-900/90 p-3 shadow-sm backdrop-blur-sm">
                <h3 className="text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">How do you respond?</h3>
                <div className="space-y-1.5 mb-1">
                  {currentScenario.currentChoices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleChoice(index)}
                      className={`w-full text-left p-2.5 bg-gray-50/70 dark:bg-gray-800/30 border border-gray-200/80 dark:border-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 disabled:opacity-50 transition-colors text-sm ${processingChoice ? 'cursor-not-allowed opacity-60' : ''}`}
                      disabled={loading || processingChoice}
                    >
                      {choice}
                      {processingChoice && (
                        <span className="ml-2 inline-flex">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                          <span className="ml-1 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                          <span className="ml-1 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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