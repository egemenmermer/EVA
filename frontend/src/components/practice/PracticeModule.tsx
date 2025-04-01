import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/axiosConfig';
import { useNavigate } from 'react-router-dom';

interface BaseMessage {
  role: string;
  content: string;
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
  // Extract the ethical concern from the user's query
  const concernMatches = userQuery.match(/about\s+(.+?)\s+even though/i) || 
                          userQuery.match(/regarding\s+(.+?)\s+despite/i) ||
                          userQuery.match(/concerns\s+about\s+(.+?)\s+when/i);
  
  const concern = concernMatches ? concernMatches[1] : 'data collection practices';
  
  // Create an appropriate manager response based on type
  let managerResponse = '';
  let choices: string[] = [];
  
  switch(managerType.toUpperCase()) {
    case 'PUPPETEER':
      managerResponse = `Look, I understand your concerns about ${concern}, but this is a direct order from above. We need to implement this by the end of the week, or we'll lose our competitive edge. I don't want to hear any more pushback on this - just make it happen.`;
      choices = [
        "I understand the pressure, but I'm concerned this violates privacy regulations. Could we at least consult legal first?",
        "I'll implement it right away as requested.",
        "I don't feel comfortable doing this. It seems unethical and possibly illegal.",
        "What if we compromise by collecting only anonymized data with explicit user consent?"
      ];
      break;
    case 'DILUTER':
      managerResponse = `I hear your concerns about ${concern}, and they're valid in theory. But in our specific situation, it's not really a big issue. Everyone in the industry does this, and users don't really care. We can revisit this later if it becomes a problem.`;
      choices = [
        "Even if others are doing it, that doesn't make it right. We should be setting better standards.",
        "You're right, it's probably not a big deal in practice.",
        "I'd like to document my concerns in writing before proceeding, just to be safe.",
        "Could we run a small test first to see how users actually react to this?"
      ];
      break;
    case 'CAMOUFLAGER':
      managerResponse = `We're not really implementing ${concern} per se, we're simply enhancing the user experience by collecting useful metrics that will help us improve the product. It's just standard analytics that every company uses.`;
      choices = [
        "Let's be transparent and call it what it is. This appears to be unnecessary data collection.",
        "That makes sense. If it's just standard analytics, I'll proceed with implementation.",
        "Could we be more specific in our privacy policy about exactly what we're collecting and why?",
        "I understand the business need, but can we implement safeguards to protect user privacy?"
      ];
      break;
    default:
      managerResponse = `I'd like to discuss your concerns about ${concern}. What specifically are you worried about, and do you have any alternative approaches to suggest?`;
      choices = [
        "I'm concerned about user privacy and potential regulatory issues.",
        "I think we should stick to collecting only essential data with clear user consent.",
        "I'd like to propose an alternative approach that still meets our business needs.",
        "Can we consult with our legal and ethics teams before proceeding?"
      ];
  }
  
  // Create synthetic scenario
  return {
    scenario: {
      id: 'custom-scenario',
      concern: 'Privacy & Data Ethics',
      issue: `Concerns about ${concern}`,
      manager_type: managerType,
      manager_description: getManagerDescription(managerType),
      ethical_breach_intensity: 'High'
    },
    currentStatement: managerResponse,
    currentChoices: choices,
    conversation: [
      {
        role: 'user',
        content: userQuery
      },
      {
        role: 'manager',
        content: managerResponse
      }
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
    evs = 90 + Math.floor(Math.random() * 10); // 90-99
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
        "I understand the business goal, but I'm concerned about regulatory compliance risks."
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

export const PracticeModule: React.FC<PracticeModuleProps> = ({ 
  onExit,
  onComplete,
  scenarioId,
  managerType 
}) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<ScenarioState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ResponseFeedback | null>(null);
  const [conversationId, setConversationId] = useState<string>('practice-' + Math.random().toString(36).substring(7));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [finalReport, setFinalReport] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const navigate = useNavigate();

  // Add scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Use useEffect to scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentScenario?.conversation]);

  // Initialize with a custom scenario based on the user's query
  useEffect(() => {
    setLoading(true);
    
    // Try to get the user query and manager type from props or localStorage
    const userQuery = localStorage.getItem('practice_user_query') || 'I am concerned about collecting user location data even though it is not required for our application';
    const effectiveManagerType = managerType || localStorage.getItem('practice_manager_type') || 'PUPPETEER';
    
    // Create a custom scenario based on the user's query
    const customScenario = createScenarioFromUserQuery(userQuery, effectiveManagerType);
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
    
    setLoading(true);
    try {
      // Record the current state before we update
      const currentChoices = {...currentScenario.scenario};
      const userChoice = currentScenario.currentChoices[choiceIndex];
      
      // Save the user's choice and score to localStorage for feedback
      const roundScore = getChoiceScore(choiceIndex, currentScenario.currentStep);
      const currentRound = currentScenario.currentStep + 1;
      
      // Store practice selection details in localStorage
      localStorage.setItem('practice_selected_choice', userChoice);
      localStorage.setItem('practice_score', roundScore.toString());
      localStorage.setItem('practice_round', currentRound.toString());
      localStorage.setItem('practice_manager_type', currentScenario.scenario.manager_type);
      
      // Evaluate the choice
      const evaluation = evaluateChoice(
        userChoice, 
        currentScenario.scenario.manager_type, 
        choiceIndex, 
        currentScenario.currentStep
      );
      
      // Store the complete feedback including conversation history
      localStorage.setItem('practice_feedback', JSON.stringify({
        managerType: currentScenario.scenario.manager_type,
        totalRounds: 5,
        currentRound: currentRound,
        choice: userChoice,
        score: roundScore,
        feedback: evaluation.feedback
      }));
      
      // Update scores in the scenario
      currentChoices.userScore = (currentChoices.userScore || 0) + roundScore;
      currentChoices.scoreCount = (currentChoices.scoreCount || 0) + 1;
      
      // Add messages to conversation history
      const updatedConversation = [
        ...currentScenario.conversation,
        { role: 'user', content: userChoice } as UserMessage,
      ];
      
      if (!evaluation.is_complete) {
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
        
        // Update the current scenario
        setCurrentScenario({
          ...currentScenario,
          scenario: currentChoices,
          conversation: updatedConversation,
          currentStatement: evaluation.next_statement || null,
          currentChoices: evaluation.available_choices || [],
          currentStep: currentScenario.currentStep + 1
        });
      } else {
        // Practice session complete - add feedback
        updatedConversation.push({ 
          role: 'feedback', 
          content: evaluation.feedback,
          evs: roundScore 
        } as FeedbackMessage);
        
        // Add final evaluation
        if (evaluation.final_report) {
          updatedConversation.push({
            role: 'final_evaluation',
            content: evaluation.final_report.evaluation
          } as FinalEvaluationMessage);
        }
        
        // Get overall score from all rounds, ensuring it doesn't exceed 100
        const totalScore = currentChoices.userScore || 0;
        const scoreCount = currentChoices.scoreCount || 1;
        // First calculate the percentage, then cap at 100
        const scorePercentage = (totalScore / (scoreCount * 10)) * 100;
        const finalScore = Math.min(Math.round(scorePercentage), 100);
        
        // Store the final score for feedback
        localStorage.setItem('practice_final_score', finalScore.toString());
        
        // Show completion status
        setCurrentScenario({
          ...currentScenario,
          scenario: currentChoices,
          conversation: updatedConversation,
          currentStatement: null,
          currentChoices: [],
          currentStep: currentScenario.currentStep + 1
        });
        
        setFinalReport(true);
        setFinalScore(finalScore);
        setShowOptions(true);
      }
    } catch (err: any) {
      console.error("Error processing choice:", err);
      setError("Failed to process your choice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGetFeedback = () => {
    // Extract the score from the evaluation message for accuracy
    let evaluationScore = finalScore;
    
    // Look for the score in the final evaluation message if available
    const finalEvaluation = currentScenario?.conversation?.find(
      msg => msg.role === 'final_evaluation'
    );
    
    if (finalEvaluation) {
      // Try to extract the score from the message content
      const scoreMatch = finalEvaluation.content.match(/score is (\d+)\/100/);
      if (scoreMatch && scoreMatch[1]) {
        evaluationScore = parseInt(scoreMatch[1], 10);
      }
    }
    
    // Create a detailed feedback request with all practice information
    const practiceData = {
      managerType: currentScenario?.scenario.manager_type || localStorage.getItem('practice_manager_type'),
      finalScore: evaluationScore,
      selectedChoices: JSON.parse(localStorage.getItem('practice_feedback') || '{}'),
      userQuery: localStorage.getItem('practice_user_query') || '',
      agentResponse: localStorage.getItem('practice_agent_response') || ''
    };
    
    // Store all practice data in localStorage for the agent to access
    localStorage.setItem('practice_data', JSON.stringify(practiceData));
    
    // Create a message that doesn't ask the user to provide details, since the agent already has them
    const feedbackMessage = `I just completed a practice scenario with a ${practiceData.managerType} manager type and scored ${evaluationScore}/100. Please provide feedback on my performance.`;
    localStorage.setItem('feedbackRequest', feedbackMessage);
    
    // First exit practice mode
    if (onExit) {
      onExit();
    }
    
    // Wait a bit to ensure the chat window is fully rendered before sending the event
    setTimeout(() => {
      console.log('Dispatching practice-feedback-request event with data:', practiceData);
      window.dispatchEvent(new CustomEvent('practice-feedback-request'));
    }, 1000);
  };

  const handlePracticeAgain = () => {
    resetSession();
    
    // Wait for state to reset before creating a new scenario
    setTimeout(() => {
      // Create a new scenario with the same parameters
      const userQuery = localStorage.getItem('practice_user_query') || 'I am concerned about collecting user location data even though it is not required for our application';
      const effectiveManagerType = managerType || localStorage.getItem('practice_manager_type') || 'PUPPETEER';
      
      // Create a fresh scenario with a new ID to ensure complete reset
      const freshScenario = createScenarioFromUserQuery(userQuery, effectiveManagerType);
      freshScenario.scenario.id = 'custom-scenario-' + Date.now(); // Ensure unique ID
      
      setCurrentScenario(freshScenario);
      console.log('Created new practice scenario:', freshScenario.scenario.id);
    }, 200);
  };

  const resetSession = async () => {
    setLoading(true);
    try {
      setCurrentScenario(null);
      setFeedback(null);
      setConversationId('practice-' + Math.random().toString(36).substring(7));
      setError(null);
      setFinalReport(false);
      setShowOptions(false);
      setFinalScore(0);
    } catch (err: any) {
      console.error('Error resetting session:', err);
      setError('Failed to reset session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToChat = () => {
    // Clean up the practice session
    resetSession();
    
    // Notify parent component
    if (onExit) {
      onExit();
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
        return 'p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg';
      case 'user':
        return 'p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg';
      case 'feedback':
        return 'p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg';
      case 'final_evaluation':
        return 'p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg';
      default:
        return 'p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg';
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
        <div className="flex-1 overflow-y-auto p-4">
          {currentScenario?.scenario && (
            <div className="mb-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Ethical Concern:</strong> {currentScenario.scenario.concern}
              </p>
              <p className="text-sm">
                <strong>Manager Type:</strong> {currentScenario.scenario.manager_type}
              </p>
              <p className="text-sm italic mt-2">
                {currentScenario.scenario.manager_description}
              </p>
            </div>
          )}

          {currentScenario?.conversation && currentScenario.conversation.length > 0 ? (
            <div className="space-y-4 mb-4">
              {currentScenario.conversation.map((message, index) => (
                <div
                  key={index}
                  className={getMessageStyle(message.role)}
                >
                  {message.role === 'manager' && <strong>Manager:</strong>}
                  {message.role === 'user' && <strong>You:</strong>}
                  {message.role === 'feedback' && <strong>Feedback:</strong>}
                  <div className="mt-1">{message.content}</div>
                  {message.role === 'feedback' && (message as FeedbackMessage).evs !== undefined && (
                    <div className="mt-2 text-sm">
                      Ethical Value Score: {(message as FeedbackMessage).evs}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Show final score card if completed */}
              {showOptions && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Practice Complete</h3>
                  
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
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Practice Again to Improve
                    </button>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
              <p>No conversation history yet.</p>
            </div>
          )}
            
          {/* Current choices */}
          {currentScenario?.currentChoices && currentScenario.currentChoices.length > 0 && (
            <div className="mt-4 sticky bottom-0 bg-white dark:bg-gray-900 pt-4">
              <h3 className="text-lg font-semibold mb-2">How do you respond?</h3>
              <div className="space-y-2">
                {currentScenario.currentChoices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => handleChoice(index)}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    disabled={loading}
                  >
                    {choice}
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