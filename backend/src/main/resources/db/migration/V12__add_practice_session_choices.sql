-- Ensure practice_sessions table exists
CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) UNIQUE,       -- external session identifier (matches frontend)
    user_id UUID NOT NULL,
    manager_type VARCHAR(50) NOT NULL,
    concern TEXT NOT NULL,
    scenario_id VARCHAR(100),                      -- added in V15 (links to scenario definition)
    score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- optionally: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ensure practice_session_choices table exists
CREATE TABLE IF NOT EXISTS practice_session_choices (
    practice_session_id UUID NOT NULL,
    choice TEXT NOT NULL,
    -- new columns
    id UUID DEFAULT gen_random_uuid(),
    step_number INTEGER,
    evs_score INTEGER,
    tactic VARCHAR(100),
    visible_labels BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_practice_session FOREIGN KEY (practice_session_id)
        REFERENCES practice_sessions(id) ON DELETE CASCADE
);



-- Add new columns to existing practice_session_choices table for storing EVS scores and tactics
ALTER TABLE practice_session_choices ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE practice_session_choices ADD COLUMN IF NOT EXISTS step_number INTEGER;
ALTER TABLE practice_session_choices ADD COLUMN IF NOT EXISTS evs_score INTEGER;
ALTER TABLE practice_session_choices ADD COLUMN IF NOT EXISTS tactic VARCHAR(100);

-- Update step_number for existing records (assuming they are in order)
UPDATE practice_session_choices 
SET step_number = subquery.row_num 
FROM (
    SELECT practice_session_id, choice, 
           ROW_NUMBER() OVER (PARTITION BY practice_session_id ORDER BY practice_session_id) as row_num
    FROM practice_session_choices 
    WHERE step_number IS NULL
) AS subquery 
WHERE practice_session_choices.practice_session_id = subquery.practice_session_id 
AND practice_session_choices.choice = subquery.choice
AND practice_session_choices.step_number IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_practice_session_choices_session_step ON practice_session_choices(practice_session_id, step_number); 
