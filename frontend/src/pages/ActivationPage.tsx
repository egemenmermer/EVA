import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/services/api';
import { Loader2 } from 'lucide-react';

export const ActivationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activationAttempted = useRef(false);

  useEffect(() => {
    const activateAccount = async () => {
      // Prevent multiple activation attempts
      if (activationAttempted.current) {
        return;
      }
      activationAttempted.current = true;

      try {
        const token = searchParams.get('token');
        console.log('Attempting account activation with token:', token ? 'Present' : 'Missing');
        
        if (!token) {
          setError('No activation token found in URL');
          setIsLoading(false);
          return;
        }

        const response = await authApi.activate(token);
        console.log('Activation successful:', response);
        
        // Wait a bit before redirecting to show success message
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (err: any) {
        console.error('Activation failed:', {
          message: err.message,
          response: err.response?.data
        });
        setError(err.response?.data?.message || err.message || 'Failed to activate account');
      } finally {
        setIsLoading(false);
      }
    };

    activateAccount();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        {isLoading ? (
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Activating your account...
            </h2>
          </div>
        ) : error ? (
          <div className="text-center">
            <div className="text-red-500 text-lg mb-4">
              {error}
            </div>
            <button
              onClick={() => navigate('/login')}
              className="text-blue-500 hover:text-blue-600"
            >
              Return to login
            </button>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Account activated successfully!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You will be redirected to the login page shortly...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}; 