import React from 'react';

export const EthicalGuidelines: React.FC = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Ethical Guidelines
      </h3>
      <div className="text-sm text-gray-800 dark:text-gray-200">
        <p className="mb-3">
          Our AI assistant follows strict ethical guidelines to ensure responsible and beneficial advice:
        </p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Prioritize human welfare and safety</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Maintain transparency in decision-making</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Respect privacy and data protection</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Avoid bias and discrimination</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Consider long-term implications</span>
          </li>
        </ul>
      </div>
    </div>
  );
}; 