package com.ego.ethicai.repository;

import com.ego.ethicai.entity.RagArtifact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RagArtifactRepository extends JpaRepository<RagArtifact, Long> {
    
    /**
     * Find all artifacts associated with a specific conversation
     */
    List<RagArtifact> findByConversationId(String conversationId);
    
    /**
     * Find all guidelines associated with a specific conversation
     */
    List<RagArtifact> findByConversationIdAndArtifactType(String conversationId, RagArtifact.ArtifactType artifactType);
    
    /**
     * Delete all artifacts associated with a specific conversation
     */
    void deleteByConversationId(String conversationId);
} 