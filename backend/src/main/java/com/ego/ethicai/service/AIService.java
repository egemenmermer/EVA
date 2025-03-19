package com.ego.ethicai.service;

import com.ego.ethicai.dto.AIRequestDTO;
import com.ego.ethicai.dto.AIResponseDTO;

public interface AIService {
    AIResponseDTO getAIResponse(AIRequestDTO request);
}