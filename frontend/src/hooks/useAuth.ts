import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import { useStore } from '@/store/useStore';

export const useAuth = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, [setUser]);

  const login = async ({ email, password }: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Starting login process for:', email);
      
      const response = await authApi.login(email, password);
      console.log('Login response received:', response);
      
      if (!response.accessToken || !response.userDetails) {
        throw new Error('Invalid response format from server');
      }
      
      console.log('Storing token and user data');
      const token = response.accessToken.startsWith('Bearer ') 
        ? response.accessToken 
        : `Bearer ${response.accessToken}`;
      localStorage.setItem('token', token);

      setUser({
        id: response.userDetails.id,
        email: response.userDetails.email,
        fullName: response.userDetails.fullName
      });
      
      console.log('User data set in store:', response.userDetails);
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
      localStorage.setItem('token', loginResponse.accessToken);
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