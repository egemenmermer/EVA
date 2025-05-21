-- Check the current column definition
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'password_hash';

-- Alter the table to increase the column size
ALTER TABLE users ALTER COLUMN password_hash TYPE VARCHAR(255);

-- Try updating the admin password again
UPDATE users 
SET password_hash = '$2a$10$u3gGVCAXAhBL0HNy2MEl6ejYUZjWf95E8yHRKncF/C9DZbmuVtDxi'
WHERE role = 'ADMIN';

-- Verify the update
SELECT id, full_name, email, password_hash, role FROM users WHERE role = 'ADMIN'; 