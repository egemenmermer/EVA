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
public class ScenarioSessionResponseDTO {
    
    private String sessionId;
    private String scenarioId;
    private String scenarioTitle;
    private String scenarioDescription;
    private String issue;
    private String managerType;
    private String currentStatementId;
    private String currentStatement;
    private List<Map<String, Object>> choices;
    private int currentStep;
    private boolean isComplete;
} 