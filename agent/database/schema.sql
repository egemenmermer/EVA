-- Conversations table for storing chat history
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    role TEXT NOT NULL,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    context TEXT,  -- JSON string of retrieved context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on conversation_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversation_id ON conversations(conversation_id);

-- Create index on role for role-based queries
CREATE INDEX IF NOT EXISTS idx_role ON conversations(role);

-- Feedback table for storing user feedback
CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    query_id TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (query_id) REFERENCES conversations(id)
); 