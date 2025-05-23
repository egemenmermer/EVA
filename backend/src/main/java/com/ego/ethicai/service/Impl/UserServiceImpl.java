package com.ego.ethicai.service.Impl;

import com.ego.ethicai.dto.UserDTO;
import com.ego.ethicai.dto.UserResponseDTO;
import com.ego.ethicai.entity.ActivationToken;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.enums.AuthProvider;
import com.ego.ethicai.exception.UserNotFoundException;
import com.ego.ethicai.repository.UserRepository;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.ActivationTokenService;
import com.ego.ethicai.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class UserServiceImpl implements UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivationTokenService activationTokenService;

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getUser(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("User ID cannot be null");
        }

        User user = findById(id).orElseThrow(
                () -> new UserNotFoundException("User not found with ID: " + id));

        return new UserResponseDTO(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getLastLogin(),
                user.getUpdatedAt(),
                user.getRole(),
                user.getManagerTypePreference()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public User getUserByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be null or empty");
        }

        return findByEmail(email.trim()).orElseThrow(
                () -> new UserNotFoundException("User not found with email: " + email));
    }

    @Override
    @Transactional
    public User createUser(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null");
        }
        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be null or empty");
        }

        String email = user.getEmail().trim();
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already exists: " + email);
        }

        user.setEmail(email);
        if (user.getAuthProvider() == null) {
            user.setAuthProvider(AuthProvider.LOCAL);
        }

        User savedUser = userRepository.save(user);
        logger.debug("Created new user with ID: {} and email: {}", savedUser.getId(), savedUser.getEmail());
        return savedUser;
    }

    @Override
    @Transactional
    public User saveUser(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null");
        }
        if (user.getId() == null) {
            throw new IllegalArgumentException("User ID cannot be null when saving");
        }

        User savedUser = userRepository.save(user);
        logger.debug("Saved user with ID: {} and email: {}", savedUser.getId(), savedUser.getEmail());
        return savedUser;
    }

    @Override
    @Transactional
    public UserResponseDTO updateUser(UUID userId, String fullName) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID cannot be null");
        }
        if (fullName == null || fullName.trim().isEmpty()) {
            throw new IllegalArgumentException("Full name cannot be null or empty");
        }

        User user = findById(userId).orElseThrow(
                () -> new UserNotFoundException("User not found with ID: " + userId));

        user.setFullName(fullName.trim());
        user = userRepository.save(user);
        logger.debug("Updated user with ID: {} and email: {}", user.getId(), user.getEmail());

        return new UserResponseDTO(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getLastLogin(),
                user.getUpdatedAt(),
                user.getRole(),
                user.getManagerTypePreference()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public CustomUserDetails getUserDetailsByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be null or empty");
        }

        User user = findByEmail(email.trim()).orElseThrow(
                () -> new UserNotFoundException("User not found with email: " + email));

        return new CustomUserDetails(user);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<User> findByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be null or empty");
        }

        return userRepository.findByEmail(email.trim());
    }

    @Override
    @Transactional(readOnly = true)
    public Set<User> findAllById(List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptySet();
        }

        return new HashSet<>(userRepository.findAllById(userIds));
    }

    @Override
    @Transactional
    public User processOAuthPostLogin(String email, String name, String provider) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email cannot be null or empty");
        }
        if (provider == null || provider.trim().isEmpty()) {
            throw new IllegalArgumentException("Provider cannot be null or empty");
        }

        Optional<User> existingUser = findByEmail(email.trim());
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            if (name != null && !name.trim().isEmpty()) {
                user.setFullName(name.trim());
            }
            user.setLastLogin(LocalDateTime.now());
            user = userRepository.save(user);
            logger.debug("Updated OAuth user with ID: {} and email: {}", user.getId(), user.getEmail());
            return user;
        }

        User newUser = User.builder()
                .email(email.trim())
                .fullName(name != null ? name.trim() : null)
                .authProvider(AuthProvider.valueOf(provider.toUpperCase()))
                .activatedAt(LocalDateTime.now()) // OAuth users are automatically activated
                .build();

        newUser = userRepository.save(newUser);
        logger.debug("Created new OAuth user with ID: {} and email: {}", newUser.getId(), newUser.getEmail());
        return newUser;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<User> findById(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("User ID cannot be null");
        }

        return userRepository.findById(id);
    }

    @Override
    @Transactional
    public void deleteUser(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("User ID cannot be null");
        }

        if (!userRepository.existsById(id)) {
            throw new UserNotFoundException("User not found with ID: " + id);
        }

        userRepository.deleteById(id);
        logger.debug("Deleted user with ID: {}", id);
    }
}
