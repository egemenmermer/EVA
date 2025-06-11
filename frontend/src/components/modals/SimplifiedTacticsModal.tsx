import React from 'react';
import { X, Target, Zap, Compass, Users } from 'lucide-react';

interface SimplifiedTacticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimplifiedTacticsModal: React.FC<SimplifiedTacticsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const tactics = [
    {
      name: "Direct Confrontation",
      description: "Directly challenge unethical decisions with evidence and strong ethical positions",
      icon: "⚔️",
      example: "Citing legal fines or research data that contradicts the manager's claims",
      color: "red"
    },
    {
      name: "Persuasive Rhetoric", 
      description: "Use logical arguments, evidence, and emotional appeals to convince",
      icon: "🎯",
      example: "Appealing to company values, user research, or industry best practices",
      color: "blue"
    },
    {
      name: "Process-Based Advocacy",
      description: "Suggest processes, reviews, or systematic approaches to address concerns",
      icon: "📋",
      example: "Requesting legal review, user testing, or compliance audits",
      color: "green"
    },
    {
      name: "Soft Resistance",
      description: "Subtle pushback that doesn't directly confront but raises concerns",
      icon: "🤲",
      example: "Asking clarifying questions or suggesting minor modifications",
      color: "yellow"
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'blue':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
      case 'green':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'yellow':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              💡 Argumentation Tactics
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
              🛠 Strategies used in EVA practice scenarios
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Overview Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🧠</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">How to Respond Ethically</h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                In practice scenarios, you'll encounter managers using different manipulation strategies. 
                Your goal is to respond with integrity while maintaining professional relationships.
              </p>
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                EVA practice scenarios focus on 4 key response strategies:
              </p>
            </div>
          </div>

          {/* Tactics Grid */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl">🎯</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">The 4 Tactics Used in Practice</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {tactics.map((tactic, index) => (
                <div key={index} className={`border-2 rounded-xl p-6 ${getColorClasses(tactic.color)}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-2xl">{tactic.icon}</div>
                    <div>
                      <h4 className="text-lg font-bold">{tactic.name}</h4>
                    </div>
                  </div>
                  
                  <p className="mb-4 font-medium">
                    {tactic.description}
                  </p>
                  
                  <div className="mb-4">
                    <p className="text-sm mb-2"><strong>Example:</strong></p>
                    <p className="text-sm italic">
                      {tactic.example}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Tips */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">💡</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Choosing Your Strategy</h3>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">🔥 More Assertive</h4>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• <strong>Direct Confrontation:</strong> When you have strong evidence</li>
                    <li>• <strong>Persuasive Rhetoric:</strong> When you need to convince</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">🤝 More Diplomatic</h4>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li>• <strong>Process-Based Advocacy:</strong> When you want systematic solutions</li>
                    <li>• <strong>Soft Resistance:</strong> When you need to be subtle</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Ready Section */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ready to Practice?</h3>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800 mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Try different tactics in practice scenarios to see how managers respond and build your ethical confidence.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
              >
                <Target className="h-4 w-4" />
                Got it!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 