import React from 'react';
import { DynamicGuidelines } from './DynamicGuidelines';
import { RelatedCaseStudies } from './RelatedCaseStudies';

export const GuidelinesPanel: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <DynamicGuidelines />
        <RelatedCaseStudies />
      </div>
    </div>
  );
}; 