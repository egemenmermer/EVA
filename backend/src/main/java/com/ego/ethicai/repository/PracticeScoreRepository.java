package com.ego.ethicai.repository;

import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.PracticeScore;
import com.ego.ethicai.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PracticeScoreRepository extends JpaRepository<PracticeScore, UUID> {
    List<PracticeScore> findByConversation(Conversation conversation);
    List<PracticeScore> findByUser(User user);
    Optional<PracticeScore> findByConversationAndUser(Conversation conversation, User user);
    
    // Method to delete scores by conversation ID
    @Modifying
    @Query("DELETE FROM PracticeScore ps WHERE ps.conversation.id = :conversationId")
    void deleteByConversationId(@Param("conversationId") UUID conversationId);
} 