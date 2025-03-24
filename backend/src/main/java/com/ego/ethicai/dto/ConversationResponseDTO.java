package com.ego.ethicai.dto;

import com.ego.ethicai.enums.ManagerTypes;
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
public class ConversationResponseDTO {

    private UUID conversationId;
    private UUID userId;
    private String title;
    private ManagerTypes managerType;
    private LocalDateTime createdAt;
}
