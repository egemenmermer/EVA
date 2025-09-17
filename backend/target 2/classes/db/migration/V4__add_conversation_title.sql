-- Add title column to conversations table
ALTER TABLE conversations ADD COLUMN title VARCHAR(255);

-- Update existing conversations with a default title
UPDATE conversations SET title = 'New conversation' WHERE title IS NULL; 