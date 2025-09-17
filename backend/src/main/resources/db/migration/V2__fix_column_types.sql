-- Drop existing foreign key constraints if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_conversation_user' AND table_name = 'conversations') THEN
        ALTER TABLE conversations DROP CONSTRAINT fk_conversation_user;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_feedback_conversation' AND table_name = 'feedback') THEN
        ALTER TABLE feedback DROP CONSTRAINT fk_feedback_conversation;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_feedback_user' AND table_name = 'feedback') THEN
        ALTER TABLE feedback DROP CONSTRAINT fk_feedback_user;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_conversation_content_conversation' AND table_name = 'conversation_contents') THEN
        ALTER TABLE conversation_contents DROP CONSTRAINT fk_conversation_content_conversation;
    END IF;
END $$;

-- Fix column types
ALTER TABLE conversations ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE feedback ALTER COLUMN conversation_id TYPE uuid USING conversation_id::uuid;
ALTER TABLE feedback ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
ALTER TABLE conversation_contents ALTER COLUMN conversation_id TYPE uuid USING conversation_id::uuid;

-- Recreate foreign key constraints
ALTER TABLE conversations 
    ADD CONSTRAINT fk_conversation_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id);

ALTER TABLE feedback
    ADD CONSTRAINT fk_feedback_conversation 
    FOREIGN KEY (conversation_id) 
    REFERENCES conversations(id);

ALTER TABLE feedback
    ADD CONSTRAINT fk_feedback_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id);

ALTER TABLE conversation_contents
    ADD CONSTRAINT fk_conversation_content_conversation 
    FOREIGN KEY (conversation_id) 
    REFERENCES conversations(id); 