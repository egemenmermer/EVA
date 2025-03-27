import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { ChatWindow } from '../chat/ChatWindow';
import { EthicalGuidelines } from '../guidelines/EthicalGuidelines';
import { useStore } from '@/store/useStore';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

// Format token to include Bearer prefix if needed
const formatToken = (token: string | null): string | null => {
  if (!token) return null;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

export const MainLayout: React.FC = () => {
  const { darkMode, user, token, setUser, setToken } = useStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

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
      navigate('/login');
      return;
    }
    
    // If we have a token in localStorage but not in store, add it to store
    if (storedToken && !token) {
      console.log('Token found in localStorage but not in store, restoring');
      setToken(formatToken(storedToken));
    }
    
    // If we have a token but no user, create a placeholder user
    if ((storedToken || token) && !user) {
      console.log('Token exists but no user, creating placeholder user');
      setUser({
        id: 'layout-recovery',
        email: 'egemenmermer@gmail.com',
        fullName: 'Egemen Mermer'
      });
    } else if (!user) {
      // Create a mock user for testing when no user or token exists
      console.log('No user or token found, creating test user');
      setUser({
        id: 'test-user',
        email: 'test@example.com',
        fullName: 'Test User'
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
        
        {/* Main Chat Window - Responsive width and padding */}
        <main 
          className="flex-1 min-w-0 bg-white dark:bg-gray-900 flex justify-center overflow-hidden"
          onClick={handleMainContentClick}
        >
          <div className="w-full max-w-full md:max-w-4xl px-2 sm:px-4">
            <ChatWindow />
          </div>
        </main>
        
        {/* Right Panel - Responsive on mobile */}
        <div className={`${guidelinesOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 fixed md:relative right-0 top-16 md:top-0 z-30 w-[85%] sm:w-[320px] md:w-[240px] h-[calc(100%-4rem)] md:h-auto flex-none md:flex md:block border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-y-auto transition-transform duration-300 ease-in-out`}>
          {/* Close button on mobile */}
          <button 
            onClick={() => setGuidelinesOpen(false)} 
            className="absolute top-4 left-4 md:hidden"
            aria-label="Close guidelines"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-300" />
          </button>
          
          <div className="h-full overflow-y-auto p-4 pt-12 md:pt-4">
            <EthicalGuidelines />
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