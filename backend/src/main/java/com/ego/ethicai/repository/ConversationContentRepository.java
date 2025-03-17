package com.ego.ethicai.repository;

import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.ConversationContent;
import com.ego.ethicai.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationContentRepository extends JpaRepository<ConversationContent, UUID> {
    List<ConversationContent> findAllByUserId(UUID userId);
    Optional<Feedback> findByConversationId(UUID conversationId);
    List<ConversationContent> findByConversationAndUserId(Conversation conversation, UUID userId);
}
