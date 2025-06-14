package com.ego.ethicai.repository;

import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    List<Conversation> findByUser(User user);
    Optional<Conversation> findById(UUID id);

    @Query("SELECT c FROM Conversation c WHERE c.user = :user")
    List<Conversation> getUserConversations(User user);
    void deleteById(UUID id);
}
