package com.ego.ethicai.dto.scenario;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioSessionRequestDTO {
    
    @NotBlank(message = "Session ID is required")
    private UUID sessionId;
    
    @NotBlank
    private String managerType;

    @NotBlank
    private String concern;
    
    @NotBlank
    private int difficulty;} 