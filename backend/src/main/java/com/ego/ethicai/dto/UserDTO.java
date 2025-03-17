package com.ego.ethicai.dto;

import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {

    private UUID id;
    private String email;
    private String fullName;
    private String password;

    public UserDTO(String email, String fullName) {
        this.email = email;
        this.fullName = fullName;
    }

    public UserDTO(UUID id, String email, String fullName) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
    }

}
