import React, { useState } from 'react';
import { X, CheckCircle, BrainCircuit, Puzzle, Waypoints } from 'lucide-react';

interface SimplifiedTacticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  practiceData?: {
    tacticCounts: Record<string, number>;
    scenarioTitle: string;
    issue: string;
    isFirstTime?: boolean;
    totalPracticesCompleted?: number;
    scenarioType?: 'privacy' | 'accessibility';
  } | null;
}

export const SimplifiedTacticsModal: React.FC<SimplifiedTacticsModalProps> = ({
  isOpen,
  onClose,
  practiceData
}) => {
  const [activeTab, setActiveTab] = useState<'rhetorical' | 'resistance' | 'fallacies'>('rhetorical');

  if (!isOpen) return null;

  const rhetoricalTactics = [
    { name: "Models that synthesize", description: "Conceptual simplification to communicate values." },
    { name: "Usability studies", description: "Empirical evidence for design decisions." },
    { name: "Embodied knowledge of users", description: "Using personal experience to add weight to claims." },
    { name: "Fidelity as a rhetorical strategy", description: "High-fidelity prototypes as persuasion." },
    { name: "Envisioning", description: "Future-oriented ethical framing." },
    { name: "Heuristics", description: "Appealing to established design norms." },
    { name: "Credibility and expertise", description: "Building authority and trust." },
    { name: "Organizational memory", description: "Historical reasoning." }
  ];

  const softResistanceTactics = [
    { name: "Broadening Who the \"User\" is in User Research", description: "Expanding scope of user empathy ethically." },
    { name: "Designing Affordances Subversively", description: "Indirect ethical action via UI tweaks." },
    { name: "Making Values Visible Rhetorically to Other Stakeholders", description: "Rhetorical but framed as organizational strategy." },
    { name: "Expanding/Subverting Design Resources", description: "Adapting standard tools for values work." },
    { name: "Making Values Visible Through Metrics", description: "Surfacing ethics through system language." },
    { name: "Using Organizational Values to Justify Values Work", description: "Strategically aligning with company values." },
    { name: "Guerilla methods", description: "Informal methods to bypass organizational barriers." },
    { name: "Usable enough", description: "Strategic concession." },
    { name: "Distract and pacify", description: "Temporary, often cosmetic ethical fixes." },
    { name: "Acquiesce", description: "Giving up smaller fights to win larger ones." },
    { name: "Negotiation and cooperation", description: "Compromise as values advocacy." },
    { name: "Being the user", description: "Adopting user identity to advocate values." }
  ];

  const logicalFallacies = [
    { name: "False Dilemma", description: "Frames the issue as a black-or-white choice when other options exist." },
    { name: "Appeal to Ignorance", description: "Assumes something is true just because it hasn't been disproven." },
    { name: "Appeal to Popularity", description: "Justifies decisions because 'everyone else does it'." },
    { name: "Strawman", description: "Misrepresents your point to argue against an easier version." },
    { name: "Red Herring", description: "Introduces irrelevant info to distract from the real issue." },
    { name: "Slippery Slope", description: "Claims one action will inevitably lead to extreme consequences." },
    { name: "Appeal to Authority", description: "Uses an authority figure's opinion instead of logic." },
    { name: "Hasty Generalization", description: "Draws broad conclusions from limited examples." },
    { name: "Circular Reasoning", description: "Repeats the claim as evidence, without real support." },
  ];

  const renderTacticList = (tactics: { name: string; description: string }[], iconColor: string, IconComponent: React.ElementType) => (
    <div className="grid gap-4">
      {tactics.map((tactic, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700/50">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 bg-${iconColor}-100 dark:bg-${iconColor}-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
              <IconComponent className={`w-5 h-5 text-${iconColor}-600 dark:text-${iconColor}-400`} />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{tactic.name}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">{tactic.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Waypoints className="h-7 w-7 text-blue-500"/>
              Tactics & Fallacies Guide
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              A reference for navigating ethical discussions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Practice Module Usage Section */}
          {practiceData && (
            <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="text-xl font-bold text-green-800 dark:text-green-300">
                    {practiceData.isFirstTime ? 'Your First Practice Session Results' : 'Your Latest Practice Session Results'}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {practiceData.scenarioTitle} - {practiceData.issue}
                    {practiceData.totalPracticesCompleted && practiceData.totalPracticesCompleted > 1 && (
                      <span className="ml-2 text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                        Practice #{practiceData.totalPracticesCompleted}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3">Tactics You Used:</h4>
                  <div className="space-y-2">
                    {Object.entries(practiceData.tacticCounts).map(([tactic, count]) => (
                      <div key={tactic} className="flex justify-between items-center bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{tactic}</span>
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full">
                          {count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3">Learning Opportunity:</h4>
                  <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-4">
                    {practiceData.isFirstTime ? (
                      <>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          Great job completing your first practice scenario! Explore the tactics below to learn about different approaches you could use in future ethical discussions.
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                      💡 In your next practice scenario, you'll see these tactic types color-coded to help you recognize different strategic approaches!
                    </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          You're building your ethical decision-making skills! Review the tactics below to continue improving your approach to ethical discussions.
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                          💡 Notice how different tactics work better in different situations. Keep experimenting with various approaches!
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Overview Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <BrainCircuit className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0"/>
                <h4 className="text-lg font-bold text-purple-800 dark:text-purple-300">Rhetorical Tactics</h4>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300/90 mb-2">
                Rhetorical strategies emphasize persuasive argumentation in UX decision-making, using evidence and reasoning to convince stakeholders.
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400/80 mt-auto">
                <strong>Examples:</strong> Using empirical evidence, building authority, appealing to design norms, historical reasoning. <br/>
                <i>Source: <a href="https://doi.org/10.1145/2987592.2987608" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800 dark:hover:text-purple-300 transition-colors">Rose & Tenenberg (2016)</a></i>
              </p>
            </div>
            
            <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-700 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <Puzzle className="h-6 w-6 text-pink-600 dark:text-pink-400 flex-shrink-0"/>
                <h4 className="text-lg font-bold text-pink-800 dark:text-pink-300">Soft Resistance</h4>
              </div>
              <p className="text-sm text-pink-700 dark:text-pink-300/90 mb-2">
                Soft resistance tactics focus on subtle, non-confrontational forms of ethical advocacy within organizations, working within existing systems.
              </p>
              <p className="text-xs text-pink-600 dark:text-pink-400/80 mt-auto">
                <strong>Examples:</strong> Expanding user scope ethically, adapting standard tools for values work, strategic organizational alignment. <br/>
                <i>Source: <a href="https://dl.acm.org/doi/pdf/10.1145/3479499" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">Wong (2021)</a></i>
              </p>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <X className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0"/>
                <h4 className="text-lg font-bold text-amber-800 dark:text-amber-300">Logical Fallacies</h4>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300/90 mb-2">
                Logical fallacies are deceptive reasoning patterns that sound convincing but undermine ethical arguments. They can distract from core issues or justify harmful choices without valid support.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-auto">
                <strong>Examples:</strong> Appeals to popularity, false equivalence, minimum compliance arguments. <br/>
                <i>Source: <a href="https://www.researchgate.net/profile/Domina-Petric/publication/339288684_Logical_Fallacies/links/5e47e51f92851c7f7f3c08dc/Logical-Fallacies.pdf" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-800 dark:hover:text-amber-300 transition-colors">Petric et al. (2022)</a></i>
              </p>
            </div>
          </div>

          {/* Complete List Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xl">🧰</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Complete Reference Guide</h3>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('rhetorical')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'rhetorical'
                    ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <BrainCircuit className="h-4 w-4" />
                Rhetorical Tactics ({rhetoricalTactics.length})
              </button>
              <button
                onClick={() => setActiveTab('resistance')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'resistance'
                    ? 'bg-white dark:bg-gray-800 text-pink-600 dark:text-pink-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <Puzzle className="h-4 w-4" />
                Soft Resistance ({softResistanceTactics.length})
              </button>
              <button
                onClick={() => setActiveTab('fallacies')}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'fallacies'
                    ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <X className="h-4 w-4" />
                Logical Fallacies ({logicalFallacies.length})
              </button>
            </div>

            {/* Content Display */}
            <div className="p-1">
              {activeTab === 'rhetorical' && renderTacticList(rhetoricalTactics, 'purple', BrainCircuit)}
              {activeTab === 'resistance' && renderTacticList(softResistanceTactics, 'pink', Puzzle)}
              {activeTab === 'fallacies' && renderTacticList(logicalFallacies, 'amber', X)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};