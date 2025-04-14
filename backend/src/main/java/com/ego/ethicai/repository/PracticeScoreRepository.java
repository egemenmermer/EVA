package com.ego.ethicai.repository;

import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.PracticeScore;
import com.ego.ethicai.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PracticeScoreRepository extends JpaRepository<PracticeScore, UUID> {
    List<PracticeScore> findByConversation(Conversation conversation);
    List<PracticeScore> findByUser(User user);
    Optional<PracticeScore> findByConversationAndUser(Conversation conversation, User user);
} 