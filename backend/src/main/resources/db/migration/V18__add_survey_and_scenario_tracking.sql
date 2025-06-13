-- Add survey completion tracking columns to users table
ALTER TABLE users ADD COLUMN pre_survey_completed BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN post_survey_completed BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN pre_survey_completed_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN post_survey_completed_at TIMESTAMP NULL;
 
-- Add scenario completion tracking columns to users table
ALTER TABLE users ADD COLUMN accessibility_scenarios_completed BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN privacy_scenarios_completed BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN accessibility_scenarios_completed_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN privacy_scenarios_completed_at TIMESTAMP NULL; 