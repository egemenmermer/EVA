-- Add manager_type_preference column to users table
ALTER TABLE users ADD COLUMN manager_type_preference VARCHAR(50);
 
-- Add a comment explaining the column
COMMENT ON COLUMN users.manager_type_preference IS 'Manager type determined by diagnostic quiz: PUPPETEER, DILUTER, or CAMOUFLAGER'; 