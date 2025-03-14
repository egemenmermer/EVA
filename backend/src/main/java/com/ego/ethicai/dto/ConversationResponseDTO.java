package com.ego.ethicai.dto;

import com.ego.ethicai.enums.ManagerTypes;
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
public class ConversationResponseDTO {

    private UUID conversationId;
    private UUID userId;
    private ManagerTypes managerType;
    private String agentResponse; // AI's first response
    private Instant createdAt;
}
