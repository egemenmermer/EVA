import React, { useState } from 'react';
import { X, Lightbulb, Zap, Compass, Wrench, CheckCircle, Target, Users, Flame } from 'lucide-react';

interface SimplifiedTacticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimplifiedTacticsModal: React.FC<SimplifiedTacticsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'tactics' | 'fallacies'>('tactics');

  if (!isOpen) return null;

  const ethicalTactics = [
    { name: "Legal Compliance Anchor", description: "Anchoring arguments in legal obligations or standards (e.g., WCAG, ADA)" },
    { name: "User-Centered Framing", description: "Centering the needs of users, especially vulnerable or marginalized" },
    { name: "Escalating to Review", description: "Requesting review from higher authority, like legal or ethics board" },
    { name: "Ethical Constraints", description: "Explicitly invoking ethical principles (e.g., fairness, inclusion)" },
    { name: "Stakeholder Alignment", description: "Aligning your concern with stakeholder expectations or values" },
    { name: "Hypothetical Reframing", description: "Using thought experiments or what-if scenarios to highlight ethical issues" },
    { name: "Comparative Framing", description: "Comparing against similar situations or competitors" },
    { name: "Long-Term Framing", description: "Referring to future consequences or sustainability" },
    { name: "Transparency Demand", description: "Asking for openness or clarity in decision-making" },
    { name: "Historical Precedent", description: "Referencing past experiences to justify ethical concern" },
    { name: "Business Risk", description: "Highlighting reputational or legal risks due to inaction" },
    { name: "Policy Anchor", description: "Pointing to internal policies or codes of conduct" },
    { name: "Inclusive Design Reference", description: "Naming universal design, inclusive design, or similar frameworks" },
    { name: "Quality Assurance Reframing", description: "Tying ethics to QA or development best practices" },
    { name: "Technical Responsibility", description: "Framing developers as responsible for unintended harm" },
    { name: "Empathy Tactic", description: "Bringing in real stories or potential harms to real users" },
    { name: "Scalable Solution Argument", description: "Showing ethical solution as scalable or efficient" },
    { name: "Social Proof", description: "Citing team consensus or what other companies do" },
    { name: "Values-Based Language", description: "Using terms like 'respect', 'fairness', 'trust'" },
    { name: "Time-Frame Shift", description: "Asking to delay to reconsider ethical implications" },
    { name: "Personal Integrity Anchor", description: "Expressing personal ethical discomfort or values" },
    { name: "Best Practice Advocacy", description: "Referring to external best practices, not just legal minimum" },
    { name: "Ethical Escalation", description: "Indicating this issue may be reported or taken further" },
    { name: "Evidence-Based Framing", description: "Referencing research or data supporting ethical concern" }
  ];

  const logicalFallacies = [
    { name: "Strawman", description: "Misrepresenting the other's argument to make it easier to attack" },
    { name: "Ad Hominem", description: "Attacking the person instead of the argument" },
    { name: "False Dilemma", description: "Presenting only two options when others exist" },
    { name: "Appeal to Authority", description: "Relying solely on authority rather than reasoning" },
    { name: "Slippery Slope", description: "Arguing that one step will inevitably lead to catastrophe" },
    { name: "Red Herring", description: "Diverting the argument to unrelated topics" },
    { name: "Bandwagon", description: "Claiming something is true because many believe it" },
    { name: "Hasty Generalization", description: "Making a broad claim based on limited evidence" },
    { name: "Appeal to Emotion", description: "Relying on fear, pity, or other emotions rather than logic" }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              💬 How Should I Respond?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
              🛠 Understanding EVA's Tactics
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
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Overview</h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                In each practice scenario, you'll face ethically tricky statements from a fictional manager. 
                Your goal is to respond with integrity and strategy using sound ethical argumentation.
              </p>
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                EVA evaluates your responses based on ethical argumentation tactics vs logical fallacies:
              </p>
            </div>
          </div>

          {/* Tactics Overview Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Ethical Tactics Card */}
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-green-800 dark:text-green-200">✅ Ethical Argumentation Tactics</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">From Rose & Tenenberg (2016) + adapted</p>
                </div>
              </div>
              
              <p className="text-green-800 dark:text-green-200 mb-4 font-medium">
                Each gets +1 EVS score when used appropriately.
              </p>
              
              <div className="mb-4">
                <p className="text-green-700 dark:text-green-300 text-sm mb-2"><strong>Description:</strong></p>
                <p className="text-green-700 dark:text-green-300 text-sm mb-3">
                  These are sound ethical argumentation strategies that help you make principled, logical cases 
                  for ethical behavior. They focus on legal compliance, user needs, and evidence-based reasoning.
                </p>
                
                <p className="text-green-700 dark:text-green-300 text-sm mb-2"><strong>Examples:</strong></p>
                <ul className="text-green-700 dark:text-green-300 text-sm space-y-1 mb-3">
                  <li>• Citing WCAG compliance requirements for accessibility</li>
                  <li>• Presenting user research data about harm to vulnerable groups</li>
                  <li>• Referencing company values or industry best practices</li>
                </ul>
              </div>
              
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                  Good for: Building credible, logical arguments that advance ethical outcomes.
                </p>
              </div>
            </div>

            {/* Logical Fallacies Card */}
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                  <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-red-800 dark:text-red-200">❌ Logical Fallacies</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">From fallaciesReddit + UNR + literature</p>
                </div>
              </div>
              
              <p className="text-red-800 dark:text-red-200 mb-4 font-medium">
                Each fallacy yields 0 EVS score, potentially -1 if harmful.
              </p>
              
              <div className="mb-4">
                <p className="text-red-700 dark:text-red-300 text-sm mb-2"><strong>Description:</strong></p>
                <p className="text-red-700 dark:text-red-300 text-sm mb-3">
                  These are flawed reasoning patterns that undermine your argument's credibility. 
                  They may seem persuasive but rely on poor logic or manipulation rather than sound reasoning.
                </p>
                
                <p className="text-red-700 dark:text-red-300 text-sm mb-2"><strong>Examples:</strong></p>
                <ul className="text-red-700 dark:text-red-300 text-sm space-y-1 mb-3">
                  <li>• Attacking the manager personally instead of their argument</li>
                  <li>• Presenting false choice between two extreme options</li>
                  <li>• Appealing to fear without logical reasoning</li>
                </ul>
              </div>
              
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-red-700 dark:text-red-300 text-sm font-medium">
                  Avoid: These weaken your position and reduce your ethical valence score.
                </p>
              </div>
            </div>
          </div>

          {/* Choosing the Right Approach */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🧭</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Choosing the Right Approach</h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <p className="text-gray-700 dark:text-gray-300">
                Focus on sound ethical reasoning backed by evidence, legal requirements, or user needs. 
                Avoid emotional manipulation or flawed logic. Try different ethical tactics and see how EVA responds!
              </p>
            </div>
          </div>

          {/* Complete List Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl">🧰</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Complete Reference Guide</h3>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('tactics')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'tactics'
                    ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                ✅ Ethical Tactics (24)
              </button>
              <button
                onClick={() => setActiveTab('fallacies')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'fallacies'
                    ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <X className="h-4 w-4" />
                ❌ Logical Fallacies (9)
              </button>
            </div>

            {/* Tactics Content */}
            {activeTab === 'tactics' && (
              <div className="bg-green-50/50 dark:bg-green-900/10 rounded-lg p-6 border border-green-200 dark:border-green-800">
                <div className="grid gap-4">
                  {ethicalTactics.map((tactic, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-green-600 dark:text-green-400 text-sm font-bold">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{tactic.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{tactic.description}</p>
                        </div>
                        <div className="text-green-600 dark:text-green-400 font-bold text-sm bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                          +1 EVS
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallacies Content */}
            {activeTab === 'fallacies' && (
              <div className="bg-red-50/50 dark:bg-red-900/10 rounded-lg p-6 border border-red-200 dark:border-red-800">
                <div className="grid gap-4">
                  {logicalFallacies.map((fallacy, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-red-700">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-red-600 dark:text-red-400 text-sm font-bold">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{fallacy.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{fallacy.description}</p>
                        </div>
                        <div className="text-red-600 dark:text-red-400 font-bold text-sm bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                          0 EVS
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Use ethical argumentation tactics to build your EVS score and practice principled advocacy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};