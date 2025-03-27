import { useState } from 'react';
import { authApi } from '@/services/api';
import { User } from '@/types';
import { useStore } from '@/store/useStore';
import { LoginResponseDTO } from '@/types/api';

// Format token with Bearer prefix if needed
const formatToken = (token: string): string => {
  if (!token) return '';
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
};

export const useAuth = () => {
  const { user, setUser, setToken } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  const isAuthenticated = !!user && !!localStorage.getItem('token');

  const login = async (email: string, password: string): Promise<LoginResponseDTO> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login for:', email);
      const response = await authApi.login(email, password);
      
      // Format token with Bearer prefix if needed
      const formattedToken = formatToken(response.accessToken);
      
      // Update global state with user data
      setUser(response.userDetails);
      setToken(formattedToken);
      
      // Store token in localStorage
      if (formattedToken) {
        localStorage.setItem('token', formattedToken);
      }
      
      console.log('Login successful for:', response.userDetails.email);
      return response;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Login failed. Please try again.';
      console.error('Login error:', errorMsg);
      setError(errorMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string): Promise<any> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Attempting registration for:', email);
      const response = await authApi.register(email, password, fullName);
      console.log('Registration successful:', response);
      return response;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Registration failed. Please try again.';
      console.error('Registration error:', errorMsg);
      setError(errorMsg);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    
    try {
      await authApi.logout();
      // Clear user state
      setUser(null);
      setToken(null);
      console.log('User logged out successfully');
    } catch (error: any) {
      console.error('Logout failed:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    token: localStorage.getItem('token'),
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated
  };
}; 