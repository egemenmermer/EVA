import React, { useState } from 'react';
import { X, CheckCircle, BrainCircuit, Puzzle, Waypoints } from 'lucide-react';

interface SimplifiedTacticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SimplifiedTacticsModal: React.FC<SimplifiedTacticsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'rhetorical' | 'resistance' | 'fallacies'>('rhetorical');

  if (!isOpen) return null;

  const rhetoricalTactics = [
    { name: "Appeal to Consequences", description: "Argues a decision based on its practical or moral outcomes." },
    { name: "Appeal to Standards", description: "Refers to official guidelines or best practices to justify actions." },
    { name: "Appeal to Empathy", description: "Uses human stories or emotional reasoning to highlight user impact." },
    { name: "Legal Compliance Anchor", description: "Grounds the argument in legal obligations and rights." },
    { name: "Precedent Reference", description: "Uses past decisions or industry practices to support an action." },
    { name: "Ethical Constraints", description: "Emphasizes core ethical values, like inclusion or fairness." },
    { name: "Design Tradeoff Framing", description: "Highlights a balanced compromise between competing design values." },
    { name: "Technical Feasibility Framing", description: "Acknowledges technical limitations while proposing realistic solutions." },
    { name: "User-Centered Framing", description: "Frames the argument around the needs and lived experiences of users." },
    { name: "Escalating to Review", description: "Suggests involving higher authorities or independent review." },
    { name: "Risk Management Framing", description: "Focuses on reputational or operational risk to justify better practices." },
    { name: "Appealing to Shared Values", description: "Builds common ground with the manager through shared beliefs." },
  ];

  const softResistanceTactics = [
    { name: "Minimizing", description: "Downplays ethical concerns or risks as unimportant or overblown." },
    { name: "Appealing to Practicality", description: "Emphasizes speed, efficiency, or deadlines over ethical values." },
    { name: "Redirecting Responsibility", description: "Shifts accountability to others (e.g., legal, tech team)." },
    { name: "Calling It a One-Off", description: "Frames the issue as a temporary or isolated situation." },
    { name: "Reframing the Concern", description: "Pivots the discussion to make the concern seem irrelevant." },
    { name: "Suggesting Future Fixes", description: "Postpones ethical resolution to future versions." },
    { name: "Pointing to Resource Limits", description: "Uses lack of time, money, or people to justify inaction." },
    { name: "Aligning with Authority", description: "Leans on approvals or leadership backing to silence debate." },
    { name: "Being Overly Agreeable", description: "Appears open but subtly avoids change." },
    { name: "Changing the Subject", description: "Avoids engaging with the ethical issue by pivoting elsewhere." },
    { name: "Flooding with Technicalities", description: "Uses complex terms to confuse or end the conversation." },
    { name: "Normalizing the Problem", description: "Claims the issue is common and nothing to worry about." },
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

  const renderTacticList = (tactics: { name: string; description: string }[], iconColor: string) => (
    <div className="grid gap-4">
      {tactics.map((tactic, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700/50">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 bg-${iconColor}-100 dark:bg-${iconColor}-900/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
              <span className={`text-${iconColor}-600 dark:text-${iconColor}-400 text-sm font-bold`}>{index + 1}</span>
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
          {/* Overview Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <BrainCircuit className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0"/>
                <h4 className="text-lg font-bold text-blue-800 dark:text-blue-300">Rhetorical Tactics</h4>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300/90 mb-2">
                These are constructive, ethical strategies used to frame concerns, persuade others, or request changes in a professional environment. They help advocate for ethical practices without confrontation.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400/80 mt-auto">
                <strong>Examples:</strong> Referencing standards, proposing alternatives, highlighting consequences. <br/>
                <i>Source: Rose & Tenenberg (2016)</i>
              </p>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <Puzzle className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0"/>
                <h4 className="text-lg font-bold text-orange-800 dark:text-orange-300">Soft Resistance</h4>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300/90 mb-2">
                Soft resistance includes subtle techniques used by managers or peers to delay, redirect, or reduce the urgency of ethical issues. These responses often sound agreeable on the surface but avoid meaningful action.
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400/80 mt-auto">
                <strong>Examples:</strong> Shifting responsibility, vague support, suggesting future action without commitment. <br/>
                <i>Source: Wong (2021)</i>
              </p>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <X className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0"/>
                <h4 className="text-lg font-bold text-red-800 dark:text-red-300">Logical Fallacies</h4>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300/90 mb-2">
                Logical fallacies are deceptive reasoning patterns that sound convincing but undermine ethical arguments. They can distract from core issues or justify harmful choices without valid support.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400/80 mt-auto">
                <strong>Examples:</strong> Appeals to popularity, false equivalence, minimum compliance arguments. <br/>
                <i>Source: Petric et al. (2022)</i>
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
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
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
                    ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
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
                    ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
              >
                <X className="h-4 w-4" />
                Logical Fallacies ({logicalFallacies.length})
              </button>
            </div>

            {/* Content Display */}
            <div className="p-1">
              {activeTab === 'rhetorical' && renderTacticList(rhetoricalTactics, 'blue')}
              {activeTab === 'resistance' && renderTacticList(softResistanceTactics, 'orange')}
              {activeTab === 'fallacies' && renderTacticList(logicalFallacies, 'red')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};