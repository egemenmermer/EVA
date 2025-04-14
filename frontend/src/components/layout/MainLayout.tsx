import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { GuidelinesPanel } from '../guidelines/GuidelinesPanel';
import { useStore } from '@/store/useStore';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import PracticeModule from '../practice/PracticeModule';
import './KnowledgePanelToggle.css';

// Format token to include Bearer prefix if needed
const formatToken = (token: string | null): string | null => {
  if (!token) return null;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

interface MainLayoutProps {
}

export const MainLayout: React.FC<MainLayoutProps> = () => {
  const { darkMode, user, token, setUser, setToken } = useStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  // State to track if the knowledge panel should be visible on desktop
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
  // Track if new knowledge has been loaded (to add a pulse effect)
  const [hasNewKnowledge, setHasNewKnowledge] = useState(false);

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
        email: 'egemenmermer@gmail.com',
        fullName: 'Egemen Mermer'
      });
    }
  }, [navigate, token, user, setUser, setToken]);

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
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Responsive */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-30 w-[85%] sm:w-[320px] md:w-[260px] h-[calc(100%-4rem)] md:h-auto flex-none flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-hidden transition-transform duration-300 ease-in-out`}>
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
        
        {/* Main Chat Window - Takes full width when knowledge panel is closed */}
        <main 
          className="flex-1 min-w-0 bg-white dark:bg-gray-900 flex justify-center overflow-hidden transition-all duration-300"
          onClick={handleMainContentClick}
        >
          {/* Allow full width but with proper spacing */}
          <div className="w-full transition-all duration-300 px-4 mx-auto"> 
            <ChatWindow showKnowledgePanel={showKnowledgePanel} />
          </div>
        </main>
        
        {/* Right Panel Container - Only allocated space in the flex layout when visible */}
        <div className={`${showKnowledgePanel ? 'relative w-[320px]' : 'absolute right-0 w-0'} transition-all duration-300`}>
          {/* Knowledge Panel Toggle Button - Always visible */}
          <div className="hidden md:block">
            <button 
              onClick={() => {
                setShowKnowledgePanel(!showKnowledgePanel);
                setHasNewKnowledge(false); // Clear pulse effect on click
              }}
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
          
          {/* Right Panel - Responsive on mobile, controlled by showKnowledgePanel on desktop */}
          <div className={`knowledge-panel ${guidelinesOpen ? 'translate-x-0' : 'translate-x-full'} ${showKnowledgePanel ? 'md:translate-x-0' : 'md:translate-x-full'} fixed md:relative right-0 top-16 md:top-0 z-40 w-[85%] sm:w-[320px] md:w-[320px] h-[calc(100%-4rem)] md:h-auto flex-none md:flex md:block border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto transition-transform duration-300 ease-in-out`}>
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
              onNewKnowledge={() => {
                if (!showKnowledgePanel) {
                  setHasNewKnowledge(true);
                  
                  // Auto-clear the pulse effect after 5 seconds
                  const timer = setTimeout(() => {
                    setHasNewKnowledge(false);
                  }, 5000);
                  
                  return () => clearTimeout(timer);
                }
              }}
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
    </div>
  );
}; 