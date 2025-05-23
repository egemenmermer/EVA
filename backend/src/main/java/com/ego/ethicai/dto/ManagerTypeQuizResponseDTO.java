package com.ego.ethicai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerTypeQuizResponseDTO {
    private String determinedManagerType;
    private String message;
    private boolean success;
} 