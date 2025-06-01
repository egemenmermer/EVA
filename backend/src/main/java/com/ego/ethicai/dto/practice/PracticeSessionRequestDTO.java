package com.ego.ethicai.dto.practice;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PracticeSessionRequestDTO {

    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotBlank(message = "Manager type is required")
    private String managerType;
    
    private String scenarioId;
    
    // Legacy field for backward compatibility
    private List<String> selectedChoices;
    
    // New field with detailed choice information
    private List<PracticeChoiceDTO> choices;
    
    private LocalDateTime timestamp;

    private Double score;
}