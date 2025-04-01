import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { LandingPage } from '@/pages/LandingPage';
import { OAuthCallback } from '@/pages/OAuthCallback';
import { ActivationPage } from '@/pages/ActivationPage';
import { useStore, type Conversation } from '@/store/useStore';
import { conversationApi, verifyToken } from '@/services/api';
import { ResetButton } from '@/components/ResetButton';

// Configure the query client with better defaults for reliable data fetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 0, // Never use stale data
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchInterval: 30000, // Refresh data every 30 seconds by default
    },
  },
});

// Helper component to track route changes and update document body class
const RouteObserver: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const isDashboard = location.pathname === '/dashboard';
    const isLogin = location.pathname === '/login';
    const isLanding = location.pathname === '/';
    
    console.log('Location changed:', location.pathname, 
                'Is dashboard:', isDashboard,
                'Is login:', isLogin,
                'Is landing:', isLanding);
    
    // Update body class based on route
    document.body.classList.remove('dashboard-active', 'login-page', 'landing-page');
    
    if (isDashboard) {
      document.body.classList.add('dashboard-active');
      
      // Track dashboard visits to prevent loops
      sessionStorage.removeItem('login_refresh_count');
      sessionStorage.removeItem('landing_refresh_count');
    } else if (isLogin) {
      document.body.classList.add('login-page');
      
      // Track login page visits to detect loops
      let refreshCount = parseInt(sessionStorage.getItem('login_refresh_count') || '0');
      refreshCount++;
      sessionStorage.setItem('login_refresh_count', refreshCount.toString());
      console.log('Updated login refresh count:', refreshCount);
      
      if (refreshCount > 5) {
        console.warn('Too many login page visits, clearing problematic state');
        localStorage.removeItem('token');
        sessionStorage.removeItem('login_refresh_count');
      }
    } else if (isLanding) {
      document.body.classList.add('landing-page');
      
      // Track landing page visits to detect loops
      let refreshCount = parseInt(sessionStorage.getItem('landing_refresh_count') || '0');
      refreshCount++;
      sessionStorage.setItem('landing_refresh_count', refreshCount.toString());
      console.log('Updated landing refresh count:', refreshCount);
    }
  }, [location]);

  return null;
};

export const App: React.FC = () => {
  const { user, darkMode, setToken, setUser, setCurrentConversation, currentConversation } = useStore();

  // Apply dark mode class to html element
  useEffect(() => {
    console.log('Dark mode state changed:', darkMode ? 'dark' : 'light');
    
    // Add body class for current route
    const currentPath = window.location.pathname;
    const isLandingPage = currentPath === '/';
    const isLoginPage = currentPath === '/login';
    const isDashboard = currentPath === '/dashboard';
    
    console.log('Current path for dark mode check:', currentPath, 
                'Is landing page:', isLandingPage,
                'Is login page:', isLoginPage,
                'Is dashboard:', isDashboard);
    
    // Apply dark mode selectively
    if (darkMode) {
      // Only apply keep-bg-light when on dashboard
      document.documentElement.classList.add('dark');
      
      if (isDashboard) {
        document.documentElement.classList.add('keep-bg-light');
      } else {
        document.documentElement.classList.remove('keep-bg-light');
      }
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('keep-bg-light');
    }
    
    // Move the dashboard-active class handling to RouteObserver
  }, [darkMode]);

  // Check for token on app startup and ensure user data is available
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Reset any refresh counters on app startup to break loops
    sessionStorage.removeItem('login_refresh_count');
    sessionStorage.removeItem('landing_refresh_count');
    
    if (token) {
      console.log('Found token in localStorage, restoring session');
      
      // Format token properly
      const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      setToken(formattedToken);
      
      // Verify token at startup
      verifyToken().then(isValid => {
        if (!isValid) {
          console.warn('Token verification failed on startup, clearing token');
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          
          // Only redirect if we're not already on login or landing page
          const currentPath = window.location.pathname;
          if (currentPath !== '/login' && currentPath !== '/' && !currentPath.startsWith('/landing')) {
            window.location.href = '/login';
          }
        } else {
          console.log('Token successfully verified at startup');
        }
      });
      
      // Set a placeholder user if we don't have user data
      if (!user) {
        console.log('No user data in store, setting placeholder');
        setUser({
          id: 'restored-session',
          email: 'user@example.com',
          fullName: 'User'
        });
      }
    } else {
      console.log('No token found in localStorage');
      // Ensure user is null if no token exists
      if (user) {
        console.log('User exists but no token, clearing user');
        setUser(null);
      }
    }
  }, [setToken, setUser, user]);

  // Periodically verify token validity
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Verify token every 10 minutes
    const intervalId = setInterval(async () => {
      const isValid = await verifyToken();
      if (!isValid) {
        console.warn('Periodic token verification failed, clearing token');
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        
        // Show notification and redirect if needed
        if (window.confirm('Your session has expired. Please log in again.')) {
          window.location.href = '/login';
        }
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(intervalId);
  }, [setToken, setUser]);

  // Attempt to restore conversation on app startup
  useEffect(() => {
    if (!currentConversation) {
      // Try to restore from localStorage
      const savedConversationId = localStorage.getItem('current-conversation-id');
      if (savedConversationId) {
        console.log('Attempting to restore conversation on app startup:', savedConversationId);
        
        // Fetch the conversation details
        conversationApi.getConversations()
          .then(conversations => {
            const savedConversation = conversations.find(c => c.conversationId === savedConversationId);
            if (savedConversation) {
              console.log('Found saved conversation, restoring:', savedConversation);
              // Map the API response to our Conversation type
              const mappedConversation: Conversation = {
                conversationId: savedConversation.conversationId,
                title: savedConversation.title || 'Untitled Conversation',
                managerType: savedConversation.managerType,
                createdAt: savedConversation.createdAt,
                userId: savedConversation.userId
              };
              setCurrentConversation(mappedConversation);
            } else {
              console.warn('Saved conversation ID not found in API response');
            }
          })
          .catch(error => {
            console.error('Error restoring conversation:', error);
          });
      }
    }
  }, []);

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
  });

  // Check if we have a token, regardless of user state
  const hasToken = Boolean(localStorage.getItem('token'));
  
  console.log('App render - has token:', hasToken, 'has user:', Boolean(user));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="min-h-screen bg-white dark:bg-gray-900">
          <Router>
            <RouteObserver />
            <Routes>
              {/* Landing page is always accessible without a token */}
              <Route path="/" element={<LandingPage />} />
              <Route 
                path="/dashboard" 
                element={
                  // Only redirect if we are certain user is not authenticated
                  user || hasToken ? <MainLayout /> : <Navigate to="/login" replace />
                } 
              />
              <Route 
                path="/login" 
                element={
                  // Only redirect if we have both a token and a user
                  user && hasToken ? <Navigate to="/dashboard" replace /> : <LoginPage />
                } 
              />
              <Route 
                path="/register" 
                element={
                  // Only redirect if we have both a token and a user
                  user && hasToken ? <Navigate to="/dashboard" replace /> : <RegisterPage />
                } 
              />
              <Route path="/auth/activate" element={<ActivationPage />} />
              <Route path="/auth/google/callback" element={<OAuthCallback />} />
              <Route path="/auth/github/callback" element={<OAuthCallback />} />
              
              {/* Practice module route removed */}
              
              {/* Catch all route - redirect to landing page if not logged in */}
              <Route path="*" element={
                user && hasToken ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />
              } />
            </Routes>
            
            {/* Add debug reset button that's available on all pages */}
            <ResetButton />
          </Router>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
