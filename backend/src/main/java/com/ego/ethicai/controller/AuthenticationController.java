package com.ego.ethicai.controller;

import com.ego.ethicai.dto.*;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.service.ActivationTokenService;
import com.ego.ethicai.service.AuthService;
import com.ego.ethicai.util.EmailUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthenticationController {

    @Autowired
    private EmailUtil emailUtil;

    @Autowired
    private AuthService authService;

    @Autowired
    private ActivationTokenService activationTokenService;


    @PostMapping("/register")
    public ResponseEntity<RegisterResponseDTO> register(
            @RequestBody RegisterRequestDTO registerRequestDto) {

        User user = authService.register(registerRequestDto);
        String token = activationTokenService.generateToken(user).getToken();
        try {
            emailUtil.sendActivationEmail(user.getEmail(), token);
        } catch (Exception e) {
            return ResponseEntity.ok(new RegisterResponseDTO(
                    "Registration successful, but activation email could not be sent."
            ));
        }

        return ResponseEntity.ok(new RegisterResponseDTO("Registration successful!"));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(
            @RequestBody LoginRequestDTO loginRequestDto) {
        LoginResponseDTO loginResponseDto = authService.login(loginRequestDto);
        return ResponseEntity.ok(loginResponseDto);
    }

    @GetMapping("/oauth2/redirect")
    public ResponseEntity<?> oauthRedirect(@RequestParam String token) {
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/activate")
    public ResponseEntity<ActivationResponseDTO> activate(
            @RequestBody ActivationRequestDTO activationRequestDto) {
        authService.activate(activationRequestDto);
        return ResponseEntity.ok(new ActivationResponseDTO("Account Activated!"));
    }

}
