package com.ego.ethicai.dto.scenario;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioChoiceResponseDTO {
    
    private String sessionId;
    private String scenarioId;
    private String nextStatementId;
    private String nextStatement;
    private List<Map<String, Object>> nextChoices;
    private int currentStep;
    private int evs;
    private String category;
    private boolean isComplete;
    private Map<String, Object> sessionSummary;
} 