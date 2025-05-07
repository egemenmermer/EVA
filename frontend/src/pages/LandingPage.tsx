import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Shield, Eye, Wand2, BookOpen, Brain, Target, Rocket } from 'lucide-react';
import { useStore } from '@/store/useStore';

// Import manager icons
import puppeteerLightPng from '@/assets/manager-icons/puppeteer-manager-light.png';
import puppeteerDarkPng from '@/assets/manager-icons/puppeteer-manager-dark.png';
import diluterLightPng from '@/assets/manager-icons/diluter-manager-light.png';
import diluterDarkPng from '@/assets/manager-icons/diluter-manager-dark.png';
import camouflagerLightPng from '@/assets/manager-icons/camouflager-manager-light.png';
import camouflagerDarkPng from '@/assets/manager-icons/camouflager-manager-dark.png';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  
  // State to track dark mode
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  
  // Listen for dark mode changes
  useEffect(() => {
    const darkModeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });
    
    darkModeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => darkModeObserver.disconnect();
  }, []);
  
  // Function to get the appropriate manager icon based on manager type and dark mode
  const getManagerIcon = (managerType: string, isDarkMode: boolean = false) => {
    const type = managerType.toUpperCase();
    
    switch (type) {
      case 'PUPPETEER':
        return isDarkMode ? puppeteerDarkPng : puppeteerLightPng;
      case 'DILUTER':
        return isDarkMode ? diluterDarkPng : diluterLightPng;
      case 'CAMOUFLAGER':
        return isDarkMode ? camouflagerDarkPng : camouflagerLightPng;
      default:
        return isDarkMode ? puppeteerDarkPng : puppeteerLightPng;
    }
  };
  
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
  {/* Sticky Header with Start Button */}
  <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-md z-50">
    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">EVA: Ethical Virtual Assistant</h1>
      <button
        onClick={handleGetStarted}
        className="px-8 py-4 text-lg font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
      >
        Start Practicing
      </button>
    </div>
  </div>

  {/* Spacer to offset fixed header */}
  <div className="pt-24" />

  {/* Hero Section */}
  <div className="container mx-auto px-4 py-20 text-center">
    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
      Practice Ethical Decision-Making in Software Development
    </h2>
    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
      EVA is a research prototype that helps you explore realistic ethical challenges in workplace scenarios guided by simulated manager attitudes.
    </p>
  </div>

{/* About the Project */}
<div className="bg-white dark:bg-gray-800 py-16 px-4">
  <div className="max-w-3xl mx-auto text-center">
    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">About This Project</h3>
    <div className="text-gray-600 dark:text-gray-300 text-lg space-y-6">
      <p>
        This prototype was developed as part of a master's thesis on the role of conversational agents in supporting ethical decision-making. 
        The goal is to let software developers rehearse ethical reasoning in a controlled, interactive setting.
      </p>
      <p>
        Software teams often face ethical challenges related to privacy, bias, and responsible AI. However, developers may lack the time, tools, or confidence to address them effectively. 
        EVA helps by simulating realistic team dynamics and offering structured feedback, supporting users in practicing ethical advocacy and improving their argumentation strategies.
      </p>
      <p>
        By simulating team dynamics and offering structured feedback, EVA helps users prepare for real-world conversations where ethical concerns might otherwise be overlooked. 
        The tool is part of a research project evaluating how such agents impact confidence, awareness, and argumentation in software development settings.
      </p>
    </div>
  </div>
</div>


  {/* Scenario Preview */}
  <div className="bg-gray-50 dark:bg-gray-900 py-16 px-4">
    <div className="max-w-4xl mx-auto">
      <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-12">Features</h3>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Realistic Scenarios</h4>
          <p className="text-gray-600 dark:text-gray-300">
            Engage with short scenarios based on real-world software development challenges.
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Manager Types</h4>
          <p className="text-gray-600 dark:text-gray-300">
            Practice with different manager styles to strengthen your ability to argue in diverse situations.          
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">
          <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Instant Feedback</h4>
          <p className="text-gray-600 dark:text-gray-300">
            Receive immediate, reflective feedback on your decisions after each scenario.
          </p>
        </div>
      </div>
    </div>
  </div>

  {/* Manager Types Section */}
  <div className="bg-white dark:bg-gray-800 py-16 px-4">
    <div className="max-w-5xl mx-auto">
      <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-10">
        Simulated Manager Types
      </h3>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-gray-700 rounded-lg shadow border-t-4 border-red-500">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Puppeteer</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Uses subtle control and pressure to push toward ethically questionable decisions.
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-700 rounded-lg shadow border-t-4 border-yellow-500">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Diluter</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Downplays or rationalizes ethical issues to reduce their perceived importance.
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-700 rounded-lg shadow border-t-4 border-blue-500">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Camouflager</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Obscures ethical problems in jargon, process, or ambiguity.
          </p>
        </div>
      </div>
    </div>
  </div>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Terms of Use</a>
            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Contact</a>
            <a href="https://github.com/yourusername/eva" className="hover:text-blue-600 dark:hover:text-blue-400">GitHub</a>
            <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}; 