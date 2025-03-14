package com.ego.ethicai.service;

import com.ego.ethicai.dto.ActivationRequestDTO;
import com.ego.ethicai.dto.ActivationResponseDTO;
import com.ego.ethicai.dto.LoginRequestDTO;
import com.ego.ethicai.dto.LoginResponseDTO;
import com.ego.ethicai.entity.User;

public interface AuthService {
    LoginResponseDTO login (LoginRequestDTO loginRequestDto);
    User register(LoginRequestDTO loginRequestDto);
    ActivationResponseDTO activate(ActivationRequestDTO activationRequestDto);
}
