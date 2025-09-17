import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { authApi } from '@/services/api';
import { Loader2 } from 'lucide-react';

export const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const provider = window.location.pathname.includes('google') ? 'google' : 'github';

        if (!code) {
          throw new Error('No authorization code found');
        }

        const response = await authApi.oauth2Callback(provider, code);
        localStorage.setItem('token', response.token);
        setUser(response.user);
        navigate('/dashboard');
      } catch (error) {
        console.error('OAuth callback error:', error);
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate, searchParams, setUser]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">Completing sign in...</p>
      </div>
    </div>
  );
}; 