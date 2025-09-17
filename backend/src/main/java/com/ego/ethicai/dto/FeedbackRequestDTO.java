package com.ego.ethicai.dto;

import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackRequestDTO {

    private UUID conversationId;
    private String userFeedback;
    private Integer rating;
}
