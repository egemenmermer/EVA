package com.ego.ethicai.service.Impl;

import com.ego.ethicai.config.PasswordEncoder;
import com.ego.ethicai.dto.*;
import com.ego.ethicai.entity.ActivationToken;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.enums.AuthProvider;
import com.ego.ethicai.exception.UserNotFoundException;
import com.ego.ethicai.repository.ActivationTokenRepository;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.security.jwt.JwtUtil;
import com.ego.ethicai.service.AuthService;
import com.ego.ethicai.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthServiceImpl.class);

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

    @Autowired
    private ActivationTokenRepository activationTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public LoginResponseDTO login(LoginRequestDTO loginRequestDto) {
        if (loginRequestDto == null || loginRequestDto.getEmail() == null || loginRequestDto.getPassword() == null) {
            throw new IllegalArgumentException("Email and password are required");
        }

        String email = loginRequestDto.getEmail().trim();
        String password = loginRequestDto.getPassword();

        User user = userService.findByEmail(email).orElseThrow(
                () -> new UserNotFoundException("User not found for email: " + email));

        if (!passwordEncoder.passwordEncoderBean().matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        if (user.getActivatedAt() == null) {
            throw new RuntimeException("User not activated");
        }

        user.setLastLogin(LocalDateTime.now());
        user = userService.saveUser(user);

        CustomUserDetails userDetails = new CustomUserDetails(user);
        String token = jwtUtil.generateToken(userDetails);

        logger.debug("Generated token for user: {} with ID: {}", email, user.getId());

        return new LoginResponseDTO(token, new UserResponseDTO(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getLastLogin(),
                user.getUpdatedAt()
        ));
    }

    @Override
    @Transactional
    public User register(RegisterRequestDTO registerRequestDTO) {
        if (registerRequestDTO == null || 
            registerRequestDTO.getEmail() == null || 
            registerRequestDTO.getPassword() == null ||
            registerRequestDTO.getFullName() == null) {
            throw new IllegalArgumentException("Email, password, and full name are required");
        }

        String email = registerRequestDTO.getEmail().trim();
        String password = registerRequestDTO.getPassword();
        String fullName = registerRequestDTO.getFullName().trim();

        if (password.length() < 8) {
            throw new RuntimeException("Password must be at least 8 characters long");
        }

        if (userService.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.passwordEncoderBean().encode(password))
                .fullName(fullName)
                .authProvider(AuthProvider.LOCAL)
                .build();

        user = userService.createUser(user);
        logger.debug("Created new user: {} with ID: {}", email, user.getId());

        return user;
    }

    @Override
    @Transactional
    public ActivationResponseDTO activate(ActivationRequestDTO activationRequestDto) {
        if (activationRequestDto == null || activationRequestDto.getToken() == null) {
            logger.error("Activation failed: token is null");
            throw new IllegalArgumentException("Activation token is required");
        }

        logger.debug("Looking up activation token: {}", activationRequestDto.getToken().substring(0, 10) + "...");
        Optional<ActivationToken> activationToken = activationTokenRepository.findByToken(activationRequestDto.getToken());
        if (activationToken.isEmpty()) {
            logger.error("Activation failed: token not found in database");
            throw new RuntimeException("Invalid activation token");
        }

        ActivationToken activationTokenEntity = activationToken.get();
        User user = activationTokenEntity.getUser();
        logger.debug("Found user for activation: {}", user.getEmail());

        if (user.getActivatedAt() != null) {
            logger.warn("User already activated: {}", user.getEmail());
            throw new RuntimeException("User already activated");
        }

        user.setActivatedAt(LocalDateTime.now());
        userService.saveUser(user);

        activationTokenRepository.deleteById(activationTokenEntity.getId());
        logger.info("Successfully activated user: {} with ID: {}", user.getEmail(), user.getId());

        return new ActivationResponseDTO("Activation successful", LocalDateTime.now());
    }

    @Override
    public boolean isUserActivated(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }

        User user = userService.findByEmail(email).orElseThrow(
                () -> new UserNotFoundException("User not found for email: " + email));

        return user.getActivatedAt() != null;
    }
}
