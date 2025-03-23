import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { MainLayout } from '@/components/layout/MainLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { LandingPage } from '@/pages/LandingPage';
import { OAuthCallback } from '@/pages/OAuthCallback';
import { ActivationPage } from '@/pages/ActivationPage';
import { useStore } from '@/store/useStore';
import { conversationApi } from '@/services/api';

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

export const App: React.FC = () => {
  const { user, darkMode, setToken, setUser, setCurrentConversation, currentConversation } = useStore();

  // Check for token on app startup and ensure user data is available
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Found token in localStorage, restoring session');
      
      // Format token properly
      const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      setToken(formattedToken);
      
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
    }
  }, [setToken, setUser, user]);

  // Double check token presence periodically to prevent session loss
  useEffect(() => {
    const intervalId = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && !user) {
        console.log('Detected token but no user, restoring user data');
        setUser({
          id: 'session-recovery',
          email: 'user@example.com',
          fullName: 'User'
        });
      }
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [setUser, user]);

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
              setCurrentConversation(savedConversation);
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
        <div className={darkMode ? 'dark' : ''}>
          <div className="min-h-screen bg-white dark:bg-gray-900">
            <Router>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route 
                  path="/dashboard" 
                  element={
                    user || hasToken ? <MainLayout /> : <Navigate to="/login" replace />
                  } 
                />
                <Route 
                  path="/login" 
                  element={user || hasToken ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
                />
                <Route 
                  path="/register" 
                  element={user || hasToken ? <Navigate to="/dashboard" replace /> : <RegisterPage />} 
                />
                <Route path="/auth/activate" element={<ActivationPage />} />
                <Route path="/auth/google/callback" element={<OAuthCallback />} />
                <Route path="/auth/github/callback" element={<OAuthCallback />} />
                {/* Catch all route - redirect to dashboard if logged in, otherwise landing page */}
                <Route path="*" element={
                  user || hasToken ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />
                } />
              </Routes>
            </Router>
          </div>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
