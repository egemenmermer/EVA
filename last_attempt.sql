-- Reset the password_hash column to ensure correct type and sufficient length
ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT;

-- Delete any existing admin users
DELETE FROM users WHERE role = 'ADMIN';

-- Insert a new admin user with a simple password that's easy to use
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
    '$2a$10$yUprE7BEc2txml1neu21se51UqzzflsBGblMwA.yj7Nv.HZZyy5bm',  -- Copy a working hash from Iza's account
    'LOCAL',
    NOW(), 
    NOW(), 
    NOW(), 
    NOW(), 
    'ADMIN'
);

-- Verify the admin was created
SELECT id, email, role, password_hash FROM users WHERE role = 'ADMIN'; 