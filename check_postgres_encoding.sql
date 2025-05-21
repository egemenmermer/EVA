-- Check database encoding
SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = 'eva';

-- Check users table schema including column types and constraints
SELECT column_name, data_type, character_maximum_length, collation_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users';

-- Check if there are any triggers on the users table
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Create a test record with a long hash to see if it's truncated
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
    'Test Admin', 
    'test.admin@eva.com', 
    'TESTLONGHASH_$2a$10$u3gGVCAXAhBL0HNy2MEl6ejYUZjWf95E8yHRKncF/C9DZbmuVtDxi_TESTLONGHASH',
    'LOCAL',
    NOW(),
    NOW(),
    NOW(),
    NOW(),
    'USER'
);

-- Check the inserted record
SELECT id, email, password_hash FROM users WHERE email = 'test.admin@eva.com'; 