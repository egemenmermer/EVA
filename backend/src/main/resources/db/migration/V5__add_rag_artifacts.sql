-- Create rag_artifacts table
CREATE TABLE rag_artifacts (
    id BIGSERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL,
    artifact_type VARCHAR(20) NOT NULL,
    artifact_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(255),
    category VARCHAR(255),
    relevance FLOAT,
    summary TEXT,
    outcome TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rag_artifact_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id)
); 