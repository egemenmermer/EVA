package com.ego.ethicai.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserOAuthDTO {

    private String email;
    private String fullName;
    private String provider;
}
