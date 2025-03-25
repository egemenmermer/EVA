import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Shield, Eye, Wand2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  
  // Debug check to prevent any refresh loops
  useEffect(() => {
    console.log('Landing page mounted, user:', Boolean(user));
    
    // Ensure the landing page doesn't have incorrect styling classes
    document.body.classList.remove('dashboard-active', 'login-page');
    document.body.classList.add('landing-page');
    
    // Check URL for ?stay=true parameter to prevent redirect when intentionally visiting
    const urlParams = new URLSearchParams(window.location.search);
    const stayOnLanding = urlParams.get('stay') === 'true';
    
    if (stayOnLanding) {
      console.log('Stay parameter detected, skipping redirect');
      return;
    }
    
    // If we're logged in, redirect to dashboard after a short delay
    // This helps prevent infinite redirect loops
    const token = localStorage.getItem('token');
    
    // Only redirect if we have both a token and user data
    if (token && user && parseInt(sessionStorage.getItem('landing_refresh_count') || '0') < 3) {
      console.log('User is logged in, redirecting to dashboard in 500ms');
      const redirectTimer = setTimeout(() => {
        navigate('/dashboard');
      }, 500);
      
      return () => clearTimeout(redirectTimer);
    } else if (parseInt(sessionStorage.getItem('landing_refresh_count') || '0') >= 5) {
      console.warn('Too many landing page refreshes detected, clearing problematic state');
      sessionStorage.removeItem('landing_refresh_count');
      localStorage.removeItem('token');
    }
    
    return () => {
      console.log('Landing page unmounted');
      sessionStorage.removeItem('landing_refresh_count');
    };
  }, [navigate, user]);
  
  const handleGetStarted = () => {
    if (user) {
      console.log('User already logged in, navigating to dashboard');
      navigate('/dashboard');
    } else {
      console.log('Get Started clicked, navigating to login');
      navigate('/login');
    }
  };
  
  // Log renders
  console.log('LandingPage rendering');
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            EVA - Ethical Virtual Assistant
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Your intelligent companion for making ethical decisions in software development.
            Get personalized guidance through complex ethical challenges.
          </p>
          <button
            onClick={handleGetStarted}
            className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Get Started
            <Bot className="ml-2 h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Manager Types Section */}
      <div className="bg-white dark:bg-gray-800 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Manager Types
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Puppeteer */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 shadow-lg">
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Wand2 className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Puppeteer
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Controls project flow to nudge developers into unethical decisions.
              </p>
            </div>

            {/* Diluter */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 shadow-lg">
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Diluter
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Weakens ethical concerns by making them seem less important.
              </p>
            </div>

            {/* Camouflager */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 shadow-lg">
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Eye className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Camouflager
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Hides ethical concerns in bureaucracy or misleading language.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Real-time Guidance
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get instant ethical advice as you develop your software
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Case-based Learning
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Learn from a vast database of ethical case studies
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Customizable Approach
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Choose the AI manager that best fits your needs
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 