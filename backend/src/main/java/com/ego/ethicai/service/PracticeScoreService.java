package com.ego.ethicai.service;

import com.ego.ethicai.entity.PracticeScore;

import java.util.List;
import java.util.UUID;

public interface PracticeScoreService {
    
    PracticeScore submitPracticeScore(UUID conversationId, UUID userId, Integer score);
    
    PracticeScore getPracticeScore(UUID conversationId, UUID userId);
    
    List<PracticeScore> getAllPracticeScores();
    
    List<PracticeScore> getPracticeScoresByUser(UUID userId);
    
    List<PracticeScore> getPracticeScoresByConversation(UUID conversationId);
} 