package com.ego.ethicai.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PracticeScoreResponseDTO {

    private UUID id;
    private UUID conversationId;
    private Integer score;
    private LocalDateTime submittedAt;
} 