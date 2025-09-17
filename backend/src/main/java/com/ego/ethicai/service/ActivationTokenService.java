package com.ego.ethicai.service;

import com.ego.ethicai.entity.ActivationToken;
import com.ego.ethicai.entity.User;

import java.util.Optional;

public interface ActivationTokenService {
    ActivationToken generateToken(User user);
    boolean validateToken(String token, User user);
    void deleteToken(User user);
    Optional<ActivationToken> findByToken(String token);
}
