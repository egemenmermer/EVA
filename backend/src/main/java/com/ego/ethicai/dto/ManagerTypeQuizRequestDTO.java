package com.ego.ethicai.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerTypeQuizRequestDTO {
    
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotNull(message = "Quiz responses are required")
    private List<QuizResponse> responses;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizResponse {
        private int questionId;
        private int score; // 0-4 scale
        private String managerTypeSignal; // PUPPETEER, DILUTER, CAMOUFLAGER
    }
} 