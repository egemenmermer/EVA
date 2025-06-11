import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Shield, Eye, Wand2, BookOpen, Brain, Target, Rocket, Moon, Sun, ChevronRight, ChevronLeft, Presentation, Maximize, Minimize } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { PresentationSlideshow } from '@/components/PresentationSlideshow';

// Import manager icons
import puppeteerLightPng from '@/assets/manager-icons/puppeteer-manager-light.png';
import puppeteerDarkPng from '@/assets/manager-icons/puppeteer-manager-dark.png';
import diluterLightPng from '@/assets/manager-icons/diluter-manager-light.png';
import diluterDarkPng from '@/assets/manager-icons/diluter-manager-dark.png';
import camouflagerLightPng from '@/assets/manager-icons/camouflager-manager-light.png';
import camouflagerDarkPng from '@/assets/manager-icons/camouflager-manager-dark.png';

// Import logo
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  
  // State to track dark mode
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  
  // State for the About section tabs
  const [activeAboutTab, setActiveAboutTab] = useState(0);
  
  // State for hero slides
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Hero slides content
  const heroSlides = [
    {
      title: "Ethical Decision-Making Practice Tool for Software Development",
      description: "EVA is a research prototype developed for a master's thesis to explore ethical challenges in software development through simulated workplace scenarios with different manager types.",
      showLogo: true
    },
    {
      title: "Research Presentation",
      description: "This slide contains the experiment introduction presentation for participants.",
      showLogo: false,
      isPresentationSlide: true
    }
  ];
  
  // About section content
  const aboutContent = [
    {
      title: "Project Background",
      content: "This prototype was developed as part of a master's thesis exploring how conversational agents can support ethical decision-making in software development."
    },
    {
      title: "Addressing Concerns",
      content: "Developers often face ethical concerns around privacy, bias, and responsible AI, but lack the time, support, or confidence to act on them. EVA helps bridge that gap."
    },
    {
      title: "Research Impact",
      content: "By simulating team dynamics and providing structured feedback, EVA helps users build confidence and improve their ethical reasoning in realistic situations."
    }
  ];
  
  // Auto-rotate tabs every 10 seconds
  useEffect(() => {
    const tabInterval = setInterval(() => {
      setActiveAboutTab(prev => (prev + 1) % aboutContent.length);
    }, 10000);
    
    return () => clearInterval(tabInterval);
  }, []);
  
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
  
  // Toggle dark mode function
  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
  };
  
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

{/* Modern Header with Centered Logo and EVA label */}
<header className="fixed top-0 left-0 right-0 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 shadow-sm z-50 border-b border-gray-200 dark:border-gray-700">
  <div className="container mx-auto px-4 py-3 flex justify-center items-center relative">
    <div className="absolute right-4">
      <button 
        onClick={toggleDarkMode}
        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        aria-label="Toggle dark mode"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </div>
    <div className="flex items-center space-x-2">
      <span className="text-xl font-semibold text-gray-900 dark:text-white">EVA</span>
      <img 
        src={isDarkMode ? logoDark : logoLight} 
        alt="EVA Logo" 
        className="h-8 md:h-10 w-auto"
      />
      <h1 className="text-xl font-medium text-gray-900 dark:text-white hidden sm:block">
        Ethical Virtual Assistant
      </h1>
    </div>
  </div>
</header>

{/* Fixed Start Button at Bottom */}
<div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
  <button
    onClick={handleGetStarted}
    className="px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md"
  >
    Start Practicing
  </button>
</div>


  {/* Spacer to offset fixed header */}
  <div className="pt-16 md:pt-20" />

  {/* Hero Section - Logo above text */}
  <section className="container mx-auto px-4 py-16 md:py-24 text-center">
    <div className="max-w-3xl mx-auto">
      <img 
        src={isDarkMode ? logoDark : logoLight} 
        alt="EVA Logo" 
        className="mx-auto w-32 h-auto mb-8"
      />
      <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
        Practice Ethical Decision-Making in Software Development
      </h2>
      <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
        EVA is a research prototype that helps users explore complex ethical challenges through realistic workplace scenarios and simulated manager behaviors.
      </p>
    </div>
  </section>

  {/* About the Project - Cleaner and Centered */}
  <section className="bg-white dark:bg-gray-800 py-16 px-4">
    <div className="max-w-4xl mx-auto text-center">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">About This Project</h3>
      
      <div className="mb-6 flex justify-center space-x-3">
        {aboutContent.map((tab, index) => (
          <button 
            key={index}
            onClick={() => setActiveAboutTab(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === activeAboutTab 
                ? 'bg-blue-600 transform scale-125' 
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
            aria-label={`View ${tab.title}`}
          />
        ))}
      </div>

      <div className="text-gray-600 dark:text-gray-300 text-lg relative min-h-[180px]">
        {aboutContent.map((tab, index) => (
          <div 
            key={index} 
            className={`absolute top-0 left-0 w-full transition-opacity duration-500 ${
              index === activeAboutTab ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">{tab.title}</h4>
            <p className="leading-relaxed">{tab.content}</p>
          </div>
        ))}
      </div>
    </div>
  </section>


  {/* Manager Types Section - More modern with better spacing */}
  <section className="bg-gray-50 dark:bg-gray-900 py-16 px-4">
    <div className="max-w-6xl mx-auto">
      <h3 className="text-2xl font-bold text-left md:text-center text-gray-900 dark:text-white mb-10">
        Simulated Manager Types
      </h3>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="p-6 bg-white dark:bg-gray-700 rounded-xl shadow-md hover:shadow-lg transition-shadow border-t-4 border-red-500">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 p-1 border-2 border-red-500 overflow-hidden">
              <img 
                src={getManagerIcon('PUPPETEER', isDarkMode)} 
                alt="Puppeteer Manager" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">Puppeteer</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-justify">
            Uses authority and pressure to push decisions forward, often sidelining ethical concerns in the process.
          </p>
          <ul className="mt-3 text-xs text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
            <li>Uses influence strategies in decision-making</li>
            <li>Creates pressure on ethical boundaries</li>
            <li>Controls information flow in discussions</li>
          </ul>
        </div>
        <div className="p-6 bg-white dark:bg-gray-700 rounded-xl shadow-md hover:shadow-lg transition-shadow border-t-4 border-yellow-500">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 p-1 border-2 border-yellow-500 overflow-hidden">
              <img 
                src={getManagerIcon('DILUTER', isDarkMode)} 
                alt="Diluter Manager" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">Diluter</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-justify">
            Downplays ethical issues and frames them as minor or irrelevant in the broader context of business goals.
          </p>
          <ul className="mt-3 text-xs text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
            <li>Minimizes the importance of ethical implications</li>
            <li>Provides rationalizations for questionable practices</li>
            <li>Understates potential risks and consequences</li>
          </ul>
        </div>
        <div className="p-6 bg-white dark:bg-gray-700 rounded-xl shadow-md hover:shadow-lg transition-shadow border-t-4 border-blue-500">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 p-1 border-2 border-blue-500 overflow-hidden">
              <img 
                src={getManagerIcon('CAMOUFLAGER', isDarkMode)} 
                alt="Camouflager Manager" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">Camouflager</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-left">
            Conceals ethically problematic directives beneath established business methodologies or obscures questionable elements through technical terminology and complex language.
          </p>
          <ul className="mt-3 text-xs text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
            <li>Uses complex language to obscure meaning</li>
            <li>Creates ambiguity around ethical responsibilities</li>
            <li>Employs misdirection techniques for ethical concerns</li>
          </ul>
        </div>
      </div>
    </div>
  </section>


  {/* Features Section - More modern with better layout */}
  <section className="bg-white dark:bg-gray-800 py-16 px-4">
    <div className="max-w-6xl mx-auto">
      <h3 className="text-2xl font-bold text-left md:text-center text-gray-900 dark:text-white mb-10">Features</h3>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mr-4">
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">Knowledge-Based</h4>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
            Learn from trusted ethical frameworks like ACM, IEEE, and GDPR.
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
            <li>Professional standards</li>
            <li>Compliance insights</li>
            <li>Guided learning</li>
          </ul>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg mr-4">
              <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">AI-Powered Responses</h4>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
            Get contextual advice powered by intelligent language models.
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
            <li>GPT-based interaction</li>
            <li>Responsive feedback</li>
            <li>Realistic scenarios</li>
          </ul>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mr-4">
              <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">Performance Tracking</h4>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
            View your progress and improve with feedback and analytics.
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
            <li>Skill-based scoring</li>
            <li>Progress insights</li>
            <li>Growth suggestions</li>
          </ul>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600 dark:text-yellow-400"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>
            </div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">Interactive Practice</h4>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
            Practice ethical decisions in lifelike, evolving workplace cases.
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
            <li>Scenario-based sessions</li>
            <li>Real-time reactions</li>
            <li>Layered challenges</li>
          </ul>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400"><path d="m21 9-9-7-9 7v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9z"/><polyline points="3 10 12 17 21 10"/></svg>
            </div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">Ethical Reasoning</h4>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
            Use structured techniques to explore and defend ethical choices.
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
            <li>Rhetorical strategies</li>
            <li>Ethics-based framing</li>
            <li>Dialogue simulation</li>
          </ul>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center mb-4">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-lg mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 dark:text-indigo-400"><path d="M8 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/><path d="M18 12H8"/><path d="M12 16H8"/><path d="M12 8H8"/><circle cx="16" cy="16" r="2"/><path d="M19 10a2 2 0 0 0-2-2"/><path d="M21 13a4 4 0 0 0-4-4"/></svg>
            </div>
            <h4 className="text-xl font-semibold text-gray-900 dark:text-white">Secure Platform</h4>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
            Work securely with encrypted logins and private session handling.
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
            <li>OAuth and JWT security</li>
            <li>Private conversation logs</li>
            <li>Dark mode included</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

</div>
  );
}; 