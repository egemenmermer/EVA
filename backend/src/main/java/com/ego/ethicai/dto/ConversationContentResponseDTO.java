package com.ego.ethicai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConversationContentResponseDTO {

    private UUID conversationId;
    private String userQuery;
    private String agentResponse;
    private Instant createdAt;
}
