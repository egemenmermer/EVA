package com.ego.ethicai.service;

import com.ego.ethicai.dto.*;
import com.ego.ethicai.entity.User;

public interface AuthService {
    LoginResponseDTO login (LoginRequestDTO loginRequestDto);
    User register(RegisterRequestDTO registerRequestDto);
    ActivationResponseDTO activate(ActivationRequestDTO activationRequestDto);
    boolean isUserActivated(String email);
}
