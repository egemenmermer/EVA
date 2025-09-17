-- Migration V16: Fix scenario names to remove _1 suffix
-- Update any existing practice sessions with old scenario names

UPDATE practice_sessions 
SET scenario_id = REPLACE(scenario_id, '_1', '')
WHERE scenario_id LIKE '%_1';

COMMIT; 