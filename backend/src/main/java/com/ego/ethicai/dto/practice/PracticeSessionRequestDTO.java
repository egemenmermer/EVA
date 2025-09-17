package com.ego.ethicai.dto.practice;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "practice_sessions")
public class PracticeSessionRequestDTO {

    @Id
    private UUID id;

    @NotBlank
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @NotBlank
    @Column(name = "manager_type", nullable = false)
    private String managerType;
    
    @NotBlank
    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;
    
    @NotBlank
    @Column(name = "concern", nullable = false)
    private String concern;

    @NotNull
    private List<SelectionDataDTO> selectedChoices;
    
    private List<PracticeChoiceDTO> choices;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "score")
    private Double score;
}