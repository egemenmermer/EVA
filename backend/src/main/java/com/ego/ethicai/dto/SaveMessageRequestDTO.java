package com.ego.ethicai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for requests to the new endpoint that saves pre-generated messages from the agent.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SaveMessageRequestDTO {

    private UUID conversationId; // Required
    private String messageId;      // Optional: Agent might provide one, backend might generate/use its own DB ID
    private String content;        // Required: The actual text content
    private String role;           // Required: "user" or "assistant"
    private String createdAt;      // Optional: Agent can provide timestamp

} 