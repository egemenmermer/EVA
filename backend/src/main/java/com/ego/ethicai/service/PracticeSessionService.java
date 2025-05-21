package com.ego.ethicai.service;

import com.ego.ethicai.dto.practice.PracticeSessionRequestDTO;
import com.ego.ethicai.dto.practice.PracticeSessionResponseDTO;
import com.ego.ethicai.entity.PracticeSession;

import java.util.List;
import java.util.UUID;

public interface PracticeSessionService {
    PracticeSessionResponseDTO savePracticeSession(PracticeSessionRequestDTO requestDTO);
    List<PracticeSessionResponseDTO> getPracticeSessionsByUserId(UUID userId);
    PracticeSession getPracticeSessionEntityById(UUID id);
} 