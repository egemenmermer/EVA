import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Shield, Eye, Wand2, BookOpen, Brain, Target, Rocket } from 'lucide-react';
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
                EVA can simulate different managerial styles to help you practice handling various scenarios.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Practice & Get Feedback
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Engage with EVA's realistic simulations, respond to multiple-choice prompts, and receive immediate feedback.
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
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Puppeteer
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Controls project flow to nudge developers into unethical decisions.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc pl-5">
                  <li>Uses manipulative tactics to influence team members</li>
                  <li>Creates pressure to compromise on ethical standards</li>
                  <li>Controls information flow to guide decisions</li>
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-t-4 border-yellow-500">
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Diluter
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Weakens ethical concerns by making them seem less important.
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-disc pl-5">
                  <li>Minimizes the significance of ethical problems</li>
                  <li>Rationalizes questionable practices as necessary</li>
                  <li>Downplays potential consequences of ethical violations</li>
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-t-4 border-blue-500">
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Camouflager
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Hides ethical concerns in bureaucracy or misleading language.
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
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Realistic Ethical Dilemmas
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Scenarios based on real-life case studies and industry guidelines.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Interactive Feedback
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Instantly understand your strengths and areas for improvement.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Adaptability
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Experience various manager personalities to prepare for diverse workplace interactions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Knowledge-Powered
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Backed by ACM, IEEE guidelines, GDPR compliance standards, and peer-reviewed research.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  AI-Driven
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Utilizes cutting-edge language models combined with retrieval-augmented generation.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Scenario Diversity
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Wide range of cases across privacy and feasibility ethics, thoroughly vetted and relevant.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <Rocket className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Easy & Interactive
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Simple UI, animated interactions, and immediate scoring.
              </p>
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