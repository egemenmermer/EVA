package com.ego.ethicai.repository;

import com.ego.ethicai.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    List<Conversation> findByUserId(UUID userId);
    Optional<Conversation> findById(UUID id);
    void deleteById(UUID id);
}
