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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

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

        String email = loginRequestDto.getEmail();
        String password = loginRequestDto.getPassword();

        User user = userService.findByEmail(email).orElseThrow(
                () -> new UserNotFoundException("User not found for this email: " + email));

        if (!passwordEncoder.passwordEncoderBean().matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password");
        }

        if (user.getActivatedAt() == null) {
            throw new RuntimeException("User not activated");
        }

        // Update last login timestamp
        user.setLastLogin(LocalDateTime.now());
        userService.saveUser(user);

        String token = jwtUtil.generateToken(new CustomUserDetails(user));

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
        String email = registerRequestDTO.getEmail();
        String password = registerRequestDTO.getPassword();
        String fullName = registerRequestDTO.getFullName();

        if (password.length() < 8) {
            throw new RuntimeException("Password must be at least 8 characters long");
        }

        if (userService.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.passwordEncoderBean().encode(password));
        user.setFullName(fullName);
        user.setAuthProvider(AuthProvider.LOCAL);  // Set default auth provider for email/password registration

        return userService.createUser(user);
    }

    @Override
    @Transactional
    public ActivationResponseDTO activate(ActivationRequestDTO activationRequestDto) {
        Optional<ActivationToken> activationToken = activationTokenRepository.findByToken(activationRequestDto.getToken());
        if (activationToken.isEmpty()) {
            throw new RuntimeException("Invalid activation token");
        }

        ActivationToken activationTokenEntity = activationToken.get();
        User user = activationTokenEntity.getUser();

        if (user.getActivatedAt() != null) {
            throw new RuntimeException("User already activated");
        }

        user.setActivatedAt(LocalDateTime.now());
        userService.saveUser(user);

        activationTokenRepository.deleteById(activationTokenEntity.getId());

        return new ActivationResponseDTO("Activation successful", LocalDateTime.now());
    }

    @Override
    public boolean isUserActivated(String email) {
        User user = userService.findByEmail(email).orElseThrow(
                () -> new UserNotFoundException("User not found for this email: " + email));

        if (user.getActivatedAt() == null) {
            return false;
        }
        return true;
    }


}
