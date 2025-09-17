package com.ego.ethicai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PracticeSessionDataDTO {
    private UUID conversationId;
    private String userId; // Assuming userId is available in frontend
    private int score;
    private List<PracticeResponseDTO> responses;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PracticeResponseDTO {
        private String role;
        private String content;
        private String question; // Manager question
        private String userResponse; // User selected choice
        private Integer score; // Score for this specific interaction if applicable
    }
} 