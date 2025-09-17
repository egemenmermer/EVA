package com.ego.ethicai.dto.scenario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioChoiceRequestDTO {
    
    @NotBlank(message = "Session ID is required")
    private UUID sessionId;
    
    @NotNull(message = "Choice index is required")
    private Integer choiceIndex;
    
    @NotBlank(message = "Current statement ID is required")
    private String currentStatementId;
} 