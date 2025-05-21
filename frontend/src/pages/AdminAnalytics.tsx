import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPracticeSessions } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
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
  managerType: string;
  scenarioId: string;
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
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">Session Details</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="mb-4">
            <h4 className="text-lg font-medium text-gray-800">Session Information</h4>
            <p><span className="font-medium">User ID:</span> {session.userId}</p>
            <p><span className="font-medium">Manager Type:</span> {session.managerType}</p>
            <p><span className="font-medium">Scenario ID:</span> {session.scenarioId || 'N/A'}</p>
            <p><span className="font-medium">Date:</span> {new Date(session.createdAt).toLocaleString()}</p>
            {session.score !== undefined && (
              <p><span className="font-medium">Score:</span> {session.score}</p>
            )}
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-800">Selected Choices</h4>
            <div className="mt-2 space-y-2">
              {session.selectedChoices.map((choice, index) => (
                <div key={index} className="p-3 bg-gray-100 rounded-md">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Choice {index + 1}:</span> {choice}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
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
  const user = useSelector((state: RootState) => state.user);

  // Check for admin role
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch practice sessions data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPracticeSessions();
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
      setFilteredSessions(sessions.filter(session => session.managerType === managerFilter));
    }
  }, [managerFilter, sessions]);

  // Calculate data for charts
  const prepareChartData = () => {
    // Count choices A, B, C, D
    const choiceCounts: Record<string, number> = {};
    sessions.forEach(session => {
      session.selectedChoices.forEach(choice => {
        // Extract the first letter (assuming choices start with A, B, C, D)
        const firstLetter = choice.charAt(0).toUpperCase();
        choiceCounts[firstLetter] = (choiceCounts[firstLetter] || 0) + 1;
      });
    });

    // Count manager types
    const managerTypeCounts: Record<string, number> = {};
    sessions.forEach(session => {
      managerTypeCounts[session.managerType] = (managerTypeCounts[session.managerType] || 0) + 1;
    });

    return {
      choiceData: {
        labels: Object.keys(choiceCounts),
        datasets: [
          {
            label: 'Selected Choices',
            data: Object.values(choiceCounts),
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
      managerTypeData: {
        labels: Object.keys(managerTypeCounts),
        datasets: [
          {
            label: 'Manager Types',
            data: Object.values(managerTypeCounts),
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
    };
  };

  const { choiceData, managerTypeData } = sessions.length ? prepareChartData() : { choiceData: { labels: [], datasets: [] }, managerTypeData: { labels: [], datasets: [] } };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Admin Analytics Dashboard</h1>
        <p className="text-gray-600">View and analyze practice session data across all users.</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <label htmlFor="managerType" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Manager Type
            </label>
            <select
              id="managerType"
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Manager Types</option>
              <option value="Puppeteer">Puppeteer</option>
              <option value="Diluter">Diluter</option>
              <option value="Camouflager">Camouflager</option>
            </select>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Charts */}
      {!loading && !error && sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Most Selected Choices</h2>
            <div className="h-64">
              <Bar
                data={choiceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    title: {
                      display: false,
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Manager Type Distribution</h2>
            <div className="h-64">
              <Pie
                data={managerTypeData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Practice Sessions</h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No practice sessions found matching the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scenario ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.managerType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.scenarioId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(session.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {session.score !== undefined ? session.score : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
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