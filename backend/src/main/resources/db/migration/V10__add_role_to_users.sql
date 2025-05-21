-- Add role column to users table with default value 'USER'
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER'; 