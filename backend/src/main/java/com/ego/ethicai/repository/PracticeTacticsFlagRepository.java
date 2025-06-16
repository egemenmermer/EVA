package com.ego.ethicai.repository;

import com.ego.ethicai.entity.PracticeTacticsFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PracticeTacticsFlagRepository extends JpaRepository<PracticeTacticsFlag, UUID> {
    Optional<PracticeTacticsFlag> findByUser_IdAndConversationId(UUID userId, UUID conversationId);
    void deleteByUser_IdAndConversationId(UUID userId, UUID conversationId);
} 