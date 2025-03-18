package com.ego.ethicai.service.Impl;

import com.ego.ethicai.dto.UserResponseDTO;
import com.ego.ethicai.entity.ActivationToken;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.enums.AuthProvider;
import com.ego.ethicai.exception.UserNotFoundException;
import com.ego.ethicai.repository.UserRepository;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.ActivationTokenService;
import com.ego.ethicai.service.UserService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActivationTokenService activationTokenService;

    @Override
    public UserResponseDTO getUser(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(
                () -> new UserNotFoundException("User not found for ID: " + userId));;

        return new UserResponseDTO(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getLastLogin(),
                user.getUpdatedAt()
        );
    }

    @Override
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email).orElseThrow(
                () -> new UserNotFoundException("User not found for this email: " + email));
    }

    @Override
    public User createUser(User user) {
        if (user.getId() != null) {
            throw new RuntimeException("User already exists!");
        }
        
        // Ensure authProvider is set
        if (user.getAuthProvider() == null) {
            user.setAuthProvider(AuthProvider.LOCAL);
        }
        
        return userRepository.save(user);
    }

    @Override
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    @Transactional
    public UserResponseDTO updateUser(UUID userId, String fullName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found."));

        user.setFullName(fullName);
        user.setUpdatedAt(LocalDateTime.now());

        userRepository.save(user);

        return new UserResponseDTO(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getLastLogin(),
                user.getUpdatedAt()
        );
    }

    @Override
    public CustomUserDetails getUserDetailsByEmail(String email) {
        User user = userRepository.findByEmail(email).orElseThrow(()
                -> new UserNotFoundException("User not found for this email: " + email));

        return new CustomUserDetails(user);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    public Set<User> findAllById(List<UUID> userIds) {
        return new HashSet<>(userRepository.findAllById(userIds));
    }

    @Override
    public User processOAuthPostLogin(String email, String name, String provider) {
        Optional<User> existingUser = userRepository.findByEmail(email);

        if (existingUser.isEmpty()) {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setFullName(name);
            newUser.setAuthProvider(AuthProvider.valueOf(provider.toUpperCase()));
            newUser.setActivatedAt(LocalDateTime.now());

            return userRepository.save(newUser);
        }

        return existingUser.get();
    }

    @Override
    public Optional<User> findById(UUID id) {
        User user = userRepository.findById(id).orElseThrow(
                () -> new UserNotFoundException("User not found for ID: " + id));
        return Optional.of(user);
    }

    @Override
    public void deleteUser(UUID id) {
        userRepository.deleteById(id);
    }



}
