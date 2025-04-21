import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Github, Chrome, AlertCircle, Server, Wifi, WifiOff } from 'lucide-react';
import axios from 'axios';

// Add at the top with other imports
interface TokenVerificationResponse {
  status: string;
  message?: string;
}

// Connection status component for API troubleshooting
const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [message, setMessage] = useState('Checking API connection...');
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    checkApiConnection();
  }, []);
  
  const checkApiConnection = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
      setStatus('checking');
      setMessage('Checking API connection...');
      
      const response = await axios.get(baseUrl, {
        validateStatus: (status) => {
          // Accept both 200-299 and 401 as valid responses
          // 401 means the API is running but we're not authenticated yet
          return (status >= 200 && status < 300) || status === 401;
        }
      });

      // If we get a 401, that's actually good - it means the API is running
      if (response.status === 401) {
        setStatus('connected');
        setMessage('API available (requires authentication)');
      } else {
        setStatus('connected');
        setMessage(`API connected (${response.status})`);
      }
    } catch (error: any) {
      setStatus('error');
      if (error.code === 'ERR_NETWORK') {
        setMessage('Cannot connect to API: Network Error - Is the backend running?');
      } else {
        setMessage(`Cannot connect to API: ${error.message}`);
      }
    }
  };
  
  return (
    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {status === 'checking' && <Server className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500 animate-pulse" />}
          {status === 'connected' && <Wifi className="h-4 w-4 mr-2 text-green-500" />}
          {status === 'error' && <WifiOff className="h-4 w-4 mr-2 text-red-500" />}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {message}
          </span>
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          <button
            type="button"
            onClick={checkApiConnection}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300">
          <p>API URL: {import.meta.env.VITE_API_URL || 'http://localhost:8443'}</p>
          <p>Having trouble connecting? Try the <Link to="/debug" className="text-blue-600 dark:text-blue-400 hover:underline">diagnostic page</Link>.</p>
        </div>
      )}
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('egemenmermer@gmail.com');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check authentication status only once on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        console.log('No token found, staying on login page');
        return;
      }

      try {
        // Ensure token has Bearer prefix
        const formattedToken = storedToken.startsWith('Bearer ') ? storedToken : `Bearer ${storedToken}`;
        
        // Verify token with backend
        const response = await axios.get<TokenVerificationResponse>('/api/v1/auth/verify-token', {
          headers: { Authorization: formattedToken }
        });
        
        console.log('Token verification response:', response.data);
        
        if (response.data.status === 'ok') {
          // Update token format if needed
          if (formattedToken !== storedToken) {
            console.log('Updating token format in localStorage');
            localStorage.setItem('token', formattedToken);
          }
          
          // Clear any refresh counters
          sessionStorage.removeItem('login_refresh_count');
          
          // Token is valid, would redirect but navigation is commented out for test
          console.log('Token valid, would redirect but navigation is commented out for test');
          // navigate('/dashboard', { replace: true }); // <<< COMMENT THIS OUT
        } else {
          console.log('Token invalid, clearing and staying on login page');
          localStorage.removeItem('token');
          sessionStorage.removeItem('login_refresh_count');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('token');
        sessionStorage.removeItem('login_refresh_count');
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('!!! handleSubmit function CALLED via onClick !!!');
    e.preventDefault();
    alert("handleSubmit reached after preventDefault!");
    console.log('handleSubmit: Default prevented.');
    // Keep login call commented out for now
    console.log('handleSubmit: Reached end (alert test)');
  };

  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/oauth/google/callback`;
    const scope = 'email profile';
    
    console.log('Initiating Google login');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    window.location.href = url;
  };

  const getErrorMessage = (error: string | null) => {
    if (!error) return null;
    
    // Map specific error messages to user-friendly text
    if (error.includes('credentials')) {
      return 'Invalid email or password';
    }
    
    return error;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Sign in</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
            >
              create a new account
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-3 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <span>{getErrorMessage(error)}</span>
              {error.includes('401') && (
                <div className="mt-2 text-xs">
                  API connection issue detected. Try{' '}
                  <Link 
                    to="/debug" 
                    className="underline font-medium"
                  >
                    diagnostic page
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Chrome className="h-5 w-5 mr-2" />
                  Google
                </button>
              </div>
              <div>
                <button
                  type="button"
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Github className="h-5 w-5 mr-2" />
                  GitHub
                </button>
              </div>
            </div>
          </div>
        </form>
        
        <ConnectionStatus />
      </div>
    </div>
  );
}; 