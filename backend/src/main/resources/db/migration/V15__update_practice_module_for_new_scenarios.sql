-- Migration V15: Update practice module for new scenarios with EVS scoring
-- Created by update_practice_module_for_new_scenarios.py

-- Ensure evs_score column supports decimal values (already exists from previous migration)
-- This is just a verification step

-- Update any existing practice sessions with null scenario_id to use default scenarios
UPDATE practice_sessions 
SET scenario_id = CASE 
    WHEN manager_type = 'PUPPETEER' THEN 'privacy_puppeteer_1'
    WHEN manager_type = 'DILUTER' THEN 'privacy_diluter_1' 
    WHEN manager_type = 'CAMOUFLAGER' THEN 'privacy_camouflager_1'
    ELSE 'privacy_puppeteer_1'
END
WHERE scenario_id IS NULL;

-- Add index on scenario_id for better performance
CREATE INDEX IF NOT EXISTS idx_practice_sessions_scenario_id ON practice_sessions(scenario_id);

-- Add index on evs_score for analytics
CREATE INDEX IF NOT EXISTS idx_practice_session_choices_evs_score ON practice_session_choices(evs_score);

-- Update any practice sessions with old scenario names to new naming convention
UPDATE practice_sessions 
SET scenario_id = REPLACE(scenario_id, 'scenario_', '')
WHERE scenario_id LIKE 'scenario_%';

COMMIT;
