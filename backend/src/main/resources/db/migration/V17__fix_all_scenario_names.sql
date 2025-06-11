-- Migration V17: Comprehensive fix for all scenario names
-- This migration will update all scenario references to remove _1 suffix

-- Update practice_sessions table
UPDATE practice_sessions 
SET scenario_id = REPLACE(scenario_id, '_1', '')
WHERE scenario_id LIKE '%_1';

-- Also ensure any NULL scenario_ids get proper default values
UPDATE practice_sessions 
SET scenario_id = CASE 
    WHEN manager_type = 'PUPPETEER' THEN 'privacy_puppeteer'
    WHEN manager_type = 'DILUTER' THEN 'privacy_diluter' 
    WHEN manager_type = 'CAMOUFLAGER' THEN 'privacy_camouflager'
    ELSE 'privacy_puppeteer'
END
WHERE scenario_id IS NULL OR scenario_id = '';

COMMIT; 