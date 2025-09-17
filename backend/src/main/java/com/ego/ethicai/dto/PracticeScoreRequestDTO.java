package com.ego.ethicai.dto;

import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PracticeScoreRequestDTO {

    private UUID conversationId;
    private Integer score;
} 