import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/services/api';
import { useStore } from '@/store/useStore';

export const useAuth = () => {
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const login = async ({ email, password }: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authApi.login(email, password);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      navigate('/dashboard');
    } catch (err) {
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
      localStorage.setItem('token', loginResponse.token);
      setUser(loginResponse.user);
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

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return {
    login,
    register,
    loginWithGoogle,
    logout,
    isLoading,
    error
  };
}; 