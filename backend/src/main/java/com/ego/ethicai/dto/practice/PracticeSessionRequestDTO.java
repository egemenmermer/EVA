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
    
    @NotEmpty(message = "Selected choices are required")
    private List<String> selectedChoices;
    
    private LocalDateTime timestamp;

    private Integer score;
}