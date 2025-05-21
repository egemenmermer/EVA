package com.ego.ethicai.dto;

import com.ego.ethicai.enums.AccountTypes;
import lombok.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDTO {

    private UUID id;
    private String email;
    private String fullName;
    private LocalDateTime lastLogin;
    private LocalDateTime updatedAt;
    private AccountTypes role;

}
