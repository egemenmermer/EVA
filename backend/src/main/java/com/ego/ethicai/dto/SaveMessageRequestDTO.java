package com.ego.ethicai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for requests to the new endpoint that saves pre-generated messages from the agent.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SaveMessageRequestDTO {
    private UUID conversationId;
    private String messageId; // Optional
    private String content;
    private String role;      // "user" | "assistant"
    private String createdAt; // Optional
}
