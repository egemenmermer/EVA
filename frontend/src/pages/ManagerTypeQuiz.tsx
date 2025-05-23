import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { authApi } from '@/services/api';
import { Loader2 } from 'lucide-react';

interface QuizQuestion {
  id: number;
  question: string;
  managerTypeSignal: 'PUPPETEER' | 'DILUTER' | 'CAMOUFLAGER';
}

interface QuizResponse {
  questionId: number;
  score: number;
  managerTypeSignal: string;
}

const quizQuestions: QuizQuestion[] = [
  // Puppeteer questions (manipulation/pressure)
  {
    id: 1,
    question: "How often does your manager use emotional manipulation to get what they want?",
    managerTypeSignal: 'PUPPETEER'
  },
  {
    id: 2,
    question: "How frequently does your manager make you feel guilty for disagreeing with them?",
    managerTypeSignal: 'PUPPETEER'
  },
  {
    id: 3,
    question: "How often does your manager pressure you to go along with decisions by threatening consequences?",
    managerTypeSignal: 'PUPPETEER'
  },
  {
    id: 4,
    question: "How frequently does your manager use their authority to force compliance rather than persuasion?",
    managerTypeSignal: 'PUPPETEER'
  },
  
  // Diluter questions (minimization)
  {
    id: 5,
    question: "How often does your manager dismiss ethical concerns as 'not a big deal'?",
    managerTypeSignal: 'DILUTER'
  },
  {
    id: 6,
    question: "How frequently does your manager minimize the importance of following company policies?",
    managerTypeSignal: 'DILUTER'
  },
  {
    id: 7,
    question: "How often does your manager downplay potential risks or negative consequences?",
    managerTypeSignal: 'DILUTER'
  },
  {
    id: 8,
    question: "How frequently does your manager brush off employee concerns as overreacting?",
    managerTypeSignal: 'DILUTER'
  },
  
  // Camouflager questions (jargon/complexity)
  {
    id: 9,
    question: "How often does your manager use complex jargon to avoid direct answers about ethical issues?",
    managerTypeSignal: 'CAMOUFLAGER'
  },
  {
    id: 10,
    question: "How frequently does your manager make simple ethical decisions unnecessarily complicated?",
    managerTypeSignal: 'CAMOUFLAGER'
  },
  {
    id: 11,
    question: "How often does your manager hide behind company policies to avoid taking responsibility?",
    managerTypeSignal: 'CAMOUFLAGER'
  },
  {
    id: 12,
    question: "How frequently does your manager use technical language to confuse rather than clarify issues?",
    managerTypeSignal: 'CAMOUFLAGER'
  }
];

const scaleLabels = [
  'Never',
  'Rarely', 
  'Sometimes',
  'Often',
  'Always'
];

export const ManagerTypeQuiz: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, setUser } = useStore();
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isRetake = searchParams.get('retake') === 'true';
  
  const handleResponseChange = (questionId: number, score: number) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: score
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all questions are answered
    if (Object.keys(responses).length !== quizQuestions.length) {
      setError('Please answer all questions before submitting.');
      return;
    }
    
    if (!user) {
      setError('User not found. Please log in again.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Prepare quiz responses
      const quizResponses: QuizResponse[] = quizQuestions.map(question => ({
        questionId: question.id,
        score: responses[question.id],
        managerTypeSignal: question.managerTypeSignal
      }));
      
      // Submit quiz
      const response = await authApi.submitManagerTypeQuiz({
        userId: user.id,
        responses: quizResponses
      });
      
      // Update user object with the determined manager type
      const updatedUser = {
        ...user,
        managerTypePreference: response.determinedManagerType
      };
      setUser(updatedUser);
      
      // Redirect to practice or dashboard
      if (isRetake) {
        navigate('/dashboard');
      } else {
        navigate('/practice');
      }
      
    } catch (err: any) {
      console.error('Quiz submission error:', err);
      setError(err.response?.data?.message || 'Failed to submit quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const progress = Object.keys(responses).length / quizQuestions.length * 100;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {isRetake ? 'Retake Manager Type Assessment' : 'Manager Type Assessment'}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Please answer the following questions about your manager's behavior to help us personalize your practice experience.
            </p>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {Object.keys(responses).length} of {quizQuestions.length} questions completed
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {quizQuestions.map((question) => (
              <div key={question.id} className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {question.id}. {question.question}
                </h3>
                
                <div className="grid grid-cols-5 gap-2">
                  {scaleLabels.map((label, index) => (
                    <label 
                      key={index}
                      className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        responses[question.id] === index
                          ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={index}
                        checked={responses[question.id] === index}
                        onChange={() => handleResponseChange(question.id, index)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium text-center">{label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">({index})</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="flex justify-between items-center pt-6">
              <button
                type="button"
                onClick={() => navigate(isRetake ? '/dashboard' : '/login')}
                className="px-6 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                disabled={loading}
              >
                {isRetake ? 'Cancel' : 'Back to Login'}
              </button>
              
              <button
                type="submit"
                disabled={loading || Object.keys(responses).length !== quizQuestions.length}
                className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {loading ? 'Processing...' : 'Complete Assessment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 