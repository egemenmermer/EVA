import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { GuidelinesPanel } from '../guidelines/GuidelinesPanel';
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
import './KnowledgePanelToggle.css';
import { Message } from '@/types/conversation';

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
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  // State to track if the knowledge panel should be visible on desktop
  const [showKnowledgePanel, setShowKnowledgePanel] = useState<boolean>(false);
  // Track if new knowledge has been loaded (to add a pulse effect)
  const [hasNewKnowledge, setHasNewKnowledge] = useState<boolean>(false);
  // State for messages
  const [storeMessages, setStoreMessages] = useState<Message[]>([]);
  // State for manager type quiz modal
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [isQuizRetake, setIsQuizRetake] = useState(false);
  // State for tactics modal
  const [showTacticsModal, setShowTacticsModal] = useState(false);
  // State for survey modal
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyType, setSurveyType] = useState<'pre' | 'post'>('pre');

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

  // Check if user needs to take pre-survey first, then manager type quiz
  useEffect(() => {
    if (user && !showQuizModal && !showSurveyModal) {
      const hasCompletedPreSurvey = hasCompletedSurvey('pre');
      
      // First check: if user hasn't completed pre-survey, show it first
      if (!hasCompletedPreSurvey) {
        console.log('User has not completed pre-survey, showing pre-survey first');
        setSurveyType('pre');
        setShowSurveyModal(true);
      }
      // Second check: if pre-survey is done but no manager type preference, show quiz
      else if (!user.managerTypePreference) {
        console.log('Pre-survey completed, now showing manager type quiz');
        setShowQuizModal(true);
      }
      // User has both pre-survey and quiz completed
      else {
        console.log('User has completed both pre-survey and manager type quiz');
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

    const handleShowTacticsModal = (event: Event) => {
      console.log('Received show-tactics-modal event');
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

  // Listen for conversation change events
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

  // Listen for refresh-conversations events which might indicate a new conversation
  useEffect(() => {
    const handleRefreshEvent = (event: CustomEvent) => {
      console.log('Refresh event received in MainLayout', event.detail);
      
      // Check if the event contains a new conversation flag
      // But don't automatically open the knowledge panel
      if (event.detail?.isNewConversation) {
        console.log('New conversation created, but keeping knowledge panel closed by default');
        setHasNewKnowledge(true); // Just set the indicator that there's new knowledge
          
        // Auto-clear the pulse effect after 5 seconds
        const timer = setTimeout(() => {
          setHasNewKnowledge(false);
        }, 5000);
          
        return () => clearTimeout(timer);
      }
    };

    // Add event listener
    window.addEventListener('refresh-conversations' as any, handleRefreshEvent as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('refresh-conversations' as any, handleRefreshEvent as EventListener);
    };
  }, [currentConversation]);

  // Listen for conversation changes to manage knowledge panel state
  useEffect(() => {
    // When conversation changes, close the knowledge panel by default
    if (currentConversation?.conversationId) {
      // Only close panel on new conversation, not just any update
      if (currentConversation.isNew || 
          localStorage.getItem('lastOpenConversation') !== currentConversation.conversationId) {
        
        console.log('New conversation detected, closing knowledge panel');
        setShowKnowledgePanel(false);
        setHasNewKnowledge(false);
        
        // Track this conversation as last open
        localStorage.setItem('lastOpenConversation', currentConversation.conversationId);
        
        // Clean up old artifact data
        const previousConversationId = localStorage.getItem('lastOpenConversation');
        if (previousConversationId && previousConversationId !== currentConversation.conversationId) {
          localStorage.removeItem(`artifacts-${previousConversationId}`);
        }
        
        // Always clear artifacts for the new conversation to ensure fresh data
        localStorage.removeItem(`artifacts-${currentConversation.conversationId}`);
      }
    }
  }, [currentConversation?.conversationId, currentConversation?.isNew]);

  // Add specific event listener for deleted conversations
  useEffect(() => {
    const handleConversationDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      const deletedId = customEvent.detail?.conversationId;
      
      console.log('Conversation deleted event received:', deletedId);
      
      // If current conversation was deleted, clear it
      if (currentConversation?.conversationId === deletedId) {
        setCurrentConversation(null);
        setShowKnowledgePanel(false);
      }
      
      // Always clear artifacts for deleted conversations
      if (deletedId) {
        localStorage.removeItem(`artifacts-${deletedId}`);
      }
    };
    
    window.addEventListener('conversation-deleted', handleConversationDeleted as EventListener);
    
    return () => {
      window.removeEventListener('conversation-deleted', handleConversationDeleted as EventListener);
    };
  }, [currentConversation, setCurrentConversation]);

  // Logout if we encounter an authentication error
  const handleAuthError = () => {
    console.log('Authentication error detected, clearing token and redirecting to login');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  // Close sidebar when clicking on main content area on mobile
  const handleMainContentClick = () => {
    if (window.innerWidth < 768 && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // Add a function to handle knowledge panel toggle
  const handleKnowledgePanelToggle = () => {
    // Toggle the panel visibility
    setShowKnowledgePanel(!showKnowledgePanel);
    setHasNewKnowledge(false); // Clear pulse effect on click
    
    // If we're opening the panel and have a current conversation, trigger artifact fetching
    if (!showKnowledgePanel && currentConversation?.conversationId) {
      // We can use the conversation ID to fetch artifacts
      console.log(`Opening knowledge panel - ensuring artifacts for conversation ${currentConversation.conversationId}`);
      
      // Force a refresh of the artifacts by removing them from localStorage
      localStorage.removeItem(`artifacts-${currentConversation.conversationId}`);
      
      // The KnowledgePanel component will automatically try to fetch them
    }
  };

  // Callback for when new knowledge is available
  const handleNewKnowledge = () => {
    // Only show the notification if the panel is closed
    if (!showKnowledgePanel) {
      setHasNewKnowledge(true);
    }
  };

  const handleCloseQuizModal = () => {
    setShowQuizModal(false);
    setIsQuizRetake(false);
  };

  const handleSurveyComplete = () => {
    console.log('Survey completed callback triggered');
    // Additional logic can be added here if needed
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 dashboard">
      {/* Header - Responsive padding */}
      <header className="h-16 md:h-20 flex-none flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center">
          {/* Mobile sidebar toggle */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="mr-3 md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6 text-gray-700 dark:text-gray-100" />
          </button>
          
          <div 
            className="flex items-center gap-2 md:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/?stay=true')}
          >
            <img src={darkMode ? logoDark : logoLight} alt="Logo" className="h-10 w-10 md:h-16 md:w-16" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                EVA
              </h1>
              <h2 className="hidden sm:block text-sm md:text-base text-gray-700 dark:text-gray-200">
                Ethical Virtual Assistant
              </h2>
            </div>
          </div>
        </div>

        {/* Mobile guidelines toggle */}
        <button 
          onClick={() => setGuidelinesOpen(!guidelinesOpen)} 
          className="md:hidden bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200 p-1.5 rounded-md"
          aria-label="Toggle guidelines"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </button>
      </header>
      
      {/* Explicitly calculate height to fill remaining viewport space */}
      <div 
        className="flex-1 flex overflow-hidden relative" 
        style={{ height: 'calc(100vh - 4rem)' }} // Assuming mobile header height h-16 = 4rem
      >
        {/* Left Sidebar - Responsive */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-30 w-[85%] sm:w-[320px] md:w-[260px] h-full flex-none flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden transition-transform duration-300 ease-in-out`}>
          {/* Close button on mobile */}
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="absolute top-4 right-4 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-300" />
          </button>
          
          {/* Force the sidebar to take up the full height */}
          <div className="flex-1 flex flex-col min-h-0 pt-6 md:pt-0">
            <Sidebar />
          </div>
        </div>
        
        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" 
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        
        {/* Main Chat Window */}
        <main 
          className="flex-1 min-w-0 bg-white dark:bg-gray-900 flex justify-center overflow-hidden transition-all duration-300 h-full" 
          onClick={handleMainContentClick}
        >
          <div className="w-full transition-all duration-300 px-4 mx-auto h-full">
            <ChatWindow 
              showKnowledgePanel={showKnowledgePanel}
              currentConversation={currentConversation}
              setStoreMessages={setStoreMessages}
              storeMessages={storeMessages}
            />
          </div>
        </main>
        
        {/* Right Panel Container */}
        <div className={`${showKnowledgePanel ? 'relative w-[320px]' : 'absolute right-0 w-0'} transition-all duration-300 h-full`}>
          {/* Knowledge Panel Toggle Button - Always visible */}
          <div className="hidden md:block">
            <button 
              onClick={handleKnowledgePanelToggle}
              className={`knowledge-panel-toggle ${hasNewKnowledge && !showKnowledgePanel ? 'has-new-content' : ''}`}
              aria-label={showKnowledgePanel ? "Hide knowledge panel" : "Show knowledge panel"}
              style={{ right: showKnowledgePanel ? '320px' : '0' }}
            >
              {showKnowledgePanel ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>
          
          {/* Actual Knowledge Panel */}
          <div className={`knowledge-panel ${guidelinesOpen ? 'translate-x-0' : 'translate-x-full'} ${showKnowledgePanel ? 'md:translate-x-0' : 'md:translate-x-full'} fixed md:relative right-0 top-16 md:top-0 z-40 w-[85%] sm:w-[320px] md:w-[320px] h-[calc(100%-4rem)] md:h-full flex-none md:flex md:block border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto transition-transform duration-300 ease-in-out`}>
            {/* Close button on mobile */}
            <button 
              onClick={() => setGuidelinesOpen(false)} 
              className="absolute top-4 left-4 md:hidden"
              aria-label="Close guidelines"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-300" />
            </button>
            
            <GuidelinesPanel 
              onClose={() => setShowKnowledgePanel(false)} 
              onNewKnowledge={handleNewKnowledge}
            />
          </div>
        </div>
        
        {/* Backdrop for mobile guidelines */}
        {guidelinesOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" 
            onClick={() => setGuidelinesOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Manager Type Quiz Modal */}
      <ManagerTypeQuizModal
        isOpen={showQuizModal}
        onClose={handleCloseQuizModal}
        isRetake={isQuizRetake}
        isRequired={!user?.managerTypePreference}
      />

      {/* Tactics Modal */}
      <SimplifiedTacticsModal
        isOpen={showTacticsModal}
        onClose={() => setShowTacticsModal(false)}
      />

      {/* Survey Modal */}
      <SurveyModal
        isOpen={showSurveyModal}
        onClose={() => setShowSurveyModal(false)}
        surveyType={surveyType}
        onComplete={handleSurveyComplete}
      />
    </div>
  );
}; 