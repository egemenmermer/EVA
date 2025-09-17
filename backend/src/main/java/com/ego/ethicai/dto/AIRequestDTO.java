package com.ego.ethicai.dto;

import com.ego.ethicai.enums.ManagerTypes;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AIRequestDTO {

    private ManagerTypes managerType;
    private String userQuery;
    private UUID conversationId;
    private Boolean includeHistory;
    private Integer historyLimit;
    
    // Add a constructor that keeps backward compatibility
    public AIRequestDTO(ManagerTypes managerType, String userQuery, UUID conversationId) {
        this.managerType = managerType;
        this.userQuery = userQuery;
        this.conversationId = conversationId;
        this.includeHistory = false;
        this.historyLimit = 20;
    }
}
