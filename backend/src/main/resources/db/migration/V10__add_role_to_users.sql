-- Add role column to users table with default value 'user'
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'; 