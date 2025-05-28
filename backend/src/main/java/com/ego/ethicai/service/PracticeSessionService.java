package com.ego.ethicai.service;

import com.ego.ethicai.dto.practice.*;
import com.ego.ethicai.entity.PracticeSession;

import java.util.List;
import java.util.UUID;

public interface PracticeSessionService {
    PracticeSessionResponseDTO savePracticeSession(PracticeSessionRequestDTO requestDTO);
    List<PracticeSessionResponseDTO> getPracticeSessionsByUserId(UUID userId);
    PracticeSession getPracticeSessionEntityById(UUID id);
    List<PracticeSessionResponseDTO> getAllPracticeSessions();
    List<SelectionDataDTO> getUserSelections(UUID sessionId);
    DecisionTreeDataDTO getDecisionTree(UUID sessionId);
} 