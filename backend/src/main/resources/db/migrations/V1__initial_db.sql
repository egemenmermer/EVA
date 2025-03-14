-- Users Table
CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password VARCHAR(255) NOT NULL,
                       role VARCHAR(50) NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       activated_at TIMESTAMP DEFAULT NULL
);

-- Queries Table
CREATE TABLE queries (
                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                         user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                         query_text TEXT NOT NULL,
                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Responses Table
CREATE TABLE ai_responses (
                              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                              query_id UUID REFERENCES queries(id) ON DELETE CASCADE,
                              response_text TEXT NOT NULL,
                              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vector Data Table for FAISS Indexing
CREATE TABLE vector_data (
                             id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                             query_id UUID REFERENCES queries(id) ON DELETE CASCADE,
                             embedding VECTOR(768), -- FAISS stores vectors for fast retrieval
                             created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback Table
CREATE TABLE feedback (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          query_id UUID REFERENCES queries(id) ON DELETE CASCADE,
                          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                          rating INT CHECK (rating BETWEEN 1 AND 5),
                          comments TEXT,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);