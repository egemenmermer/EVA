package com.ego.ethicai.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {

    private String email;
    private String fullName;
    private String password;

    public UserDTO(String email, String fullName) {
        this.email = email;
        this.fullName = fullName;
    }

}
