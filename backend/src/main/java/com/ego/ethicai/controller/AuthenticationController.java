package com.ego.ethicai.controller;

import com.ego.ethicai.dto.*;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.service.ActivationTokenService;
import com.ego.ethicai.service.AuthService;
import com.ego.ethicai.util.EmailUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthenticationController {

    private static final Logger logger = LoggerFactory.getLogger(AuthenticationController.class);

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
            logger.debug("Attempting to send activation email to: {}", user.getEmail());
            emailUtil.sendActivationEmail(user.getEmail(), token);
            logger.info("Activation email sent successfully to: {}", user.getEmail());
            
            return ResponseEntity.ok(new RegisterResponseDTO(
                "Registration successful! Please check your email to activate your account."
            ));
        } catch (Exception e) {
            logger.error("Failed to send activation email to: {}", user.getEmail(), e);
            return ResponseEntity.ok(new RegisterResponseDTO(
                "Registration successful, but we couldn't send the activation email. " +
                "Please contact support to activate your account."
            ));
        }
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
        try {
            logger.info("Received activation request with token: {}", 
                activationRequestDto != null ? activationRequestDto.getToken().substring(0, 10) + "..." : "null");
            
            ActivationResponseDTO response = authService.activate(activationRequestDto);
            logger.info("Account activation successful");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Account activation failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(
                new ActivationResponseDTO("Activation failed: " + e.getMessage())
            );
        }
    }

    @GetMapping("/verify-token")
    public ResponseEntity<?> verifyToken() {
        // If this endpoint is reached, it means the token is valid
        // because the JWT filter would have rejected any invalid tokens
        logger.debug("Token verification successful");
        return ResponseEntity.ok(Map.of(
            "status", "ok",
            "message", "Token is valid"
        ));
    }
}
