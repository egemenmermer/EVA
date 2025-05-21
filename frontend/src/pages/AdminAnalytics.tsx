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

// Component for viewing session details
const SessionDetailsModal: React.FC<{
  session: PracticeSession | null;
  onClose: () => void;
}> = ({ session, onClose }) => {
  if (!session) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1A2337] rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto text-white">
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
        </div>
        <div className="px-6 py-4">
          <div className="mb-4">
            <h4 className="text-lg font-medium mb-2">Session Information</h4>
            <div className="space-y-2">
              <p><span className="font-medium">User:</span> {session.userFullName || 'Unknown'} ({session.userEmail || session.userId})</p>
              <p><span className="font-medium">Manager Type:</span> {session.managerType}</p>
              <p><span className="font-medium">Scenario ID:</span> {session.scenarioId || 'N/A'}</p>
              <p><span className="font-medium">Date:</span> {new Date(session.createdAt).toLocaleString()}</p>
              {session.score !== undefined && (
                <p><span className="font-medium">Score:</span> {session.score}/100</p>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-lg font-medium mb-2">Selected Choices</h4>
            <div className="mt-2 space-y-2">
              {session.selectedChoices.map((choice, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded-md">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium">Choice {index + 1}:</span> {choice}
                  </p>
                </div>
              ))}
            </div>
          </div>
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
                <p className="text-3xl font-bold text-white">{metrics.avgScore}/100</p>
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
                      max: 100,
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