package com.ego.ethicai.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackResponseDTO {

    private Long id;
    private UUID conversationId;
    private String userFeedback;
    private Integer rating;
    private LocalDateTime submittedAt;


}
