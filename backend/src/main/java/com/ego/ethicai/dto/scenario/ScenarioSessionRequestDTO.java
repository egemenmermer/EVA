package com.ego.ethicai.dto.scenario;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioSessionRequestDTO {
    
    @NotBlank(message = "Session ID is required")
    private String sessionId;
    
    private String userQuery;
} 