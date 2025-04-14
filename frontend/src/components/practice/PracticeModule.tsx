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

  // Add this function to prepare feedback data for the agent
  const prepareFeedbackPrompt = () => {
    if (!currentScenario || !currentScenario.scenario) {
      console.error('No scenario data available for feedback');
      return null;
    }
    
    // Verify we have a valid conversation
    if (!currentScenario.conversation || !Array.isArray(currentScenario.conversation) || currentScenario.conversation.length === 0) {
      console.error('No valid conversation data available for feedback');
      return null;
    }
    
    const scenario = currentScenario.scenario;
    console.log('Preparing feedback prompt for scenario:', scenario.id);
    
    // Get all the user's choices to summarize
    const userChoices = currentScenario.conversation
      .filter(item => item.role === 'user')
      .map(item => item.content);
    
    console.log('Found', userChoices.length, 'user choices in conversation');
    
    // Get all the manager's statements for context
    const managerStatements = currentScenario.conversation
      .filter(item => item.role === 'manager')
      .map(item => item.content);
    
    console.log('Found', managerStatements.length, 'manager statements in conversation');
    
    // Include any feedback items from the conversation
    const feedbackItems = currentScenario.conversation
      .filter(item => item.role === 'feedback')
      .map(item => item.content);
    
    // Start building a comprehensive feedback prompt
    let feedbackPrompt = `I've completed a practice scenario with a ${scenario.manager_type} manager about "${scenario.issue}". Here's the complete scenario information:\n\n`;
    
    // Add scenario details
    feedbackPrompt += `## Scenario Details\n`;
    feedbackPrompt += `- Manager Type: ${scenario.manager_type}\n`;
    feedbackPrompt += `- Ethical Concern: ${scenario.concern}\n`;
    feedbackPrompt += `- Issue: ${scenario.issue}\n`;
    feedbackPrompt += `- Final Score: ${finalScore}/100\n\n`;
    
    // Add the conversation flow
    feedbackPrompt += `## Conversation Summary\n`;
    let conversationIndex = 1;
    
    // Loop through the conversation chronologically
    for (let i = 0; i < currentScenario.conversation.length; i++) {
      const item = currentScenario.conversation[i];
      if (!item || !item.role || !item.content) continue;
      
      try {
        if (item.role === 'manager') {
          feedbackPrompt += `\nManager (Statement ${conversationIndex}):\n${item.content}\n`;
          conversationIndex++;
        } else if (item.role === 'user') {
          feedbackPrompt += `\nMy Response:\n${item.content}\n`;
        } else if (item.role === 'feedback') {
          feedbackPrompt += `\nRound Feedback:\n${item.content}\n`;
          if (item.evs) {
            feedbackPrompt += `Score for this round: ${item.evs}/10\n`;
          }
        } else if (item.role === 'final_evaluation') {
          feedbackPrompt += `\nFinal Evaluation:\n${item.content}\n`;
        }
      } catch (err) {
        console.error('Error processing conversation item:', err);
        // Continue to next item
      }
    }
    
    // Add request for detailed feedback
    feedbackPrompt += `\n## Feedback Request\n`;
    feedbackPrompt += `Please provide detailed feedback on my performance in this practice scenario:\n`;
    feedbackPrompt += `1. What I did well in handling this ${scenario.manager_type} manager\n`;
    feedbackPrompt += `2. Where I could improve my ethical reasoning and responses\n`;
    feedbackPrompt += `3. Specific strategies for dealing with this type of ${scenario.manager_type} manager in the future\n`;
    feedbackPrompt += `4. Alternative responses that would have been more effective\n`;
    feedbackPrompt += `5. Applicable ethical principles or guidelines that I should keep in mind\n`;
    
    console.log('Generated feedback prompt of length:', feedbackPrompt.length);
    return feedbackPrompt;
  };

  // Modify the existing Get Feedback function to use a simpler approach
  const handleGetFeedback = () => {
    const feedbackPrompt = prepareFeedbackPrompt();
    
    if (feedbackPrompt && currentScenario && currentScenario.scenario) {
      console.log('Preparing practice feedback request, full prompt length:', feedbackPrompt.length);
      
      try {
        // Get the actual final evaluation message if it exists
        const finalEvalMessage = currentScenario.conversation.find(m => m.role === 'final_evaluation');
        // Extract the score from the final evaluation message using regex
        // The pattern looks for "score is X/100" or similar text
        const scorePattern = /score (?:is|was) (\d+)\/100/;
        let scoreMatch = null;
        if (finalEvalMessage) {
          scoreMatch = finalEvalMessage.content.match(scorePattern);
        }
        
        // Use the extracted score or fall back to the state's finalScore
        const actualFinalScore = scoreMatch ? scoreMatch[1] : finalScore.toString();
        
        console.log('Using score extracted from final evaluation:', actualFinalScore);
           
        // Create user message for feedback with the actual score
        const simplifiedFeedback = `I just completed a practice scenario with a ${currentScenario.scenario.manager_type} manager type about "${currentScenario.scenario.issue}". My ethical decision-making score was ${actualFinalScore}/100.`;
        
        console.log('Simplified feedback for chat display:', simplifiedFeedback);
        console.log('Using actual score from final evaluation:', actualFinalScore);
        
        // Make sure the feedback prompt isn't too large to ensure reliable responses
        const maxPromptLength = 12000; // Characters
        let finalFeedbackPrompt = feedbackPrompt;
        
        if (feedbackPrompt.length > maxPromptLength) {
          console.warn(`Feedback prompt is too large (${feedbackPrompt.length} chars). Trimming to ${maxPromptLength} chars.`);
          finalFeedbackPrompt = feedbackPrompt.substring(0, maxPromptLength) + 
            "\n\n[Note: This prompt was trimmed due to length. Please provide feedback based on the available information above.]";
        }
        
        // Store both simplified feedback and complete prompt
        const practiceData = {
          managerType: currentScenario.scenario.manager_type,
          concern: currentScenario.scenario.concern,
          issue: currentScenario.scenario.issue,
          finalScore: actualFinalScore,
          completeFeedbackPrompt: finalFeedbackPrompt  // Store the possibly trimmed prompt
        };
        
        console.log('Storing practice data with prompt length:', finalFeedbackPrompt.length);
        localStorage.setItem('practice_data', JSON.stringify(practiceData));
        
        // Store the simplified feedback for display in chat
        localStorage.setItem('feedbackRequest', simplifiedFeedback);
        
        console.log('Dispatching practice-feedback-request event');
        
        // Immediately dispatch the event to notify any listeners
        window.dispatchEvent(new Event('practice-feedback-request'));
        
        // Give a short delay before navigating away to ensure the event is processed
        setTimeout(() => {
          console.log('Navigating back to chat window');
          if (onExit) {
            onExit();  // Call the onExit prop to navigate back to chat
          } else {
            // Fallback if onExit is not provided
            window.location.href = '/';
          }
        }, 1000);  // Slightly longer timeout to ensure event is processed
      } catch (error) {
        console.error('Error preparing practice feedback:', error);
        // Fall back to direct navigation
        if (onExit) {
          onExit();
        }
      }
    } else {
      console.error('Missing feedback prompt or scenario data', {
        promptAvailable: !!feedbackPrompt,
        scenarioAvailable: !!currentScenario,
        scenarioDataAvailable: !!(currentScenario && currentScenario.scenario)
      });
    }
  };

  const handlePracticeAgain = () => {
    console.log('Practice Again button clicked');
    setLoading(true);
    
    try {
      // First reset the session
      resetSession();
      
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
          
          // Update state with the new scenario
          setCurrentScenario(freshScenario);
          setLoading(false);
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
                  
                  {/* Display the final score from the last final_evaluation message if available */}
                  {currentScenario.conversation.find(m => m.role === 'final_evaluation') ? (
                    <p className="mb-4">{currentScenario.conversation.find(m => m.role === 'final_evaluation')?.content}</p>
                  ) : (
                    <p className="mb-4">Your ethical decision-making score is {finalScore}/100.</p>
                  )}
                  
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
                      Practice Again
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