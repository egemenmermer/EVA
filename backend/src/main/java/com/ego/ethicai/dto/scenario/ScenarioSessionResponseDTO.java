package com.ego.ethicai.dto.scenario;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioSessionResponseDTO {
    private String scenarioId;
    private UUID sessionId;
    private UUID conversationId;
    private String scenarioTitle;
    private String scenarioDescription;
    private String issue;
    private String concern;
    private String managerType;
    private int difficulty;
    private String currentStatementId;
    private String currentStatement;
    private List<Map<String, Object>> choices;
    private int currentStep;
    private boolean isComplete;
} 