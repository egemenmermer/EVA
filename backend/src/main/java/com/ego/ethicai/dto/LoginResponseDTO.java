package com.ego.ethicai.dto;

import com.ego.ethicai.entity.User;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponseDTO {

    private String accessToken;
    private UserResponseDTO userDetails;


}
