package com.ego.ethicai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConversationContentResponseDTO {
    private String id;
    private String conversationId;
    private String userQuery;
    private String agentResponse;
    private String createdAt;
    private String role;
    private String content;
}
