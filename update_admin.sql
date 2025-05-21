-- Update the admin user with specified details
UPDATE users 
SET full_name = 'Admin', 
    email = 'admin@eva.com', 
    password_hash = '$2a$10$u3gGVCAXAhBL0HNy2MEl6ejYUZjWf95E8yHRKncF/C9DZbmuVtDxi'
WHERE role = 'ADMIN';

-- If admin user doesn't exist, insert one
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
SELECT 
    gen_random_uuid(), 
    'Admin', 
    'admin@eva.com', 
    '$2a$10$u3gGVCAXAhBL0HNy2MEl6ejYUZjWf95E8yHRKncF/C9DZbmuVtDxi', 
    'LOCAL', 
    NOW(), 
    NOW(), 
    NOW(), 
    NOW(), 
    'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'ADMIN');
