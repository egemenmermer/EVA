import React from 'react';
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

const queryClient = new QueryClient();

export const App: React.FC = () => {
  const { user, darkMode } = useStore();

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
                    user ? <MainLayout /> : <Navigate to="/login" replace />
                  } 
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/auth/activate" element={<ActivationPage />} />
                <Route path="/auth/google/callback" element={<OAuthCallback />} />
                <Route path="/auth/github/callback" element={<OAuthCallback />} />
                {/* Catch all route - redirect to landing page */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Router>
          </div>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
