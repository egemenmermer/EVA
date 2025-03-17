package com.ego.ethicai.repository;

import com.ego.ethicai.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    Optional<Feedback> findByConversationId(UUID conversationId);
    Feedback findByConversationIdAndUserId(UUID conversationId, UUID userId);
    List<Feedback> findAllByUserId(UUID userId);
}
