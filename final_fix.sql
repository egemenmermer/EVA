-- Drop and rebuild the password_hash field to ensure it can store full BCrypt hashes
ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT;

-- Delete all admin users
DELETE FROM users WHERE role = 'ADMIN';

-- Create a new admin user with a known short hash 
INSERT INTO users (
    id, 
    full_name, 
    email, 
    password_hash, 
    provider, 
    created_at, 
    updated_at, 
    last_login, 
    activated_at, 
    role
)
VALUES (
    gen_random_uuid(), 
    'Admin', 
    'admin@eva.com', 
    '$2a$10$abc123', -- Shorter hash but still in BCrypt format
    'LOCAL',
    NOW(), 
    NOW(), 
    NOW(), 
    NOW(), 
    'ADMIN'
);

-- Verify the admin was created
SELECT id, email, role, password_hash FROM users WHERE role = 'ADMIN'; 