import React, { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { authApi } from '@/services/api';
import { Loader2, X, ArrowRight, ArrowLeft, CheckCircle, Shield, Target, Eye } from 'lucide-react';

// Import manager icons
import puppeteerLightPng from '@/assets/manager-icons/puppeteer-manager-light.png';
import puppeteerDarkPng from '@/assets/manager-icons/puppeteer-manager-dark.png';
import diluterLightPng from '@/assets/manager-icons/diluter-manager-light.png';
import diluterDarkPng from '@/assets/manager-icons/diluter-manager-dark.png';
import camouflagerLightPng from '@/assets/manager-icons/camouflager-manager-light.png';
import camouflagerDarkPng from '@/assets/manager-icons/camouflager-manager-dark.png';

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
    question: "Using emotional manipulation to get what they want.",
    managerTypeSignal: 'PUPPETEER'
  },
  {
    id: 2,
    question: "Making you feel guilty for disagreeing with them.",
    managerTypeSignal: 'PUPPETEER'
  },
  {
    id: 3,
    question: "Pressuring you to agree by implying negative consequences.",
    managerTypeSignal: 'PUPPETEER'
  },
  {
    id: 4,
    question: "Forcing compliance by using their authority instead of reasoning.",
    managerTypeSignal: 'PUPPETEER'
  },

  // Diluter questions (minimization)
  {
    id: 5,
    question: "Dismissing ethical concerns as 'not a big deal.'",
    managerTypeSignal: 'DILUTER'
  },
  {
    id: 6,
    question: "Minimizing the importance of following company policies.",
    managerTypeSignal: 'DILUTER'
  },
  {
    id: 7,
    question: "Downplaying potential risks or negative consequences.",
    managerTypeSignal: 'DILUTER'
  },
  {
    id: 8,
    question: "Brushing off employee concerns as overreacting.",
    managerTypeSignal: 'DILUTER'
  },

  // Camouflager questions (jargon/complexity)
  {
    id: 9,
    question: "Using complex jargon to avoid clear answers about ethics.",
    managerTypeSignal: 'CAMOUFLAGER'
  },
  {
    id: 10,
    question: "Making simple ethical issues unnecessarily complicated.",
    managerTypeSignal: 'CAMOUFLAGER'
  },
  {
    id: 11,
    question: "Hiding behind company policies to avoid taking responsibility.",
    managerTypeSignal: 'CAMOUFLAGER'
  },
  {
    id: 12,
    question: "Using technical language to confuse rather than clarify.",
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

const managerTypeDescriptions = {
  PUPPETEER: {
    title: "Puppeteer Manager",
    subtitle: "The Manipulative Controller",
    description: "Your manager tends to use manipulation and emotional pressure to influence decisions. They employ authority, deadlines, and subtle threats to push questionable practices.",
    characteristics: [
      "Uses emotional manipulation to achieve goals",
      "Creates pressure through authority and deadlines",
      "Employs guilt tactics when employees disagree",
      "Makes unethical behavior seem necessary or inevitable"
    ],
    practiceAreas: [
      "Handling manipulation and pressure tactics",
      "Standing firm against authority-based coercion",
      "Documenting interactions for protection",
      "Building coalitions for ethical decision-making"
    ],
    color: "red",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    iconBg: "bg-red-100 dark:bg-red-900"
  },
  DILUTER: {
    title: "Diluter Manager", 
    subtitle: "The Risk Minimizer",
    description: "Your manager tends to minimize ethical concerns and downplay risks. They acknowledge problems but systematically reduce their perceived importance or urgency.",
    characteristics: [
      "Dismisses ethical concerns as 'not a big deal'",
      "Minimizes importance of policies and procedures",
      "Downplays potential risks and consequences",
      "Rationalizes questionable practices as necessary"
    ],
    practiceAreas: [
      "Maintaining focus on ethical implications",
      "Providing concrete examples and documentation",
      "Connecting ethical issues to business risks",
      "Escalating concerns when appropriate"
    ],
    color: "yellow",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    iconBg: "bg-yellow-100 dark:bg-yellow-900"
  },
  CAMOUFLAGER: {
    title: "Camouflager Manager",
    subtitle: "The Master of Disguise",
    description: "Your manager tends to use complex language and hide behind policies to avoid taking responsibility. They disguise unethical requests as standard business practices.",
    characteristics: [
      "Uses technical jargon to obscure ethical issues",
      "Hides behind company policies and procedures",
      "Makes simple decisions unnecessarily complex",
      "Reframes unethical requests as business necessities"
    ],
    practiceAreas: [
      "Cutting through bureaucratic language",
      "Exposing hidden ethical dimensions",
      "Translating complex issues into clear terms",
      "Identifying true decision-makers and accountability"
    ],
    color: "green",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    iconBg: "bg-green-100 dark:bg-green-900"
  }
};

interface ManagerTypeQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRetake?: boolean;
  isRequired?: boolean;
}

type QuizStep = 'explanation' | 'questions' | 'brief_result' | 'detailed_info';

export const ManagerTypeQuizModal: React.FC<ManagerTypeQuizModalProps> = ({
  isOpen,
  onClose,
  isRetake = false,
  isRequired = false
}) => {
  const { user, setUser, darkMode } = useStore();
  const [step, setStep] = useState<QuizStep>('explanation');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [determinedManagerType, setDeterminedManagerType] = useState<string | null>(null);

  // Reset state when modal opens, especially for retakes
  useEffect(() => {
    if (isOpen) {
      setStep('explanation');
      setCurrentQuestionIndex(0);
      setResponses({});
      setLoading(false);
      setError(null);
      setDeterminedManagerType(null);
    }
  }, [isOpen, isRetake]);

  // Function to get the appropriate manager icon based on manager type and dark mode
  const getManagerIcon = (managerType: string, isDarkMode: boolean = false) => {
    const type = managerType.toUpperCase();
    
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

  if (!isOpen) return null;

  console.log('Modal render - step:', step, 'determinedManagerType:', determinedManagerType);
  console.log('Modal render - user:', user);
  console.log('Modal render - user?.managerTypePreference:', user?.managerTypePreference);
  console.log('Modal render - isRequired:', isRequired);
  console.log('Modal render - loading:', loading);

  const handleStartQuiz = () => {
    setStep('questions');
    setCurrentQuestionIndex(0);
    setResponses({});
    setError(null);
    setDeterminedManagerType(null);
  };

  const handleResponseChange = (score: number) => {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: score
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All questions answered, submit quiz
      handleSubmitQuiz();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    console.log('=== QUIZ SUBMISSION START ===');
    if (!user) {
      console.log('ERROR: No user found');
      setError('User not found. Please log in again.');
      return;
    }

    console.log('User found:', user.id, user.email);
    setLoading(true);
    setError(null);

    try {
      // Prepare quiz responses
      const quizResponses: QuizResponse[] = quizQuestions.map(question => ({
        questionId: question.id,
        score: responses[question.id] || 0,
        managerTypeSignal: question.managerTypeSignal
      }));

      console.log('Submitting quiz with responses:', quizResponses);

      // Submit quiz
      console.log('About to call authApi.submitManagerTypeQuiz...');
      const response = await authApi.submitManagerTypeQuiz({
        userId: user.id,
        responses: quizResponses
      });

      console.log('Quiz submission response received:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response));
      console.log('determinedManagerType from response:', response.determinedManagerType);

      // Update user object with the determined manager type
      const updatedUser = {
        ...user,
        managerTypePreference: response.determinedManagerType
      };
      
      console.log('About to update user:', updatedUser);
      setUser(updatedUser);
      
      console.log('About to set determinedManagerType to:', response.determinedManagerType);
      setDeterminedManagerType(response.determinedManagerType);

      console.log('About to set step to brief_result');
      setStep('brief_result');
      
      console.log('=== QUIZ SUBMISSION SUCCESS ===');

    } catch (err: any) {
      console.error('=== QUIZ SUBMISSION ERROR ===');
      console.error('Error details:', err);
      console.error('Error message:', err.message);
      console.error('Error response:', err.response);
      setError(err.response?.data?.message || 'Failed to submit quiz. Please try again.');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const handleClose = () => {
    console.log('=== HANDLE CLOSE CALLED ===');
    console.log('isRequired:', isRequired);
    console.log('user?.managerTypePreference:', user?.managerTypePreference);
    
    if (isRequired && !user?.managerTypePreference) {
      // Don't allow closing if required and not completed
      console.log('Preventing close - quiz is required and not completed');
      return;
    }
    
    console.log('Calling onClose callback');
    onClose();
  };

  const handleViewDetails = () => {
    setStep('detailed_info');
  };

  const handleFinish = () => {
    onClose();
  };

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const isCurrentQuestionAnswered = currentQuestion && responses[currentQuestion.id] !== undefined;
  const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-60" onClick={handleClose} />
      
      {/* Modal content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close button - positioned absolutely in top right */}
        {!isRequired && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        )}

        {/* Content */}
        <div className="p-6">
          {step === 'explanation' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Welcome to the Manager Type Assessment
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  This brief assessment helps us classify your manager's behavioral style based on research into organizational ethics and leadership dynamics.
                  Your responses will inform a tailored simulation designed to reflect realistic ethical challenges in software development.
                  The assessment consists of 12 statements. For each one, please indicate how often your manager displays the described behavior.
                </p>
              </div>
              <button
                onClick={handleStartQuiz}
                className="px-5 py-2 text-base font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md flex items-center mx-auto"
                >
                Start Assessment
              </button>
            </div>
          )}

          {step === 'questions' && currentQuestion && (
            <div>
              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {currentQuestionIndex + 1} of {quizQuestions.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Instruction */}
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Please select how often your manager behaves in the following way.
              </p>

              {/* Question */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  {currentQuestion.question}
                </h3>

                {/* Response options */}
                {/* Response options */}
                <div className="grid grid-cols-5 gap-3">
                  {scaleLabels.map((label, index) => (
                    <label 
                      key={index}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        responses[currentQuestion.id] === index
                          ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={index}
                        checked={responses[currentQuestion.id] === index}
                        onChange={() => handleResponseChange(index)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-center w-full">
                        <span className="font-medium">{label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-md">
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </button>

                <button
                  onClick={handleNextQuestion}
                  disabled={!isCurrentQuestionAnswered || loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {currentQuestionIndex === quizQuestions.length - 1 ? 'Complete Assessment' : 'Next'}
                  {currentQuestionIndex < quizQuestions.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
                </button>
              </div>
            </div>
          )}

          {step === 'brief_result' && determinedManagerType && (
            <div className="text-center">
              {/* Success header */}
              <div className="mb-8">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Assessment Complete!
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Based on your responses, we've identified your manager type.
                </p>
              </div>

              {/* Brief result announcement */}
              {determinedManagerType && (
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-2">
                    Your Manager Type: {managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions]?.title}
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300">
                    {managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions]?.subtitle}
                  </p>
                </div>
              )}

              {/* Continue button */}
              <button
                onClick={handleViewDetails}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl"
              >
                View Details & Learn More
                <ArrowRight className="h-4 w-4 ml-2 inline" />
              </button>
            </div>
          )}

          {step === 'detailed_info' && determinedManagerType && (
            <div className="text-center">
              {/* Manager type result card */}
              {managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions] && (
                <div className={`${managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions].bgColor} ${managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions].borderColor} border-2 rounded-xl p-8 mb-4`}>
                  
                  {/* Top section with icon and title */}
                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 mb-6">
                    {/* Manager icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-24 h-24 ${managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions].iconBg} rounded-full p-2 border-4 ${managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions].borderColor} overflow-hidden shadow-lg`}>
                        <img 
                          src={getManagerIcon(determinedManagerType, darkMode)} 
                          alt={`${determinedManagerType} Manager`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Manager type title and description */}
                    <div className="flex-1 text-left lg:text-left">
                      <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions].title}
                      </h4>
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions].subtitle}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions].description}
                      </p>
                    </div>
                  </div>

                  {/* Characteristics and Practice Areas - Side by side on larger screens */}
                  <div className="grid lg:grid-cols-1 gap-6 mb-4">
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-5">
                      <div className="flex items-center mb-3">
                        <Eye className={`h-5 w-5 text-${managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions].color}-600 mr-2`} />
                        <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                          Key Characteristics
                        </h5>
                      </div>
                      <ul className="space-y-2">
                        {managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions].characteristics.map((characteristic, index) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                            <span className={`inline-block w-2 h-2 bg-${managerTypeDescriptions[determinedManagerType as keyof typeof managerTypeDescriptions].color}-500 rounded-full mt-2 mr-2 flex-shrink-0`}></span>
                            <span className="leading-relaxed">{characteristic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                </div>
              )}

              {/* Random assignment message for unclear results */}
              {!['PUPPETEER', 'DILUTER', 'CAMOUFLAGER'].includes(determinedManagerType) && (
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-6 mb-6 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center mb-2">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                    <h5 className="font-semibold text-blue-800 dark:text-blue-300">
                      Unclear Results
                    </h5>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your responses didn't clearly indicate a specific manager type, so we've randomly assigned one for your practice sessions. 
                    You can retake this assessment anytime from your user menu to get a more personalized result.
                  </p>
                </div>
              )}

              {/* Action button */}
              <button
                onClick={handleFinish}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl"
              >
                Start Practicing with EVA
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 