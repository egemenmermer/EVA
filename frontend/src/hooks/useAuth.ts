import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import { useStore } from '@/store/useStore';

export const useAuth = () => {
  const navigate = useNavigate();
  const { setUser, setToken, user } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check for token on mount and set user if not already set
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // If we have a token but no user, attempt to load user data
    if (token && !user) {
      // Set token in store
      const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      setToken(formattedToken);
      
      // Attempt to set dummy user if we don't have user data
      // This ensures we stay logged in even without complete user data
      if (!user) {
        setUser({
          id: 'cached-user',
          email: 'user@example.com',
          fullName: 'User'
        });
      }
    }
  }, [setToken, setUser, user]);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, [setUser, setToken]);

  const login = async ({ email, password }: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Starting login process for:', email);
      
      const response = await authApi.login(email, password);
      console.log('Login response received');
      
      if (!response.accessToken || !response.userDetails) {
        throw new Error('Invalid response format from server');
      }
      
      console.log('Storing token and user data');
      const token = response.accessToken.startsWith('Bearer ') 
        ? response.accessToken 
        : `Bearer ${response.accessToken}`;
      
      // Store token in localStorage directly as well
      localStorage.setItem('token', token);
      
      // Then update store
      setToken(token);
      setUser({
        id: response.userDetails.id,
        email: response.userDetails.email,
        fullName: response.userDetails.fullName
      });
      
      console.log('User data set in store');
      console.log('Navigating to dashboard');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      clearAuthState();
      setError(err instanceof Error ? err : new Error('Failed to login'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async ({ email, password, fullName }: { email: string; password: string; fullName: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      await authApi.register(email, password, fullName);
      // After successful registration, automatically log in
      const loginResponse = await authApi.login(email, password);
      
      const token = loginResponse.accessToken.startsWith('Bearer ') 
        ? loginResponse.accessToken 
        : `Bearer ${loginResponse.accessToken}`;
      
      // Store token in localStorage directly as well
      localStorage.setItem('token', token);
      
      // Then update store
      setToken(token);
      setUser({
        id: loginResponse.userDetails.id,
        email: loginResponse.userDetails.email,
        fullName: loginResponse.userDetails.fullName
      });
      
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to register'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'email profile';
    
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    window.location.href = url;
  };

  const logout = useCallback(() => {
    clearAuthState();
    navigate('/login');
  }, [clearAuthState, navigate]);

  return {
    login,
    register,
    loginWithGoogle,
    logout,
    isLoading,
    error
  };
}; 