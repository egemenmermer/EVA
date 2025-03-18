import React from 'react';

export const EthicalGuidelines: React.FC = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Ethical Guidelines
      </h3>
      <div className="prose dark:prose-invert text-sm">
        <p>
          Our AI assistant follows strict ethical guidelines to ensure responsible and beneficial advice:
        </p>
        <ul className="list-disc pl-4 space-y-2">
          <li>Prioritize human welfare and safety</li>
          <li>Maintain transparency in decision-making</li>
          <li>Respect privacy and data protection</li>
          <li>Avoid bias and discrimination</li>
          <li>Consider long-term implications</li>
        </ul>
      </div>
    </div>
  );
}; 