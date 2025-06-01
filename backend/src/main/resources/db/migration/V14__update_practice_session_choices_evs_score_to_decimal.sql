-- Update practice session choices evs_score column to support decimal values
ALTER TABLE practice_session_choices ALTER COLUMN evs_score TYPE DECIMAL(4,1); 