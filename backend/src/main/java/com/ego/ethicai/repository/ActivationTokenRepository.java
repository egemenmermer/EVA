package com.ego.ethicai.repository;

import com.ego.ethicai.entity.ActivationToken;
import com.ego.ethicai.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ActivationTokenRepository extends JpaRepository<ActivationToken, UUID> {

    Optional<ActivationToken> findByUserEmail(String email);
    Optional<ActivationToken> findByToken(String token);
}
