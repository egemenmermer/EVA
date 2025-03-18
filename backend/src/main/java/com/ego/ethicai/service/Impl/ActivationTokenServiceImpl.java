package com.ego.ethicai.service.Impl;

import com.ego.ethicai.entity.ActivationToken;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.repository.ActivationTokenRepository;
import com.ego.ethicai.service.ActivationTokenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class ActivationTokenServiceImpl implements ActivationTokenService {

    @Autowired
    private ActivationTokenRepository activationTokenRepository;

    @Override
    public ActivationToken generateToken(User user) {
        // Delete any existing tokens for this user
        activationTokenRepository.findByUserEmail(user.getEmail())
                .ifPresent(activationTokenRepository::delete);

        // Generate a unique token
        String token = UUID.randomUUID().toString();

        // Create a new activation token entity
        ActivationToken activationToken = new ActivationToken();
        activationToken.setUser(user);
        activationToken.setToken(token);
        activationToken.setExpiresAt(LocalDateTime.now().plusHours(24));

        // Save to DB
        return activationTokenRepository.save(activationToken);
    }

    @Override
    public boolean validateToken(String token, User user) {
        Optional<ActivationToken> storedToken = activationTokenRepository.findByUserEmail(user.getEmail());

        if (storedToken.isEmpty()) {
            return false;
        }

        ActivationToken activationToken = storedToken.get();

        // Check if token matches and is not expired
        return activationToken.getToken().equals(token) && 
               !activationToken.getExpiresAt().isBefore(LocalDateTime.now());
    }

    @Override
    public void deleteToken(User user) {
        activationTokenRepository.findByUserEmail(user.getEmail())
                .ifPresent(activationTokenRepository::delete);
    }

    @Override
    public Optional<ActivationToken> findByToken(String token) {
        return activationTokenRepository.findByToken(token);
    }
}