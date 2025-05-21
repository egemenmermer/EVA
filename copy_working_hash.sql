-- Select a working hash from an existing user to see its format
SELECT email, password_hash FROM users WHERE provider = 'LOCAL' LIMIT 1;

-- Delete existing admin users
DELETE FROM users WHERE role = 'ADMIN';

-- Create a new admin using the same hash format as the working user
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
    password_hash,  -- Copy the working hash from a regular user
    'LOCAL',
    NOW(), 
    NOW(), 
    NOW(), 
    NOW(), 
    'ADMIN'
FROM users 
WHERE email = 'egemenmermer@gmail.com';  -- Use a known working user

-- Verify the admin was created
SELECT id, email, role, password_hash FROM users WHERE role = 'ADMIN'; 