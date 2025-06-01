import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPracticeSessions } from '../services/api';
import { useStore } from '../store/useStore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Types for practice session data
interface PracticeSession {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userName?: string; // Keep for backward compatibility
  managerType: string;
  scenarioId: string | null;
  selectedChoices: string[];
  createdAt: string;
  score?: number;
}

// Types for decision tree data
interface DecisionTreeStep {
  step: number;
  managerStatement: string;
  userChoice: string;
  alternatives: {
    text: string;
    tactic: string;
    evs: number;
  }[];
  chosenIndex: number;
}

interface DecisionTreeData {
  scenario: string;
  steps: DecisionTreeStep[];
}

// Component for viewing session details
const SessionDetailsModal: React.FC<{
  session: PracticeSession | null;
  onClose: () => void;
}> = ({ session, onClose }) => {
  const [activeTab, setActiveTab] = useState<'selections' | 'tree'>('selections');
  const [decisionTreeData, setDecisionTreeData] = useState<DecisionTreeData | null>(null);
  const [loadingDecisionTree, setLoadingDecisionTree] = useState(false);
  const [selectionData, setSelectionData] = useState<any[]>([]);
  const [loadingSelections, setLoadingSelections] = useState(false);

  // Function to fetch user selection details from backend
  const fetchSelectionData = async (sessionId: string) => {
    setLoadingSelections(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8443';
      const response = await fetch(`${API_URL}/api/v1/practice/admin/practice-sessions/${sessionId}/selections`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch selection data');
      }

      const data = await response.json();
      setSelectionData(data);
    } catch (error) {
      console.error('Error fetching selection data:', error);
      setSelectionData([]);
    } finally {
      setLoadingSelections(false);
    }
  };

  // Function to fetch decision tree data from backend
  const fetchDecisionTreeData = async (sessionId: string, scenarioId: string) => {
    setLoadingDecisionTree(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8443';
      // Make actual API call to get decision tree data
      const response = await fetch(`${API_URL}/api/v1/practice/admin/practice-sessions/${sessionId}/decision-tree`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch decision tree data');
      }

      const decisionTreeData: DecisionTreeData = await response.json();
      setDecisionTreeData(decisionTreeData);
    } catch (error) {
      console.error('Error fetching decision tree data:', error);
      // For now, show an error message - in production, you might want to show a user-friendly error
      setDecisionTreeData(null);
    } finally {
      setLoadingDecisionTree(false);
    }
  };

  // Load selection data when tab changes to 'selections'
  useEffect(() => {
    if (activeTab === 'selections' && session && selectionData.length === 0) {
      fetchSelectionData(session.id);
    }
  }, [activeTab, session, selectionData.length]);

  // Load decision tree data when tab changes to 'tree'
  useEffect(() => {
    if (activeTab === 'tree' && session && session.scenarioId && !decisionTreeData) {
      fetchDecisionTreeData(session.id, session.scenarioId);
    }
  }, [activeTab, session, decisionTreeData]);

  if (!session) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1A2337] rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto text-white">
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-white">Session Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Basic Session Info */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><span className="font-medium">User:</span> {session.userFullName || 'Unknown'}</p>
              <p><span className="font-medium">Manager Type:</span> {session.managerType}</p>
            </div>
            <div>
              <p><span className="font-medium">Date:</span> {new Date(session.createdAt).toLocaleString()}</p>
              <p><span className="font-medium">Score:</span> {session.score?.toFixed(1) || 'N/A'}/10</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('selections')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'selections'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              📊 User Selections
            </button>
            <button
              onClick={() => setActiveTab('tree')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'tree'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              🌳 Decision Tree
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          {/* User Selections Tab */}
          {activeTab === 'selections' && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium mb-4">Selected Choices Visualization</h4>
              
              {loadingSelections ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-300">Loading user selections...</span>
                </div>
              ) : (
                <>
                  {/* Choices Timeline */}
                  <div className="space-y-6">
                  {session.selectedChoices.slice(0, 5).map((choice, index) => {
                    const selectionInfo = selectionData[index] || {};
                    return (
                      <div key={index} className="relative">
                        {/* Timeline connector */}
                        {index < Math.min(session.selectedChoices.length, 5) - 1 && (
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
                              "{choice}"
                            </p>
                            
                            {/* Real EVS score and tactic data */}
                            <div className="mt-3 flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-400">EVS Score:</span>
                                <span className={`text-sm font-semibold ${
                                  selectionInfo.evs >= 2 ? 'text-green-400' : 
                                  selectionInfo.evs >= 1 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {selectionInfo.evs !== undefined && selectionInfo.evs !== null ? `${selectionInfo.evs >= 0 ? '+' : ''}${selectionInfo.evs}` : 'N/A'}/3
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-400">Tactic:</span>
                                <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                                  {selectionInfo.tactic || 'Unknown'}
                                </span>
                              </div>
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
                      <div className="text-2xl font-bold text-blue-400">{Math.min(session.selectedChoices.length, 5)}</div>
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
                            Math.round(session.score / Math.min(session.selectedChoices.length, 5)) : 'N/A';
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

const AdminAnalytics: React.FC = () => {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<PracticeSession | null>(null);
  
  const navigate = useNavigate();
  const { user, setUser, setToken } = useStore();

  const handleLogout = () => {
    // Clear user data and token
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Fetch practice sessions data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPracticeSessions();
      // Use the real user data from the backend instead of generating placeholders
      setSessions(data);
      setFilteredSessions(data);
    } catch (err) {
      setError('Failed to load practice sessions data');
      console.error('Error fetching practice sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Apply manager type filter
  useEffect(() => {
    if (managerFilter === 'all') {
      setFilteredSessions(sessions);
    } else {
      // Case-insensitive filtering for manager type
      setFilteredSessions(
        sessions.filter(session => 
          session.managerType.toUpperCase() === managerFilter.toUpperCase()
        )
      );
    }
  }, [managerFilter, sessions]);

  // Export data as CSV
  const exportAsCSV = () => {
    if (filteredSessions.length === 0) return;
    
    // Define CSV headers
    const headers = [
      'Name', 
      'Email', 
      'Manager Type', 
      'Date', 
      'Score', 
      'Scenario ID'
    ];
    
    // Convert session data to CSV rows
    const rows = filteredSessions.map(session => [
      session.userFullName || 'Unknown',
      session.userEmail || session.userId,
      session.managerType,
      new Date(session.createdAt).toLocaleString(),
      session.score !== undefined ? session.score.toString() : 'N/A',
      session.scenarioId || 'N/A'
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create a link to download the CSV file
    const link = document.createElement('a');
    const fileName = `practice-sessions-export-${new Date().toISOString().slice(0, 10)}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Export data as PDF
  const exportAsPDF = () => {
    if (filteredSessions.length === 0) return;
    
    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }
    
    // Generate table HTML for sessions
    const tableRows = filteredSessions.map(session => `
      <tr>
        <td>${session.userFullName || 'Unknown'}</td>
        <td>${session.userEmail || session.userId}</td>
        <td>${session.managerType}</td>
        <td>${new Date(session.createdAt).toLocaleString()}</td>
        <td>${session.score !== undefined ? session.score : 'N/A'}</td>
      </tr>
    `).join('');
    
    // Create printable document with styling
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Practice Sessions Export</title>
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { color: #1a2337; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #1a2337; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .header { display: flex; justify-content: space-between; align-items: center; }
          .meta { font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Practice Sessions Report</h1>
          <div class="meta">Generated on ${new Date().toLocaleString()}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Manager Type</th>
              <th>Date</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `);
    
    // Wait for content to load then print
    printWindow.document.close();
    printWindow.addEventListener('load', () => {
      printWindow.print();
      // printWindow.close(); // Uncomment to auto-close after print dialog
    });
  };

  // Calculate data for charts
  const prepareChartData = () => {
    // Count sessions by manager type
    const managerTypeCounts: Record<string, number> = {};
    sessions.forEach(session => {
      managerTypeCounts[session.managerType] = (managerTypeCounts[session.managerType] || 0) + 1;
    });

    // Calculate average scores by manager type
    const managerScores: Record<string, number[]> = {};
    sessions.forEach(session => {
      if (session.score !== undefined) {
        if (!managerScores[session.managerType]) {
          managerScores[session.managerType] = [];
        }
        managerScores[session.managerType].push(session.score);
      }
    });

    const avgScores: Record<string, number> = {};
    Object.keys(managerScores).forEach(type => {
      const scores = managerScores[type];
      avgScores[type] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    });

    return {
      managerTypeData: {
        labels: Object.keys(managerTypeCounts),
        datasets: [
          {
            label: 'Sessions by Manager Type',
            data: Object.values(managerTypeCounts),
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 99, 132, 0.6)',
              'rgba(255, 206, 86, 0.6)',
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 206, 86, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
      scoreData: {
        labels: Object.keys(avgScores),
        datasets: [
          {
            label: 'Average Score',
            data: Object.values(avgScores),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
        ],
      },
    };
  };

  // Calculate key metrics
  const calculateMetrics = () => {
    if (sessions.length === 0) return { totalSessions: 0, avgScore: 0, mostCommonType: 'N/A' };

    // Total sessions
    const totalSessions = sessions.length;

    // Average ethical score across all sessions
    const validScores = sessions.filter(s => s.score !== undefined).map(s => s.score as number);
    const avgScore = validScores.length > 0 
      ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length) 
      : 0;

    // Most common manager type
    const typeCounts: Record<string, number> = {};
    sessions.forEach(session => {
      typeCounts[session.managerType] = (typeCounts[session.managerType] || 0) + 1;
    });
    
    let mostCommonType = 'N/A';
    let maxCount = 0;
    Object.entries(typeCounts).forEach(([type, count]) => {
      if (count > maxCount) {
        mostCommonType = type;
        maxCount = count;
      }
    });

    return { totalSessions, avgScore, mostCommonType };
  };

  const { managerTypeData, scoreData } = sessions.length 
    ? prepareChartData() 
    : { managerTypeData: { labels: [], datasets: [] }, scoreData: { labels: [], datasets: [] } };

  const metrics = calculateMetrics();

  return (
    <div className="container mx-auto">
      {/* Header with admin info and refresh button */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            className="p-2 rounded-full hover:bg-[#1A2337] focus:outline-none"
            title="Refresh Data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className="text-gray-300">{user?.email || 'admin@eva.com'}</div>
          <button className="text-red-400 hover:text-red-300 text-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* 3. KEY METRICS CARDS */}
      {!loading && !error && sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1A2337] rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-900 text-blue-300 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Sessions</p>
                <p className="text-3xl font-bold text-white">{metrics.totalSessions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[#1A2337] rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-900 text-yellow-300 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg. Ethical Score</p>
                <p className="text-3xl font-bold text-white">{metrics.avgScore?.toFixed(1) || 'N/A'}/10</p>
              </div>
            </div>
          </div>
          
          <div className="bg-[#1A2337] rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-900 text-green-300 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Most Common Type</p>
                <p className="text-xl font-bold text-white">{metrics.mostCommonType}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. VISUAL ANALYTICS SECTION */}
      {!loading && !error && sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-[#1A2337] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Manager Type Distribution</h2>
            <div className="h-64">
              <Pie
                data={managerTypeData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: 'white'
                      }
                    },
                    title: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className="bg-[#1A2337] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Avg Score by Manager Type</h2>
            <div className="h-64">
              <Bar
                data={scoreData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 10,
                      ticks: {
                        color: 'white'
                      },
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        color: 'white'
                      },
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    },
                    title: {
                      display: false
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. USER SESSIONS TABLE */}
      <div className="bg-[#1A2337] rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-white mb-2 sm:mb-0">Practice Sessions</h2>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Filter moved here */}
            <div className="flex items-center gap-2">
              <select
                id="managerType"
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="p-2 border border-gray-600 rounded-md bg-[#131C31] text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Manager Types</option>
                <option value="PUPPETEER">Puppeteer</option>
                <option value="DILUTER">Diluter</option>
                <option value="CAMOUFLAGER">Camouflager</option>
              </select>
              
              {/* Export buttons moved here */}
              <button 
                className="flex items-center p-2 bg-[#131C31] text-gray-200 rounded-md hover:bg-gray-700"
                onClick={exportAsCSV}
                title="Export as CSV"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button 
                className="flex items-center p-2 bg-[#131C31] text-gray-200 rounded-md hover:bg-gray-700"
                onClick={exportAsPDF}
                title="Export as PDF"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No practice sessions found matching the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-[#131C31]">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Manager Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#1A2337] divide-y divide-gray-700">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-[#131C31]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {session.userFullName || 'Unknown User'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {session.userEmail || session.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {session.managerType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(session.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {session.score !== undefined ? session.score : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <SessionDetailsModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
};

export default AdminAnalytics; 