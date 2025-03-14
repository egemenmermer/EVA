package com.ego.ethicai.service.Impl;

import com.ego.ethicai.dto.UserResponseDTO;
import com.ego.ethicai.entity.ActivationToken;
import com.ego.ethicai.entity.User;
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

        return new CustomUserDetails(user.getEmail(), user.getPasswordHash(), new ArrayList<>());
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    public Set<User> findAllById(List<UUID> userIds) {
        return new HashSet<>(userRepository.findAllById(userIds));
    }



}
