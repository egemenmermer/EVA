import React, { useState } from 'react';
import { X, Lightbulb, Zap, Compass, Wrench, CheckCircle, Target, Users, Flame } from 'lucide-react';

interface EVATacticsInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChoices?: Array<{
    index: number;
    text: string;
    category: string;
  }>;
}

export const EVATacticsInfoModal: React.FC<EVATacticsInfoModalProps> = ({
  isOpen,
  onClose,
  currentChoices = []
}) => {
  const [activeTab, setActiveTab] = useState<'soft' | 'rhetoric'>('soft');

  if (!isOpen) return null;

  // Get categories from current choices
  const currentCategories = currentChoices.map(choice => choice.category.toLowerCase());

  // Function to check if a tactic should glow
  const shouldGlow = (tacticName: string) => {
    return currentCategories.some(category => 
      category.includes(tacticName.toLowerCase()) || 
      tacticName.toLowerCase().includes(category.replace(/\s+/g, ''))
    );
  };

  const softResistanceTactics = [
    { name: "Shifting Scope", description: "Redirect the project's focus to ethically preferable areas" },
    { name: "Delaying", description: "Postpone decisions or actions to buy time or avoid immediate unethical choices" },
    { name: "Documenting Dissent", description: "Log or record disagreement for accountability or transparency" },
    { name: "Reframing", description: "Reinterpret the problem in ethical or user-centered terms" },
    { name: "Appealing to External Standards", description: "Cite external ethics codes, laws, or professional standards" },
    { name: "Making It Visible", description: "Draw attention to hidden or glossed-over ethical issues" },
    { name: "Adding Friction", description: "Subtly slow down unethical decisions by adding small procedural barriers" },
    { name: "Creating Alternatives", description: "Suggest other design or engineering solutions that reduce harm" },
    { name: "Redirecting Conversations", description: "Steer dialogue toward user well-being or ethical risk" },
    { name: "Asking Questions", description: "Use inquiry to expose flaws or raise concerns without confronting" },
    { name: "Withholding Full Implementation", description: "Implement partially to reduce harm while meeting demands" },
    { name: "Testing Loopholes", description: "Find gaps in policy that allow more ethical action without violating rules" }
  ];

  const rhetoricalTactics = [
    { name: "Appealing to Organizational Values", description: "Refer to company mission or ethics to support your view" },
    { name: "Citing Institutional Authority", description: "Reference respected sources (e.g. legal, compliance, leadership)" },
    { name: "Referencing Laws or Regulations", description: "Mention GDPR, ADA, or relevant compliance rules" },
    { name: "Presenting User Data", description: "Use metrics, A/B tests, or research to support your argument" },
    { name: "Referencing Best Practices", description: "Cite UX or design guidelines (e.g. Nielsen heuristics, WCAG)" },
    { name: "Constructing Hypothetical Scenarios", description: "Paint realistic future situations to predict consequences" },
    { name: "Drawing Analogies", description: "Compare to familiar systems/decisions to make logic clearer" },
    { name: "Evoking Empathy", description: "Appeal to user emotions, especially around harm or exclusion" },
    { name: "Emphasizing Harm or Risk", description: "Focus on what could go wrong or harm users" },
    { name: "Citing Public Backlash", description: "Reference reputational risk or public sentiment" },
    { name: "Personal Moral Appeals", description: "Use your own ethical compass as a base of authority" },
    { name: "Sarcastic Ridicule", description: "Rare; discredit unethical logic using irony or sarcasm" }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
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
                Your goal is to respond with integrity and strategy.
              </p>
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                EVA supports two main kinds of responses:
              </p>
            </div>
          </div>

          {/* Tactics Overview Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Soft Resistance Card */}
            <div className="bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-200 dark:border-teal-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center">
                  <Target className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-teal-800 dark:text-teal-200">🔸 Soft Resistance Tactics</h4>
                  <p className="text-sm text-teal-700 dark:text-teal-300">From Wong (2021)</p>
                </div>
              </div>
              
              <p className="text-teal-800 dark:text-teal-200 mb-4 font-medium">
                Ideal when you want to push back gently within a rigid workplace.
              </p>
              
              <div className="mb-4">
                <p className="text-teal-700 dark:text-teal-300 text-sm mb-2"><strong>Description:</strong></p>
                <p className="text-teal-700 dark:text-teal-300 text-sm mb-3">
                  These tactics help you resist unethical or questionable decisions without directly confronting your manager. 
                  They work well in hierarchical environments or when you're early in your career.
                </p>
                
                <p className="text-teal-700 dark:text-teal-300 text-sm mb-2"><strong>Examples:</strong></p>
                <ul className="text-teal-700 dark:text-teal-300 text-sm space-y-1 mb-3">
                  <li>• Proposing extra user testing to slow down a rushed launch</li>
                  <li>• Logging concerns quietly in documentation</li>
                  <li>• Asking for legal review without making accusations</li>
                </ul>
              </div>
              
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <p className="text-teal-700 dark:text-teal-300 text-sm font-medium">
                  Good for: Defusing pressure, planting ethical concerns, protecting yourself quietly.
                </p>
              </div>
            </div>

            {/* Rhetorical Tactics Card */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-purple-800 dark:text-purple-200">🔹 Rhetorical Tactics</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300">From Rose & Tenenberg (2016)</p>
                </div>
              </div>
              
              <p className="text-purple-800 dark:text-purple-200 mb-4 font-medium">
                Great for building persuasive arguments.
              </p>
              
              <div className="mb-4">
                <p className="text-purple-700 dark:text-purple-300 text-sm mb-2"><strong>Description:</strong></p>
                <p className="text-purple-700 dark:text-purple-300 text-sm mb-3">
                  These tactics help you convince your manager by using logic, emotion, credibility, and real-world evidence. 
                  They're more assertive and visible than soft resistance.
                </p>
                
                <p className="text-purple-700 dark:text-purple-300 text-sm mb-2"><strong>Examples:</strong></p>
                <ul className="text-purple-700 dark:text-purple-300 text-sm space-y-1 mb-3">
                  <li>• Citing legal fines or research data to support your position</li>
                  <li>• Referring to user sentiment or public backlash</li>
                  <li>• Framing ethical choices as business opportunities</li>
                </ul>
              </div>
              
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <p className="text-purple-700 dark:text-purple-300 text-sm font-medium">
                  Good for: Making strong, evidence-based ethical arguments, shifting the conversation.
                </p>
              </div>
            </div>
          </div>

          {/* Choosing the Right Tactic */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🧭</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Choosing the Right Tactic</h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <p className="text-gray-700 dark:text-gray-300">
                There's no single right way — sometimes subtlety works best, other times a bold argument is needed. 
                Try different approaches and see how EVA responds!
              </p>
            </div>
          </div>

          {/* Complete List Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🧰</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Complete List of Tactic Styles Used in EVA</h3>
            </div>
            
            {/* Glow Information */}
            {currentChoices.length > 0 && (
              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Tactics matching your current choices will glow!
                  </p>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Look for the sparkles (✨) and glowing columns in the table below.
                </p>
              </div>
            )}
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('soft')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'soft'
                    ? 'bg-white dark:bg-gray-800 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <Target className="h-4 w-4" />
                🔸 Soft Resistance (12)
              </button>
              <button
                onClick={() => setActiveTab('rhetoric')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'rhetoric'
                    ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <Zap className="h-4 w-4" />
                🔹 Rhetorical (12)
              </button>
            </div>

            {/* Tactics Descriptions */}
            <div className="mb-6">
              {activeTab === 'soft' && (
                <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-teal-700 dark:text-teal-300 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    🔸 Soft Resistance Tactics
                  </h4>
                  <p className="text-sm text-teal-700 dark:text-teal-300">
                    Subtle strategies to redirect, delay, or ethically influence decisions within existing power structures, without direct confrontation. 
                    These tactics help you resist unethical decisions without directly confronting your manager.
                  </p>
                </div>
              )}
              {activeTab === 'rhetoric' && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    🔹 Rhetorical Tactics
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Overt persuasive strategies to justify ethical or user-centered decisions to stakeholders using logical argument and moral reasoning. 
                    These tactics are more assertive and visible than soft resistance.
                  </p>
                </div>
              )}
            </div>

            {/* Tactics Table */}
            <div className="bg-white dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tactic
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Description
                    </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                                        {activeTab === 'soft' && (
                      <>
                        {softResistanceTactics.map((tactic, index) => {
                          const isGlowing = shouldGlow(tactic.name);
                          return (
                            <tr key={index} className={index % 2 === 0 ? "bg-teal-50/50 dark:bg-teal-900/10" : "bg-teal-50/30 dark:bg-teal-900/5"}>
                              {index === 0 && (
                                <td className="px-4 py-3 text-sm font-medium text-teal-800 dark:text-teal-200" rowSpan={softResistanceTactics.length}>
                                Soft Resistance
                              </td>
                            )}
                            <td className={`px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium 
                              ${isGlowing ? 'bg-teal-100/70 dark:bg-teal-800/30 text-teal-900 dark:text-teal-100 shadow-sm border-l-2 border-teal-400 dark:border-teal-500' : ''}`}>
                              {isGlowing && <span className="mr-2 text-teal-500">✨</span>}
                              {tactic.name}
                            </td>
                            <td className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-300 
                              ${isGlowing ? 'bg-teal-100/50 dark:bg-teal-800/20 text-teal-800 dark:text-teal-200 shadow-sm border-r-2 border-teal-400 dark:border-teal-500' : ''}`}>
                              {tactic.description}
                            </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                    {activeTab === 'rhetoric' && (
                      <>
                        {rhetoricalTactics.map((tactic, index) => {
                          const isGlowing = shouldGlow(tactic.name);
                          return (
                            <tr key={index} className={index % 2 === 0 ? "bg-purple-50/50 dark:bg-purple-900/10" : "bg-purple-50/30 dark:bg-purple-900/5"}>
                              {index === 0 && (
                                <td className="px-4 py-3 text-sm font-medium text-purple-800 dark:text-purple-200" rowSpan={rhetoricalTactics.length}>
                                Rhetorical
                              </td>
                            )}
                            <td className={`px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-medium 
                              ${isGlowing ? 'bg-purple-100/70 dark:bg-purple-800/30 text-purple-900 dark:text-purple-100 shadow-sm border-l-2 border-purple-400 dark:border-purple-500' : ''}`}>
                              {isGlowing && <span className="mr-2 text-purple-500">✨</span>}
                              {tactic.name}
                            </td>
                            <td className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-300 
                              ${isGlowing ? 'bg-purple-100/50 dark:bg-purple-800/20 text-purple-800 dark:text-purple-200 shadow-sm border-r-2 border-purple-400 dark:border-purple-500' : ''}`}>
                              {tactic.description}
                            </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tip Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🔄</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tip: Try different tactics!</h3>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <p className="text-gray-700 dark:text-gray-300">
                Mix and match to explore new strategies and track your ethical strength score as you grow.
              </p>
            </div>
          </div>

          {/* Ready Section */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ready?</h3>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800 mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Click Start Scenario and respond using the tactic that best fits your voice and values.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
              >
                <Users className="h-4 w-4" />
                Start Scenario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 