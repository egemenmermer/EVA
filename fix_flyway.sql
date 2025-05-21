-- Check the schema structure of the flyway_schema_history table
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'flyway_schema_history'
ORDER BY ordinal_position; 

-- Delete the problematic migration from the flyway history table
DELETE FROM flyway_schema_history 
WHERE version = '9.1'; 