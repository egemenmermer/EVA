-- Delete existing admin user
DELETE FROM users WHERE role = 'ADMIN';

-- Create a new admin user with a simpler hash
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
    '$2a$10$abcdefghijklmnopqrstuabcdefghijklmnopqrstu',
    'LOCAL',
    NOW(), 
    NOW(), 
    NOW(), 
    NOW(), 
    'ADMIN'
);

-- Verify the insertion
SELECT id, email, password_hash, role FROM users WHERE role = 'ADMIN'; 