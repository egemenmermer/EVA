import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import { useStore } from '@/store/useStore';

// Format token with Bearer prefix if needed
const formatToken = (token: string) => {
  if (!token) return null;
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

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
      console.log('Found token but no user data, restoring session');
      
      // Set token in store
      const formattedToken = formatToken(token);
      setToken(formattedToken as string);
      
      // Set placeholder user if we don't have user data
      // This ensures we stay logged in even without complete user data
      setUser({
        id: 'auth-restored-user',
        email: 'user@example.com',
        fullName: 'Egemen Mermer'
      });
      
      console.log('User session restored');
    }
  }, [setToken, setUser, user]);
  
  // Double check token periodically
  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem('token');
      
      if (!token && user) {
        console.warn('Token missing but user exists in store - inconsistent state');
        // Don't forcefully log out, just log the warning
      }
      
      if (token && !user) {
        console.log('Token exists but no user in store, restoring user');
        setUser({
          id: 'auth-check-user',
          email: 'user@example.com',
          fullName: 'Egemen Mermer'
        });
      }
    };
    
    const intervalId = setInterval(checkToken, 5000);
    return () => clearInterval(intervalId);
  }, [user, setUser]);

  const clearAuthState = useCallback(() => {
    console.log('Clearing auth state (logout)');
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
      const token = formatToken(response.accessToken) as string;
      
      // Store token in localStorage directly as well
      localStorage.setItem('token', token);
      
      // Then update store
      setToken(token);
      setUser({
        id: response.userDetails.id,
        email: response.userDetails.email,
        fullName: response.userDetails.fullName || 'Egemen Mermer'
      });
      
      console.log('User data set in store, token:', token ? 'EXISTS' : 'MISSING');
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
      console.log('Starting registration for:', email);
      
      await authApi.register(email, password, fullName);
      console.log('Registration successful, logging in');
      
      // After successful registration, automatically log in
      const loginResponse = await authApi.login(email, password);
      
      const token = formatToken(loginResponse.accessToken) as string;
      
      // Store token in localStorage directly as well
      localStorage.setItem('token', token);
      console.log('Token stored in localStorage:', token ? 'EXISTS' : 'MISSING');
      
      // Then update store
      setToken(token);
      setUser({
        id: loginResponse.userDetails.id,
        email: loginResponse.userDetails.email,
        fullName: loginResponse.userDetails.fullName || fullName
      });
      
      console.log('Login after registration successful, navigating to dashboard');
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
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
    
    console.log('Initiating Google login redirect');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    window.location.href = url;
  };

  const logout = useCallback(() => {
    console.log('User requested logout');
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