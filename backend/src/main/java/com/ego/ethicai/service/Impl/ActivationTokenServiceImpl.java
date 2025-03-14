package com.ego.ethicai.service.Impl;

import com.ego.ethicai.entity.ActivationToken;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.service.ActivationTokenService;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ActivationTokenServiceImpl implements ActivationTokenService {
    @Override
    public ActivationToken generateToken(User user) {
        return null;
    }

    @Override
    public boolean validateToken(String token, User user) {
        return false;
    }

    @Override
    public void deleteToken(User user) {

    }

    @Override
    public Optional<ActivationToken> findByToken(String token) {
        return Optional.empty();
    }
}
