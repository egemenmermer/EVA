import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const DebugPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('Checking system...');
  const [tokenInfo, setTokenInfo] = useState<string>('Checking token...');
  const [apiStatus, setApiStatus] = useState<string>('Checking API connection...');
  const [resetComplete, setResetComplete] = useState<boolean>(false);
  
  useEffect(() => {
    checkToken();
    checkApiConnection();
  }, []);
  
  const checkToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setTokenInfo('No token found in localStorage');
    } else {
      setTokenInfo(`Token exists: ${token.substring(0, 20)}...`);
    }
  };
  
  const checkApiConnection = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8443';
      const response = await axios.get(baseUrl, { timeout: 5000 });
      setApiStatus(`API connection successful: ${response.status} ${response.statusText}`);
    } catch (error: any) {
      setApiStatus(`API connection failed: ${error.message}`);
    }
  };
  
  const resetApplicationState = () => {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Show success message
    setStatus('Application state has been reset');
    setTokenInfo('Token removed');
    setResetComplete(true);
  };
  
  const goToLogin = () => {
    navigate('/login');
  };
  
  const goToLanding = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-600 p-4">
          <h1 className="text-xl text-white font-bold">EVA System Diagnostics</h1>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">System Status</h2>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm">
              {status}
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Token Information</h2>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm">
              {tokenInfo}
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">API Connection</h2>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-sm">
              {apiStatus}
            </div>
            <button 
              onClick={checkApiConnection}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-md text-sm"
            >
              Recheck API
            </button>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
            <button 
              onClick={resetApplicationState}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md"
              disabled={resetComplete}
            >
              Reset Application State
            </button>
            
            {resetComplete && (
              <div className="flex space-x-4">
                <button 
                  onClick={goToLogin}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
                >
                  Go to Login
                </button>
                <button 
                  onClick={goToLanding}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                >
                  Go to Landing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 