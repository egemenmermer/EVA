package com.ego.ethicai.dto.scenario;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class ScenarioChoiceResponseDTO {
    
    private UUID sessionId;
    private String scenarioId;
    private String nextStatementId;
    private String nextStatement;
    private List<Map<String, Object>> nextChoices;
    private int currentStep;
    private int evs;
    private String category;
    private String feedback;
    
    @JsonProperty("isComplete")
    private boolean isComplete;
    
    private Map<String, Object> sessionSummary;
} 