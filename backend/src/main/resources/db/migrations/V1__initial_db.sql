-- Users table for authentication & profile management
CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                       full_name VARCHAR(255),
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password_hash VARCHAR(255),
                       provider VARCHAR(50), -- OAuth provider ("google", "github") or NULL if email/password
                       provider_id VARCHAR(255),
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       activated_at TIMESTAMP DEFAULT NULL
);


-- Conversations table
CREATE TABLE conversations (
                               conversation_id UUID PRIMARY KEY,
                               user_id UUID REFERENCES users(id),
                               manager_type VARCHAR(100),
                               created_at TIMESTAMP DEFAULT NOW(),
                               updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversation Contents table
CREATE TABLE conversation_contents (
                                       message_id UUID PRIMARY KEY,
                                       conversation_id UUID REFERENCES conversations(id),
                                       user_query TEXT NOT NULL,
                                       agent_response TEXT NOT NULL,
                                       created_at TIMESTAMP DEFAULT NOW()
);

-- Feedback table
CREATE TABLE feedback (
                          id SERIAL PRIMARY KEY,
                          conversation_id UUID REFERENCES conversations(id),
                          user_feedback TEXT,
                          rating INT CHECK (rating BETWEEN 1 AND 5),
                          submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE activation_tokens (
                                   id BIGSERIAL PRIMARY KEY,
                                   user_id BIGINT NOT NULL,
                                   token VARCHAR(6) NOT NULL,
                                   expires_at TIMESTAMP NOT NULL,
                                   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);