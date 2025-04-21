package com.ego.ethicai.dto.request;

import com.ego.ethicai.enums.ManagerTypes;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConversationCreationRequest {

    // Keep userId for associating the conversation
    @NotNull(message = "User ID is required")
    private UUID userId; 

    @NotNull(message = "Manager type is required")
    private ManagerTypes managerType;

    // Add the optional title field
    private String title; 
} 