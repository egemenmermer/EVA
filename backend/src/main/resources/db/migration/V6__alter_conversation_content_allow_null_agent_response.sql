-- Alter conversation_contents table to allow null values in agent_response column
ALTER TABLE conversation_contents ALTER COLUMN agent_response DROP NOT NULL; 