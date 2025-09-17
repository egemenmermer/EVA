package com.ego.ethicai.repository;

import com.ego.ethicai.entity.RagArtifact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RagArtifactRepository extends JpaRepository<RagArtifact, Long> {
    
    /**
     * Find all artifacts associated with a specific conversation
     */
    List<RagArtifact> findByConversationId(UUID conversationId);
    
    /**
     * Find all guidelines associated with a specific conversation
     */
    List<RagArtifact> findByConversationIdAndArtifactType(UUID conversationId, RagArtifact.ArtifactType artifactType);
    
    /**
     * Delete all artifacts associated with a specific conversation
     */
    @Modifying
    @Query("DELETE FROM RagArtifact ra WHERE ra.conversationId = :conversationId")
    void deleteByConversationId(@Param("conversationId") UUID conversationId);
} 