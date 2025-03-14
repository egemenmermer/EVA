package com.ego.ethicai.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivationResponseDTO {

    private String message;
    private LocalDateTime activatedAt;
}
