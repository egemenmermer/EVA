-- Delete the existing admin user
DELETE FROM users WHERE role = 'ADMIN';

-- Create a new admin user with the correct password hash
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
    '$2a$10$u3gGVCAXAhBL0HNy2MEl6ejYUZjWf95E8yHRKncF/C9DZbmuVtDxi',
    'LOCAL',
    NOW(), 
    NOW(), 
    NOW(), 
    NOW(), 
    'ADMIN'
); 