package com.ego.ethicai.service;

import com.ego.ethicai.dto.practice.*;
import com.ego.ethicai.entity.PracticeSession;

import java.util.List;
import java.util.UUID;
import java.util.Map;

public interface PracticeSessionService {
    PracticeSessionResponseDTO savePracticeSession(PracticeSessionRequestDTO requestDTO);
    List<PracticeSessionResponseDTO> getPracticeSessionsByUserId(UUID userId);
    PracticeSession getPracticeSessionEntityById(UUID id);
    List<PracticeSessionResponseDTO> getAllPracticeSessions();
    List<SelectionDataDTO> getUserSelections(UUID sessionId);
    DecisionTreeDataDTO getDecisionTree(UUID sessionId);
    
    // New methods for auto-open tactics guide functionality
    void setAutoOpenTacticsFlag(UUID userId, UUID conversationId, Map<String, Object> practiceData);
    Map<String, Object> getAndClearAutoOpenTacticsFlag(UUID userId, UUID conversationId);
    Map<String, Object> getLatestPracticeSessionData(UUID userId);
} 