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

// Configure the query client with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
  },
});

export const App: React.FC = () => {
  const { user, darkMode, setToken, setUser } = useStore();

  // Check for token on app startup
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      console.log('Found token, restoring session');
      // Format token properly
      const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      setToken(formattedToken);
      
      // Set a placeholder user if we don't have user data
      if (!user) {
        setUser({
          id: 'restored-session',
          email: 'user@example.com',
          fullName: 'User'
        });
      }
    }
  }, [setToken, setUser, user]);

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
