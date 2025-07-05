import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { ManagerTypeQuizModal } from '../modals/ManagerTypeQuizModal';
import { SimplifiedTacticsModal } from '@/components/modals/SimplifiedTacticsModal';
import { SurveyModal } from '../modals/SurveyModal';
import { hasCompletedSurvey, SurveyType } from '@/utils/surveyUtils';
import { useStore } from '@/store/useStore';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import PracticeModule from '../practice/PracticeModule';
import { Message } from '@/types/conversation';
import { backendApi } from '@/services/axiosConfig';

// Format token to include Bearer prefix if needed
const formatToken = (token: string | null): string | null => {
  if (!token) return null;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

interface MainLayoutProps {
}

export const MainLayout: React.FC<MainLayoutProps> = () => {
  const { darkMode, user, token, setUser, setToken, currentConversation, setCurrentConversation } = useStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // State for messages
  const [storeMessages, setStoreMessages] = useState<Message[]>([]);
  // State for manager type quiz modal
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [isQuizRetake, setIsQuizRetake] = useState(false);
  // State for tactics modal
  const [showTacticsModal, setShowTacticsModal] = useState(false);
  const [practiceData, setPracticeData] = useState<{
    tacticCounts: Record<string, number>;
    scenarioTitle: string;
    issue: string;
    isFirstTime?: boolean;
    totalPracticesCompleted?: number;
    scenarioType?: 'privacy' | 'accessibility';
  } | null>(null);
  // State for survey modal
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyType, setSurveyType] = useState<'consent' | 'pre' | 'post'>('pre');

  // Check for token and user - if no token, redirect to login
  useEffect(() => {
    // Don't redirect if we're on the landing page
    const isLandingPage = window.location.pathname === '/';
    if (isLandingPage) {
      console.log('On landing page, skipping token check');
      return;
    }
  
    const storedToken = localStorage.getItem('token');
    console.log('MainLayout - token check:', storedToken ? 'EXISTS' : 'MISSING', 'user:', Boolean(user));
    
    if (!storedToken) {
      console.log('No token found, redirecting to login');
      // Clear any existing user data
      setUser(null);
      setToken(null);
      navigate('/login', { replace: true }); // Use replace to prevent back button issues
      return;
    }
    
    // If we have a token in localStorage but not in store, add it to store
    if (storedToken && !token) {
      console.log('Token found in localStorage but not in store, restoring');
      const formattedToken = formatToken(storedToken);
      if (formattedToken && formattedToken !== storedToken) {
        localStorage.setItem('token', formattedToken);
      }
      if (formattedToken) {
        setToken(formattedToken);
      }
    }
    
    // If we have a token but no user, create a placeholder user
    if ((storedToken || token) && !user) {
      console.log('Token exists but no user, creating placeholder user');
      setUser({
        id: 'layout-recovery',
        email: '',
        fullName: 'User'
      });
    }
  }, [navigate, token, user, setUser, setToken]);

  // Check if user needs to take consent form, then pre-survey, then manager type quiz
  useEffect(() => {
    if (user && !showQuizModal && !showSurveyModal) {
      const hasCompletedConsentForm = hasCompletedSurvey('consent');
      const hasCompletedPreSurvey = hasCompletedSurvey('pre');
      
      // First check: if user hasn't completed consent form, show it first
      if (!hasCompletedConsentForm) {
        console.log('User has not completed consent form, showing consent form first');
        setSurveyType('consent');
        setShowSurveyModal(true);
      }
      // Second check: if consent form is done but pre-survey isn't, show pre-survey
      else if (!hasCompletedPreSurvey) {
        console.log('User has not completed pre-survey, showing pre-survey');
        setSurveyType('pre');
        setShowSurveyModal(true);
      }
      // Third check: if pre-survey is done but no manager type preference, show quiz
      else if (!user.managerTypePreference) {
        console.log('Pre-survey completed, now showing manager type quiz');
      setShowQuizModal(true);
      }
      // User has completed consent form, pre-survey and quiz
      else {
        console.log('User has completed consent form, pre-survey and manager type quiz');
      }
    }
  }, [user, showQuizModal, showSurveyModal]);

  // Listen for retake quiz events from sidebar
  useEffect(() => {
    const handleShowQuizModal = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Received show-manager-quiz event:', customEvent.detail);
      setIsQuizRetake(customEvent.detail?.isRetake || false);
      setShowQuizModal(true);
    };

    const handleShowTacticsModal = async (event: Event) => {
      console.log('Received show-tactics-modal event');
      
      // Try to get practice data from database first
      try {
        const response = await backendApi.get('/api/v1/practice/latest-session-data');
        if (response.data) {
          // Check if this is the first time for this scenario type
          const scenarioType = response.data.issue?.toLowerCase().includes('privacy') ? 'privacy' : 'accessibility';
          const isFirstTime = response.data.isFirstTimeForScenario || false;
          const totalPracticesCompleted = response.data.totalPracticesCompleted || 1;
          
          setPracticeData({
            tacticCounts: response.data.tacticCounts || {},
            scenarioTitle: response.data.scenarioTitle || 'Practice Scenario',
            issue: response.data.issue || 'Ethical Decision-Making',
            isFirstTime: isFirstTime,
            totalPracticesCompleted: totalPracticesCompleted,
            scenarioType: scenarioType
          });
          console.log('Loaded practice data from database for tactics modal:', response.data);
        } else {
          setPracticeData(null);
        }
      } catch (error) {
        console.error('Error loading practice data from database:', error);
        
        // Fallback to localStorage
        try {
          const lastPracticeData = localStorage.getItem('last_practice_session_data');
          if (lastPracticeData) {
            const practiceSessionData = JSON.parse(lastPracticeData);
            const scenarioType = practiceSessionData.issue?.toLowerCase().includes('privacy') ? 'privacy' : 'accessibility';
            
            // Check localStorage for first-time status
            const privacyCompleted = localStorage.getItem('privacy_scenarios_completed') === 'true';
            const accessibilityCompleted = localStorage.getItem('accessibility_scenarios_completed') === 'true';
            const isFirstTime = scenarioType === 'privacy' ? !privacyCompleted : !accessibilityCompleted;
            
            setPracticeData({
              tacticCounts: practiceSessionData.tacticCounts || {},
              scenarioTitle: practiceSessionData.scenarioTitle || 'Practice Scenario',
              issue: practiceSessionData.issue || 'Ethical Decision-Making',
              isFirstTime: isFirstTime,
              totalPracticesCompleted: practiceSessionData.totalPracticesCompleted || 1,
              scenarioType: scenarioType
            });
            console.log('Loaded practice data from localStorage fallback:', practiceSessionData);
          } else {
            setPracticeData(null);
          }
        } catch (localStorageError) {
          console.error('Error loading practice data from localStorage:', localStorageError);
          setPracticeData(null);
        }
      }
      
      setShowTacticsModal(true);
    };

    const handleShowPostSurveyModal = (event: Event) => {
      console.log('Received show-post-survey-modal event');
      setSurveyType('post');
      setShowSurveyModal(true);
    };

    window.addEventListener('show-manager-quiz', handleShowQuizModal);
    window.addEventListener('show-tactics-modal', handleShowTacticsModal);
    window.addEventListener('show-post-survey-modal', handleShowPostSurveyModal);

    return () => {
      window.removeEventListener('show-manager-quiz', handleShowQuizModal);
      window.removeEventListener('show-tactics-modal', handleShowTacticsModal);
      window.removeEventListener('show-post-survey-modal', handleShowPostSurveyModal);
    };
  }, []);

  // New useEffect to handle conversation change from sidebar clicks
  useEffect(() => {
    const handleConversationChangeEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const details = customEvent.detail;
      
      if (details?.conversationId) {
        console.log('MainLayout: Received conversation change event:', details);
        
        // Only update if the conversation ID has changed
        if (!currentConversation || currentConversation.conversationId !== details.conversationId) {
          console.log('Updating current conversation from event to:', details.conversationId);
          
          // Create minimum required conversation object
          const newConversation = {
            conversationId: details.conversationId,
            title: details.title || 'New Conversation',
            managerType: details.managerType || 'PUPPETEER',
            createdAt: new Date().toISOString()
          };
          
          // Update the current conversation
          setCurrentConversation(newConversation);
        }
      }
    };
    
    // Listen for both refresh events and new conversation events
    window.addEventListener('refresh-conversations', handleConversationChangeEvent);
    window.addEventListener('new-conversation', handleConversationChangeEvent);
    
    return () => {
      window.removeEventListener('refresh-conversations', handleConversationChangeEvent);
      window.removeEventListener('new-conversation', handleConversationChangeEvent);
    };
  }, [currentConversation, setCurrentConversation]);

  // Combined useEffect for other events
  useEffect(() => {
    // This function handles a custom event to refresh conversations
    const handleRefreshEvent = (event: CustomEvent) => {
      console.log('Sidebar: Refresh event received with detail:', event.detail);
      
      const { conversationId } = event.detail;
      if (conversationId) {
        // If a specific conversation is selected, set it
        const newConversation = {
          conversationId: conversationId,
          title: 'New Conversation',
          managerType: 'PUPPETEER',
          createdAt: new Date().toISOString()
        };
        setCurrentConversation(newConversation);
      } else {
        // Otherwise, clear the conversation to return to a neutral state
        setCurrentConversation(null);
      }
    };

    // This function handles the conversation deleted event
    const handleConversationDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      const deletedConversationId = customEvent.detail.conversationId;
      console.log(`MainLayout: Conversation ${deletedConversationId} deleted`);

      // If the deleted conversation is the current one, clear it
      if (currentConversation?.conversationId === deletedConversationId) {
        setCurrentConversation(null);
      }
    };

    window.addEventListener('conversation-deleted', handleConversationDeleted);
    window.addEventListener('refresh-conversations', handleRefreshEvent as EventListener);
    
    return () => {
      window.removeEventListener('conversation-deleted', handleConversationDeleted);
      window.removeEventListener('refresh-conversations', handleRefreshEvent as EventListener);
    };
  }, [currentConversation, setCurrentConversation]);
  
  const handleAuthError = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleMainContentClick = () => {
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  const handleCloseQuizModal = () => {
    setShowQuizModal(false);
  };

  const handleSurveyComplete = () => {
    setShowSurveyModal(false);
    // After survey, check if we need to show the quiz
    if (user && !user.managerTypePreference) {
      setShowQuizModal(true);
    }
  };

  const handleCloseTacticsModal = () => {
    setShowTacticsModal(false);
    setPracticeData(null); // Clear data when closing
  };

  const handleLogoClick = () => {
    // Determine the target path based on user authentication state
    const targetPath = token && user ? '/chat' : '/';
    
    // If the user is already at the target path, force a reload to reset the state
    if (window.location.pathname === targetPath) {
      window.location.reload();
    } else {
      navigate(targetPath);
    }
  };

  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onAuthError={handleAuthError} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col transition-all duration-300">
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Menu size={24} />
            </button>
            <div 
              onClick={handleLogoClick}
              className="flex items-center space-x-2 cursor-pointer ml-2 md:ml-0"
            >
              <img src={darkMode ? logoDark : logoLight} alt="Ethical AI Assistant Logo" className="h-8 w-auto" />
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 hidden sm:block">
                Ethical Virtual Assistant
              </h1>
            </div>
          </div>
        </header>

        {/* Conditional rendering of Practice Module or Chat Window */}
        <main className="flex-1 flex overflow-hidden" onClick={handleMainContentClick}>
          {currentConversation?.conversationId === 'practice-module' ? (
            <PracticeModule />
          ) : (
            <ChatWindow />
          )}
        </main>
      </div>

      {/* Conditional Modals */}
      {showQuizModal && <ManagerTypeQuizModal isOpen={showQuizModal} onClose={handleCloseQuizModal} isRetake={isQuizRetake} />}
      {showTacticsModal && practiceData && <SimplifiedTacticsModal isOpen={showTacticsModal} practiceData={practiceData} onClose={handleCloseTacticsModal} />}
      {showSurveyModal && <SurveyModal isOpen={showSurveyModal} surveyType={surveyType} onClose={handleSurveyComplete} />}
    </div>
  );
}; 