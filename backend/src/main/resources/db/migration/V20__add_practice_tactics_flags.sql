-- Create practice_tactics_flags table for storing auto-open tactics guide flags
CREATE TABLE practice_tactics_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    conversation_id UUID NOT NULL,
    should_auto_open BOOLEAN NOT NULL DEFAULT FALSE,
    practice_data TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for efficient lookups
CREATE INDEX idx_practice_tactics_flags_user_conversation 
ON practice_tactics_flags(user_id, conversation_id); 