-- Update the admin user with the proper full password hash
UPDATE users 
SET password_hash = '$2a$10$u3gGVCAXAhBL0HNy2MEl6ejYUZjWf95E8yHRKncF/C9DZbmuVtDxi',
    provider = 'LOCAL'
WHERE role = 'ADMIN';

-- Verify the update
SELECT id, full_name, email, password_hash, role FROM users WHERE role = 'ADMIN'; 