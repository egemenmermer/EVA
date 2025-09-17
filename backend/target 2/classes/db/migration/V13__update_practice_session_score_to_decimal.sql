-- Update practice sessions score column to support decimal values
ALTER TABLE practice_sessions ALTER COLUMN score TYPE DECIMAL(4,1); 