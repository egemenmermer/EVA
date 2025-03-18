import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Shield, Eye, Wand2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Ethical AI Decision Assistant
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Your intelligent companion for making ethical decisions in software development.
            Get personalized guidance through complex ethical challenges.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Get Started
            <Bot className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Manager Types Section */}
      <div className="bg-white dark:bg-gray-800 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Our AI Managers
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
                Guides you through ethical decisions by providing step-by-step reasoning and 
                clear explanations. Perfect for understanding complex ethical implications.
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
                Helps mitigate ethical risks by analyzing potential consequences and suggesting
                safer alternatives. Focuses on harm reduction and ethical safeguards.
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
                Specializes in privacy and security considerations, helping you identify and
                address potential ethical concerns in data handling and user privacy.
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