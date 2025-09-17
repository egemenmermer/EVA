package com.ego.ethicai.dto;

import com.ego.ethicai.enums.AuthProvider;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OauthLoginRequestDTO {

    private String token;
    private AuthProvider authProvider;
}
