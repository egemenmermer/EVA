-- Fix feedback table id column type
ALTER TABLE feedback ALTER COLUMN id DROP DEFAULT;
ALTER TABLE feedback ALTER COLUMN id TYPE bigint USING id::text::bigint;
CREATE SEQUENCE IF NOT EXISTS feedback_id_seq;
SELECT setval('feedback_id_seq', COALESCE((SELECT MAX(id) FROM feedback), 0) + 1, false);
ALTER TABLE feedback ALTER COLUMN id SET DEFAULT nextval('feedback_id_seq'); 