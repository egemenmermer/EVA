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