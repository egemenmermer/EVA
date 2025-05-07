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
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Meet EVA – Your AI Companion for Ethical Decision-Making
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Practice navigating complex ethical scenarios with confidence and clarity.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleGetStarted}
              className="px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Start Practicing
            </button>
            <a
              href="#learn-more"
              className="px-6 py-3 text-lg font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* Introduction Section */}
      <div id="learn-more" className="bg-white dark:bg-gray-800 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              What is EVA?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              EVA (Ethical Virtual Assistant) helps software professionals navigate challenging ethical situations, 
              specifically tailored to issues of data privacy and feasibility. Train with scenarios, understand 
              different managerial attitudes, and confidently handle real-world ethical dilemmas.
            </p>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            How EVA Works
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Pick a Manager Type
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                EVA can simulate different managerial styles to help you practice handling various scenarios. Choose the manager personality you want to practice with.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Practice & Get Feedback
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Engage with EVA's realistic simulations, respond to multiple-choice prompts, and receive immediate feedback. Your decisions are scored based on ethical principles.
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Receive Detailed Analysis
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                After completing a scenario, receive a comprehensive analysis of your ethical decision-making, including strengths and areas for improvement.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Apply Your Knowledge
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Take what you've learned back to your real-world workplace, equipped with practical strategies for ethical advocacy in challenging situations.
              </p>
            </div>
          </div>

          {/* Manager Types Section */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
              Available Manager Types
            </h3>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-t-4 border-red-500">
                <div className="flex items-center justify-center mb-5">
                  <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-700 p-1 border-2 border-red-500 overflow-hidden">
                    <img 
                      src={getManagerIcon('PUPPETEER', isDarkMode)} 
                      alt="Puppeteer Manager" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 text-center">
                  Puppeteer
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Controls project flow to nudge developers into unethical decisions through direct orders, intimidation, and creating environments where ethical violations feel necessary.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc pl-5">
                  <li>Uses manipulative tactics to influence team members</li>
                  <li>Creates pressure to compromise on ethical standards</li>
                  <li>Controls information flow to guide decisions</li>
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-t-4 border-yellow-500">
                <div className="flex items-center justify-center mb-5">
                  <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-700 p-1 border-2 border-yellow-500 overflow-hidden">
                    <img 
                      src={getManagerIcon('DILUTER', isDarkMode)} 
                      alt="Diluter Manager" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 text-center">
                  Diluter
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Weakens ethical concerns by systematically minimizing their importance or urgency, suggesting they're not applicable in the current context.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc pl-5">
                  <li>Minimizes the significance of ethical problems</li>
                  <li>Rationalizes questionable practices as necessary</li>
                  <li>Downplays potential consequences of ethical violations</li>
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-t-4 border-blue-500">
                <div className="flex items-center justify-center mb-5">
                  <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-700 p-1 border-2 border-blue-500 overflow-hidden">
                    <img 
                      src={getManagerIcon('CAMOUFLAGER', isDarkMode)} 
                      alt="Camouflager Manager" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 text-center">
                  Camouflager
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Disguises unethical requests as standard business practices or hides problematic aspects behind technical language and euphemisms.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc pl-5">
                  <li>Obscures ethical issues with complex jargon</li>
                  <li>Creates confusion around ethical responsibilities</li>
                  <li>Uses misdirection to avoid addressing concerns</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Practice with EVA?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-4">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Knowledge-Based
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Practice based on ACM, IEEE guidelines, GDPR standards, and comprehensive ethical frameworks.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-4">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Multiple Manager Types
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Experience different managerial approaches to ethical challenges and develop adaptable response strategies.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-4">
                <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Interactive Learning
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Receive real-time feedback and scoring on your ethical decision-making process and choices.
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Ethical Reasoning Framework
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Learn established ethical principles and reasoning techniques applicable to real-world situations.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-4">
                <Rocket className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  AI-Powered Guidance
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Access intelligent, contextual responses powered by state-of-the-art large language models.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center mb-4">
                <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Performance Tracking
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Monitor and improve your ethical reasoning skills over time with detailed performance metrics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            How It Helps You Grow
          </h2>
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              EVA provides a safe space to practice ethical decision-making before facing real-world scenarios. By engaging with different manager types and ethical dilemmas, you'll develop:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-left">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ethical Advocacy Skills</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">Learn practical strategies for advocating ethical positions in challenging workplace environments.</p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-left">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ethical Confidence</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">Build the confidence to address ethical concerns professionally and effectively.</p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-left">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ethical Language</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">Develop a vocabulary for discussing ethical issues within technical contexts.</p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-left">
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Future-Ready Skills</h3>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">Prepare for an industry increasingly focused on responsible technology development.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="py-16 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Ready to Start?
          </h2>
          <button
            onClick={handleGetStarted}
            className="px-8 py-4 text-xl font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Start Practicing Now
          </button>
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