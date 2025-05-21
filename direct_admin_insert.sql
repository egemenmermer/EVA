-- Delete existing admin user
DELETE FROM users WHERE role = 'ADMIN';

-- Insert admin with hardcoded UUID to avoid DB-side generation
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
    'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6', -- Fixed UUID
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

-- Verify the result
SELECT id, email, password_hash, role FROM users WHERE role = 'ADMIN'; 