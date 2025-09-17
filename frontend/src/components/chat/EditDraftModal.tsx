import React, { useState, useEffect } from 'react';

interface EditDraftModalProps {
  isOpen: boolean;
  initialContent: string | null;
  onSave: (editedContent: string) => void;
  onClose: () => void;
}

export const EditDraftModal: React.FC<EditDraftModalProps> = ({
  isOpen,
  initialContent,
  onSave,
  onClose,
}) => {
  const [editedContent, setEditedContent] = useState(initialContent || '');

  // Update local state if initialContent changes while modal is open
  useEffect(() => {
    setEditedContent(initialContent || '');
  }, [initialContent]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(editedContent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Edit Email Draft</h2>
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-md mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          placeholder="Edit your email draft here..."
        />
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}; 