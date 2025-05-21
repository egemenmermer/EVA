package com.ego.ethicai.dto.practice;

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
public class PracticeSessionResponseDTO {
    private UUID id;
    private UUID userId;
    private String managerType;
    private String scenarioId;
    private List<String> selectedChoices;
    private LocalDateTime createdAt;
    private Integer score;
} 