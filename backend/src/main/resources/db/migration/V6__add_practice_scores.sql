CREATE TABLE practice_scores (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL,
  submitted_at TIMESTAMP NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_practice_scores_conversation_id ON practice_scores(conversation_id);
CREATE INDEX idx_practice_scores_user_id ON practice_scores(user_id);
CREATE UNIQUE INDEX idx_practice_scores_conversation_user ON practice_scores(conversation_id, user_id); 