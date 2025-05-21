-- Delete existing admin(s)
DELETE FROM users WHERE role = 'ADMIN';

-- Check if provider_id column exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'provider_id') THEN
        -- Insert admin user with provider_id column
        INSERT INTO users (
            id, 
            full_name, 
            email, 
            password_hash, 
            provider, 
            provider_id,
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
            NULL,
            NOW(), 
            NOW(), 
            NOW(), 
            NOW(), 
            'ADMIN'
        );
    ELSE
        -- Insert admin user without provider_id column
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
    END IF;
END $$;

-- Verify the result
SELECT id, email, password_hash, role FROM users WHERE role = 'ADMIN'; 