import React, { useState, useEffect } from "react";
import api, { backendApi } from '../../services/axiosConfig';

export interface Session {
  id: string;
  userFullName?: string;
  managerType: string;
  createdAt: string;
  score?: number;
  selectedChoices: SelectionData[];
  scenarioId?: string;
}

interface SelectionData {
  step?:number;
  choice: string;
  evs?: number;
  tactic?: string;
  tacticType?: string;
}

interface DecisionTreeData {
  steps: {
    step: number;
    managerStatement: string;
    chosenIndex: number;
    alternatives: { text: string; evs: number; tactic: string }[];
  }[];
}

interface ReviewSessionModalProps {
  isOpen: boolean;
  session: Session;
  onClose: () => void;
}

const ReviewSessionModal: React.FC<ReviewSessionModalProps> = ({ session, onClose, isOpen }) => {
  const [activeTab, setActiveTab] = useState<"selections" | "tree">("selections");
  const [loadingSelections] = useState(false);
  const [loadingDecisionTree] = useState(false);
  const [selectionData, setSelectionData] = useState<SelectionData[]>([]);
  const [decisionTreeData, setDecisionTreeData] = useState<DecisionTreeData | null>(null);

  useEffect(() => {
    if (isOpen && session?.id) {
      const fetchSelections = async () => {
        try {
          const res = await backendApi.get(`/api/v1/practice/get-selections/${session.id}`);
          // Expecting something like [{ evs: 1, tactic: "Heuristics", tactic_type: "Argumentation" }, ...]
          setSelectionData(res.data);
        } catch (err) {
          console.error("Failed to load selections", err);
        }
      };
      fetchSelections();
    }
  }, [isOpen, session?.id]);
  
  // optional fetch function for decision tree
  const fetchDecisionTreeData = async (sessionId: string, scenarioId: string) => {
    // TODO: call your backend API
    console.log("Fetching decision tree for", sessionId, scenarioId);
  };
  if(!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1A2337] rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Session Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Basic Session Info */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><span className="font-medium">User:</span> {session.userFullName || "Unknown"}</p>
              <p><span className="font-medium">Manager Type:</span> {session.managerType}</p>
            </div>
            <div>
              <p><span className="font-medium">Date:</span> {new Date(session.createdAt).toLocaleString()}</p>
              <p><span className="font-medium">Score:</span> {session.score?.toFixed(1) || "N/A"}</p>
            </div>
          </div>
        </div>


        {/* Body - selections + decision tree sections here */}
        <div className="px-6 py-4">
          {/* User Selections Tab */}
          {activeTab === 'selections' && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium mb-4">Selected Choices Visualization:</h4>
              
              {loadingSelections ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-300">Loading user selections...</span>
                </div>
              ) : (
                <>
                  {/* Choices Timeline */}
                  <div className="space-y-6">
                  {session.selectedChoices.map((choiceObj, index) => {
                    return (
                      <div key={index} className="relative">
                        {/* Timeline connector */}
                        {index < session.selectedChoices.length - 1 && (
                          <div className="absolute left-6 top-16 w-0.5 h-8 bg-blue-400"></div>
                        )}
                        
                        <div className="flex items-start space-x-4">
                          {/* Step indicator */}
                          <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {index + 1}
                          </div>
                          
                          {/* Choice content */}
                          <div className="flex-1 bg-gray-800 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium text-blue-300">Choice {index + 1}</h5>
                              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                Step {index + 1}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              "{choiceObj.choice}"
                            </p>
                            
                            {/* Real EVS score and tactic data */}
                            <div className="mt-2 flex items-center space-x-4 text-xs">
                              <span className={`px-2 py-1 rounded-full text-white font-semibold ${
                                choiceObj.evs > 0 ? 'bg-green-600' :
                                choiceObj.evs < 0 ? 'bg-red-600' :
                                'bg-gray-600'
                                }`}>
                                EVS Score: {choiceObj.evs > 0 ? `+${choiceObj.evs}` : choiceObj.evs ?? 'N/A'}
                                </span>
                              <span className="px-2 py-1 bg-indigo-600 rounded-full text-white font-semibold">
                                Tactic: {choiceObj.tactic || 'Unknown'}
                              </span>
                              <span className="px-2 py-1 bg-purple-600 rounded-full text-white font-semibold">
                                Tactic Type: {choiceObj.tacticType || 'Unknown'}
                                </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>

                  {/* Summary Statistics */}
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">{session.selectedChoices.length}</div>
                      <div className="text-sm text-gray-400">Total Choices</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">{session.score || 'N/A'}</div>
                      <div className="text-sm text-gray-400">Final Score</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {(() => {
                          // Calculate average from actual selection data EVS scores
                          if (selectionData.length > 0) {
                            const validScores = selectionData.filter(s => s.evs !== undefined && s.evs !== null);
                            if (validScores.length > 0) {
                              const avgScore = validScores.reduce((sum, s) => sum + s.evs, 0) / validScores.length;
                              return Math.round(avgScore);
                            }
                          }
                          // Fallback to session score divided by choices if selection data not available
                          return session.score && session.selectedChoices.length > 0 ? 
                            Math.round(session.score / session.selectedChoices.length) : 'N/A';
                        })()}
                      </div>
                      <div className="text-sm text-gray-400">Avg per Choice</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Decision Tree Tab */}
          {activeTab === 'tree' && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium mb-4">Decision Tree Analysis</h4>
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-6">
                <p className="text-blue-200 text-sm">
                  <strong>How to read this:</strong> Each step shows the manager's statement and all possible response options. 
                  The option with the <strong>✓ checkmark</strong> represents what the user actually selected in their session.
                </p>
              </div>
              
              {loadingDecisionTree ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-300">Loading decision tree...</span>
                </div>
              ) : !decisionTreeData ? (
                <div className="text-center p-8 text-gray-400">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Decision Tree Not Available</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    The decision tree data for this session could not be loaded. This may be due to:
                  </p>
                  <ul className="text-sm text-gray-500 text-left max-w-md mx-auto space-y-1">
                    <li>• Session data is incomplete</li>
                    <li>• Backend API is not yet implemented</li>
                    <li>• Network connectivity issues</li>
                  </ul>
                  <button
                    onClick={() => session && session.scenarioId && fetchDecisionTreeData(session.id, session.scenarioId)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-8">
                    {decisionTreeData.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="relative">
                        {/* Step connector */}
                        {stepIndex < decisionTreeData.steps.length - 1 && (
                          <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0.5 h-8 bg-gray-600"></div>
                        )}
                        
                        <div className="bg-gray-800 rounded-lg p-6">
                          {/* Step header */}
                          <div className="text-center mb-4">
                            <span className="inline-block bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
                              Step {step.step}
                            </span>
                          </div>

                          {/* Manager statement */}
                          <div className="mb-6 text-center">
                            <div className="inline-block bg-amber-900/30 border border-amber-700 rounded-lg p-4 max-w-2xl">
                              <div className="flex items-center justify-center mb-2">
                                <span className="text-amber-400 font-medium">Manager Says:</span>
                              </div>
                              <p className="text-amber-200 text-sm">"{step.managerStatement}"</p>
                            </div>
                          </div>

                          {/* Choice options */}
                          <div className="mb-4">
                            <h5 className="text-center text-gray-300 text-sm mb-4">Available Response Options:</h5>
                            <div className="grid grid-cols-1 gap-3">
                              {step.alternatives.map((alt, altIndex) => (
                                <div
                                  key={altIndex}
                                  className={`relative p-4 rounded-lg border-2 transition-all ${
                                    altIndex === step.chosenIndex
                                      ? 'bg-green-900/30 border-green-400 shadow-lg shadow-green-500/20'
                                      : alt.evs < 40
                                      ? 'bg-red-900/20 border-red-600/50'
                                      : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                                  }`}
                                >
                                  {/* Chosen indicator */}
                                  {altIndex === step.chosenIndex && (
                                    <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg">
                                      ✓
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 pr-4">
                                      <div className="flex items-start mb-2">
                                        <span className="inline-block w-6 h-6 bg-gray-600 text-white rounded-full text-xs font-bold flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                                          {altIndex + 1}
                                        </span>
                                        <p className={`text-sm ${
                                          altIndex === step.chosenIndex ? 'text-green-200 font-medium' : 'text-gray-300'
                                        }`}>
                                          "{alt.text}"
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end space-y-2">
                                      <span className={`text-sm font-semibold ${
                                        alt.evs >= 80 ? 'text-green-400' :
                                        alt.evs >= 60 ? 'text-yellow-400' :
                                        'text-red-400'
                                      }`}>
                                        {alt.evs} EVS
                                      </span>
                                      
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        alt.tactic === 'None' 
                                          ? 'bg-red-900/50 text-red-300'
                                          : altIndex === step.chosenIndex
                                          ? 'bg-green-900/50 text-green-300'
                                          : 'bg-gray-600 text-gray-300'
                                      }`}>
                                        {alt.tactic}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Path Analysis */}
                  <div className="bg-gray-800 rounded-lg p-6 mt-8">
                    <h5 className="text-lg font-medium mb-4 text-center">Session Summary</h5>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h6 className="font-medium text-blue-300 mb-3">Tactics Used</h6>
                        <div className="space-y-2">
                          {(() => {
                            // Calculate tactics from user's actual choices
                            const tacticCounts: { [key: string]: number } = {};
                            decisionTreeData.steps.forEach(step => {
                              if (step.chosenIndex >= 0 && step.alternatives[step.chosenIndex]) {
                                const tactic = step.alternatives[step.chosenIndex].tactic;
                                tacticCounts[tactic] = (tacticCounts[tactic] || 0) + 1;
                              }
                            });
                            
                            return Object.entries(tacticCounts).map(([tactic, count]) => (
                              <div key={tactic} className="flex justify-between items-center">
                                <span className="text-sm text-gray-300">{tactic}</span>
                                <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                                  {count}x
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                      
                      <div>
                        <h6 className="font-medium text-purple-300 mb-3">Performance Analysis</h6>
                        <div className="space-y-2">
                          <div className="text-sm text-gray-300">
                            <span>Best possible path: </span>
                            <span className="text-green-400 font-semibold">
                              {(() => {
                                // Calculate best possible path: sum of max EVS from each step
                                const bestPath = decisionTreeData.steps.reduce((total, step) => {
                                  const maxEvs = Math.max(...step.alternatives.map(a => a.evs));
                                  return total + maxEvs;
                                }, 0);
                                return `${bestPath} EVS`;
                              })()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-300">
                            <span>Worst possible path: </span>
                            <span className="text-red-400 font-semibold">
                              {(() => {
                                // Calculate worst possible path: sum of min EVS from each step
                                const worstPath = decisionTreeData.steps.reduce((total, step) => {
                                  const minEvs = Math.min(...step.alternatives.map(a => a.evs));
                                  return total + minEvs;
                                }, 0);
                                return `${worstPath} EVS`;
                              })()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-300">
                            <span>User achieved: </span>
                            <span className="text-blue-400 font-semibold">
                              {(() => {
                                // Calculate user's actual total EVS from their choices
                                let totalEvs = 0;
                                decisionTreeData.steps.forEach(step => {
                                  if (step.chosenIndex >= 0 && step.alternatives[step.chosenIndex]) {
                                    totalEvs += step.alternatives[step.chosenIndex].evs;
                                  }
                                });
                                return totalEvs > 0 ? `${totalEvs} EVS` : (session.score ? `${session.score} EVS` : 'N/A');
                              })()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-300">
                            <span>Performance: </span>
                            <span className={`font-semibold ${
                              (() => {
                                // Calculate performance based on user's actual EVS
                                let totalEvs = 0;
                                decisionTreeData.steps.forEach(step => {
                                  if (step.chosenIndex >= 0 && step.alternatives[step.chosenIndex]) {
                                    totalEvs += step.alternatives[step.chosenIndex].evs;
                                  }
                                });
                                const actualScore = totalEvs > 0 ? totalEvs : (session.score || 0);
                                return actualScore >= 75 ? 'text-green-400' :
                                       actualScore >= 50 ? 'text-yellow-400' :
                                       'text-red-400';
                              })()
                            }`}>
                              {(() => {
                                let totalEvs = 0;
                                decisionTreeData.steps.forEach(step => {
                                  if (step.chosenIndex >= 0 && step.alternatives[step.chosenIndex]) {
                                    totalEvs += step.alternatives[step.chosenIndex].evs;
                                  }
                                });
                                const actualScore = totalEvs > 0 ? totalEvs : (session.score || 0);
                                return actualScore >= 75 ? 'Strong' :
                                       actualScore >= 50 ? 'Moderate' :
                                       'Needs Improvement';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewSessionModal;
