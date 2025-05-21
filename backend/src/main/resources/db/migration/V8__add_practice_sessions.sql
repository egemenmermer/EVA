-- Create practice_sessions table
CREATE TABLE practice_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    manager_type VARCHAR(50) NOT NULL,
    scenario_id VARCHAR(100),
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_practice_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create practice_session_choices table for storing choice arrays
CREATE TABLE practice_session_choices (
    practice_session_id UUID NOT NULL,
    choice TEXT NOT NULL,
    CONSTRAINT fk_practice_session_choice FOREIGN KEY (practice_session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX idx_practice_session_choices_session_id ON practice_session_choices(practice_session_id);