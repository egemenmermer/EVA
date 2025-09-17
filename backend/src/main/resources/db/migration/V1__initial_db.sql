-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    manager_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_conversation_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Conversation Contents table
CREATE TABLE conversation_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    user_query TEXT NOT NULL,
    agent_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_conversation_content_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Feedback table
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    user_feedback TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    submitted_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_feedback_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Activation tokens table
CREATE TABLE activation_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    token VARCHAR(36) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_activation_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);