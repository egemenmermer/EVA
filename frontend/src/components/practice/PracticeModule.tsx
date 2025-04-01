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

  // Add scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Use useEffect to scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentScenario?.conversation]);

  useEffect(() => {
    // If a specific scenario is provided, start it automatically
    if (scenarioId) {
      startScenario(scenarioId);
    } else {
      // Otherwise fetch available scenarios
      fetchScenarios();
    }
  }, [scenarioId]);

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const response = await api.get<ScenariosListResponse>('/practice/scenarios');
      setScenarios(response.data.scenarios);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching scenarios:', err);
      setError('Failed to load scenarios. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const startScenario = async (scenarioId: string) => {
    setLoading(true);
    try {
      const response = await api.post<ScenarioState>('/practice/scenarios/start', {
        scenario_id: scenarioId,
        conversation_id: conversationId
      });
      setCurrentScenario(response.data);
      setFeedback(null);
      setError(null);
    } catch (err: any) {
      console.error('Error starting scenario:', err);
      setError('Failed to start scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = async (choiceIndex: number) => {
    if (!currentScenario) return;
    setLoading(true);
    setError(null);

    try {
      const response = await api.post<ResponseFeedback>('/practice/scenarios/respond', {
        scenario_id: currentScenario.scenario.id,
        conversation_id: conversationId,
        choice_index: choiceIndex
      });

      if (response.data.final_report) {
        setFeedback(response.data);
        setCurrentScenario({
          ...currentScenario,
          currentStatement: null,
          currentChoices: [],
          conversation: [
            ...currentScenario.conversation,
            { role: 'user', content: currentScenario.currentChoices[choiceIndex] } as UserMessage,
            { role: 'feedback', content: response.data.feedback, evs: response.data.evs } as FeedbackMessage,
            { role: 'final_evaluation', content: response.data.final_report.evaluation } as FinalEvaluationMessage
          ]
        });
      } else {
        setCurrentScenario({
          ...currentScenario,
          currentStatement: response.data.next_statement || null,
          currentChoices: response.data.available_choices,
          conversation: [
            ...currentScenario.conversation,
            { role: 'user', content: currentScenario.currentChoices[choiceIndex] } as UserMessage,
            { role: 'feedback', content: response.data.feedback, evs: response.data.evs } as FeedbackMessage,
            { role: 'manager', content: response.data.next_statement || '' } as ManagerMessage
          ]
        });
      }
    } catch (err) {
      setError('Failed to submit response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetSession = async () => {
    setLoading(true);
    try {
      await api.post('/practice/reset');
      setCurrentScenario(null);
      setFeedback(null);
      setConversationId('practice-' + Math.random().toString(36).substring(7));
      setError(null);
    } catch (err: any) {
      console.error('Error resetting session:', err);
      setError('Failed to reset session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScenarioIntensityColor = (intensity: string) => {
    switch (intensity.toLowerCase()) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-orange-500';
      case 'low':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getMessageStyle = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-blue-100 dark:bg-blue-900 p-3 rounded-lg mb-2';
      case 'user':
        return 'bg-green-100 dark:bg-green-900 p-3 rounded-lg mb-2 ml-8';
      case 'feedback':
        return 'bg-purple-100 dark:bg-purple-900 p-3 rounded-lg mb-2 text-sm italic';
      case 'final_evaluation':
        return 'bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-2 border border-gray-300 dark:border-gray-700';
      case 'context':
        return 'bg-gray-50 dark:bg-gray-950 p-2 rounded-lg mb-4 text-xs';
      case 'strategy_info':
        return 'bg-yellow-50 dark:bg-yellow-900 p-3 rounded-lg mb-2 text-sm';
      default:
        return 'p-3 rounded-lg mb-2';
    }
  };

  const handleReturnToChat = () => {
    // Reset the practice session
    resetSession();
    
    // If we have results and onComplete callback, send them
    if (feedback?.final_report && onComplete) {
      onComplete(feedback.final_report);
    }
    
    // Call the onExit callback if provided
    if (onExit) {
      onExit();
    }
  };

  if (!currentScenario && !scenarioId) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold">Practice Module</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-lg font-semibold mb-4">Available Scenarios</h2>
          <div className="grid gap-4">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => startScenario(scenario.id)}
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
        </div>
      </div>
    );
  }

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

      {currentScenario?.scenario && (
        <div className="flex-1 overflow-y-auto p-4">
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
                {message.role === 'feedback' && message.evs !== undefined && (
                  <div className="mt-2 text-sm">
                    Ethical Value Score: {message.evs}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
            
          {/* Current choices */}
          {currentScenario.currentChoices && (
            <div className="mt-4 sticky bottom-0 bg-white dark:bg-gray-900 pt-4">
              <h3 className="text-lg font-semibold mb-2">How do you respond?</h3>
              <div className="space-y-2">
                {currentScenario.currentChoices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => handleChoice(index)}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
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

      {!currentScenario && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading scenario...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default PracticeModule; 