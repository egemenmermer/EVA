import React from 'react';
import { X, Info, RefreshCcw, ArrowLeftCircle, Target } from 'lucide-react';

interface PracticeIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstTimeUser?: boolean;
}

export const PracticeIntroModal: React.FC<PracticeIntroModalProps> = ({ 
  isOpen, 
  onClose, 
  isFirstTimeUser = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Info className="h-6 w-6 text-blue-500 dark:text-blue-300" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isFirstTimeUser ? 'Welcome to Practice Mode' : 'Welcome Back to Practice Mode'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close introduction modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-8">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-2 max-w-3xl mx-auto">
              In EVA's Practice Module, you'll face realistic workplace scenarios with ethically tricky managers. Your goal: respond thoughtfully and see how your choices shape the conversation.
            </p>
            <p className="text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              This is a safe space to experiment, learn, and build your ethical advocacy skills. There are no permanent consequences—just opportunities to grow!
            </p>
          </div>
          
          {isFirstTimeUser ? (
            // First-time user content - no shutdown path info
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Learning Through Practice */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-500 dark:text-blue-300" />
                  <span className="font-semibold text-blue-800 dark:text-blue-200">Learning Through Practice</span>
                </div>
                <p className="text-blue-700 dark:text-blue-200 text-sm flex-grow">
                  Every choice you make will lead the conversation in different directions. Explore different tactics and see how the manager responds. The goal is to find effective ways to advocate for ethical decisions.
                </p>
              </div>

              {/* Recovery & Trying Again */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCcw className="h-5 w-5 text-green-500 dark:text-green-300" />
                  <span className="font-semibold text-green-800 dark:text-green-200">Multiple Paths to Explore</span>
                </div>
                <p className="text-green-700 dark:text-green-200 text-sm flex-grow">
                  Each scenario has multiple paths and outcomes. If you want to explore different approaches, you can always restart and try a different strategy. Every conversation teaches something new!
                </p>
              </div>

              {/* Tips for Success */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-yellow-500 dark:text-yellow-300" />
                  <span className="font-semibold text-yellow-800 dark:text-yellow-200">Tips for Success</span>
                </div>
                <ul className="list-disc pl-5 text-yellow-700 dark:text-yellow-200 text-sm space-y-1 flex-grow">
                  <li>Try different tactics—soft resistance, persuasive arguments, or direct advocacy.</li>
                  <li>Notice how the manager responds to your choices.</li>
                  <li>Don't be afraid to explore different paths—every conversation is a learning opportunity.</li>
                </ul>
              </div>
            </div>
          ) : (
            // Returning user content - includes shutdown path info
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Shutdown Path */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeftCircle className="h-5 w-5 text-blue-500 dark:text-blue-300" />
                <span className="font-semibold text-blue-800 dark:text-blue-200">Shutdown Paths</span>
              </div>
              <p className="text-blue-700 dark:text-blue-200 text-sm flex-grow">
                Sometimes, a manager will "shut down" the conversation, ending the scenario early. This usually happens if you accept their excuses or avoid pushing for ethical action. But don't worry!
              </p>
            </div>

            {/* Recovery & Trying Again */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCcw className="h-5 w-5 text-green-500 dark:text-green-300" />
                <span className="font-semibold text-green-800 dark:text-green-200">Recovery & Trying Again</span>
              </div>
              <p className="text-green-700 dark:text-green-200 text-sm flex-grow">
                If you hit a shutdown, you might see a special "recovery" choice—take it to get back on track! If not, you can always restart and try a different approach. Every path is a chance to learn.
              </p>
            </div>

            {/* Tips for Success */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-yellow-500 dark:text-yellow-300" />
                <span className="font-semibold text-yellow-800 dark:text-yellow-200">Tips for Success</span>
              </div>
              <ul className="list-disc pl-5 text-yellow-700 dark:text-yellow-200 text-sm space-y-1 flex-grow">
                <li>Try different tactics—soft resistance, persuasive arguments, or direct advocacy.</li>
                <li>Notice how the manager responds to your choices.</li>
                <li>Don't be afraid to "fail"—every ending is a learning opportunity.</li>
              </ul>
            </div>
          </div>
          )}

          <div className="text-center pt-8">
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition-colors"
            >
              Start Practicing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 