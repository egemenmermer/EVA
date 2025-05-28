package com.ego.ethicai.service;

import com.ego.ethicai.dto.scenario.ScenarioSessionResponseDTO;
import com.ego.ethicai.dto.scenario.ScenarioChoiceResponseDTO;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface ScenarioService {
    
    ScenarioSessionResponseDTO startScenario(UUID userId, String scenarioId, String sessionId);
    
    ScenarioChoiceResponseDTO processChoice(UUID userId, String scenarioId, String sessionId, 
                                          Integer choiceIndex, String currentStatementId);
    
    Map<String, String> suggestScenarioForQuery(String userQuery);
    
    List<Map<String, Object>> getAvailableScenarios();
    
    Map<String, Object> generateSessionFeedback(UUID userId, String scenarioId, String sessionId);
    
    JsonNode getScenarioData(String scenarioId);
} 