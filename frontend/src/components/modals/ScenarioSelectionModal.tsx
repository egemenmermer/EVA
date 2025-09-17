import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ScenarioSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (args: { concern: string; managerType: string; difficulty: number }) => void;
}

const difficultyLabel = (d: number) => {
  switch (d) {
    case 1: return 'Friendly';
    case 2: return 'Considerate';
    case 3: return 'Neutral';
    case 4: return 'Dismissive';
    case 5: return 'Hostile';
    default: return `Level ${d}`;
  }
};

const getManagerImage = (type: string, isDark: boolean) => {
  return `/src/assets/manager-icons/${type.toLowerCase()}-manager-${isDark ? 'dark' : 'light'}.svg`;
};

const MANAGER_TYPES: Record<string, { label: string; description: string }> = {
  CAPITALIST: {
    label: 'Capitalist',
    description: 'Focused on profits and shareholder value, often resistant to ethical trade-offs.',
  },
  DILUTER: {
    label: 'Diluter',
    description: 'Downplays ethical concerns and reframes them as minor or irrelevant.',
  },
  CAMOUFLAGER: {
    label: 'Camouflager',
    description: 'Masks problematic practices behind corporate jargon and surface-level fixes.',
  },
};

export const ScenarioSelectionModal: React.FC<ScenarioSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
}) => {
  const [concern, setConcern] = useState('');
  const [managerType, setManagerType] = useState<string | null>(null);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [difficulty, setDifficulty] = useState<number>(() => {
    const saved = localStorage.getItem('eva_practice_difficulty');
    return saved ? Number(saved) : 3;
  });

  useEffect(() => {
    // track difficulty in localStorage
    localStorage.setItem('eva_practice_difficulty', String(difficulty));
  }, [difficulty]);

  useEffect(() => {
    // detect system theme
    const match = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(match.matches);

    const listener = (e: MediaQueryListEvent) => setIsDark(e.matches);
    match.addEventListener('change', listener);
    return () => match.removeEventListener('change', listener);
  }, []);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!concern || !managerType) return;
    onSelectScenario({ concern, managerType, difficulty });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 overflow-hidden relative">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Start a Practice Scenario
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Concern */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              What is your concern?
            </label>
            <textarea
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              rows={3}
              placeholder="e.g., I'm concerned about collecting unnecessary user data..."
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 p-2 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Manager type */}
          <div className="relative">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Choose a manager type:
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(MANAGER_TYPES).map((type) => (
                <button
                  key={type}
                  onClick={() => setManagerType(type)}
                  onMouseEnter={() => setHoveredType(type)}
                  onMouseLeave={() => setHoveredType(null)}
                  className={`px-4 py-2 rounded-lg border transition ${
                    managerType === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {MANAGER_TYPES[type].label}
                </button>
              ))}
            </div>

            {/* Hover preview */}
            {hoveredType && (
              <div className="absolute top-full mt-2 w-64 p-3 rounded-lg shadow-lg border bg-white dark:bg-gray-700 dark:text-white z-20">
                <img
                  src={getManagerImage(hoveredType, isDark)}
                  alt={MANAGER_TYPES[hoveredType].label}
                  className="w-1/4 object-contain rounded mb-2 mx-auto"
                  />
                <p className="text-sm">{MANAGER_TYPES[hoveredType].description}</p>
              </div>
            )}
          </div>

          {/* Difficulty slider */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Manager Difficulty Level:
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 dark:text-gray-400 w-20 text-right">
                {difficultyLabel(difficulty)}
              </span>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full accent-blue-600"
                aria-label="Manager difficulty"
                title={`Difficulty: ${difficultyLabel(difficulty)}`}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={handleConfirm}
            disabled={!concern || !managerType}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-400"
          >
            Start Scenario
          </button>
        </div>
      </div>
    </div>
  );
};
