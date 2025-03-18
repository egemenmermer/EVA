package com.ego.ethicai.repository;

import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.ConversationContent;
import com.ego.ethicai.entity.Feedback;
import com.ego.ethicai.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationContentRepository extends JpaRepository<ConversationContent, UUID> {

    @Query("SELECT cc FROM ConversationContent cc WHERE cc.conversation.user.id = :userId")
    List<ConversationContent> findAllByUserId(@Param("userId") UUID userId);
    
    Optional<Feedback> findByConversationId(UUID conversationId);
    
    List<ConversationContent> findByConversation(Conversation conversation);
    
    @Query("SELECT cc FROM ConversationContent cc WHERE cc.conversation = :conversation AND cc.conversation.user.id = :userId")
    List<ConversationContent> findByConversationAndUserId(@Param("conversation") Conversation conversation, @Param("userId") UUID userId);
}
