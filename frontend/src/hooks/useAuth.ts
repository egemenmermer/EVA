import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi } from '@/services/api';
import { useStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';
import type { LoginResponseDTO } from '@/types/api';

export const useAuth = () => {
  const { setUser } = useStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      authApi.login(credentials.email, credentials.password),
    onSuccess: (data: LoginResponseDTO) => {
      localStorage.setItem('token', data.token);
      setUser(data.user);
      navigate('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { email: string; password: string; fullName: string }) =>
      authApi.register(data.email, data.password, data.fullName),
  });

  const loginWithGoogle = () => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'email profile';
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    
    window.location.href = authUrl;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    loginWithGoogle,
    logout,
    isLoading: loginMutation.isLoading || registerMutation.isLoading,
    error: loginMutation.error || registerMutation.error,
  };
}; 