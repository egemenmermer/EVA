import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { user, setUser, setToken, clearAllData } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  const isAuthenticated = !!user && !!localStorage.getItem('token');

  const login = async (email: string, password: string): Promise<LoginResponseDTO> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login for:', email);
      
      // First, clear all data from any previous session
      clearAllData();
      
      const response = await authApi.login(email, password);
      
      // Remove only auth-related items from localStorage
      // This ensures previous user data doesn't persist but keeps other data
      console.log('Removing auth-related data for new login session');
      localStorage.removeItem('token');
      
      // Format token with Bearer prefix if needed
      const formattedToken = formatToken(response.accessToken);
      
      // Update global state with user data
      setUser(response.userDetails);
      setToken(formattedToken);
      
      // Store token in localStorage
      if (formattedToken) {
        localStorage.setItem('token', formattedToken);
      }
      
      console.log('Login successful in useAuth for:', response.userDetails.email);
      
      // Always navigate to dashboard after login, the modal will show if needed
      console.log('Navigating to dashboard, quiz modal will show if needed');
      navigate('/dashboard', { replace: true });
      
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
      
      // Clear all data from the Zustand store
      clearAllData();
      
      // Also, explicitly clear all conversation messages from localStorage
      console.log('Clearing all conversation messages from localStorage...');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('messages_') || key.startsWith('backup_messages_')) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('User logged out successfully');
    } catch (error: any) {
      console.error('Logout failed:', error.message);
      // Even if API fails, clear data locally
      clearAllData();
    } finally {
      setLoading(false);
      navigate('/login', { replace: true });
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