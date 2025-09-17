-- V19: Add practice completion tracking fields to users table

-- Add has_completed_practice field for permanent tactics guide display
ALTER TABLE users 
ADD COLUMN has_completed_practice BOOLEAN NOT NULL DEFAULT FALSE;
 
-- Add timestamp for when first practice was completed
ALTER TABLE users 
ADD COLUMN first_practice_completed_at TIMESTAMP NULL; 