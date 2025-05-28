package com.ego.ethicai.dto.scenario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioChoiceRequestDTO {
    
    @NotBlank(message = "Session ID is required")
    private String sessionId;
    
    @NotNull(message = "Choice index is required")
    private Integer choiceIndex;
    
    @NotBlank(message = "Current statement ID is required")
    private String currentStatementId;
} 