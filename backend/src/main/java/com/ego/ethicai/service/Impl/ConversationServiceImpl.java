package com.ego.ethicai.service.Impl;

import com.ego.ethicai.dto.ConversationResponseDTO;
import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.enums.ManagerTypes;
import com.ego.ethicai.repository.ConversationContentRepository;
import com.ego.ethicai.repository.ConversationRepository;
import com.ego.ethicai.repository.PracticeScoreRepository;
import com.ego.ethicai.repository.RagArtifactRepository;
import com.ego.ethicai.service.ConversationService;
import com.ego.ethicai.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationServiceImpl implements ConversationService {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private PracticeScoreRepository practiceScoreRepository;

    @Autowired
    private ConversationContentRepository conversationContentRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private RagArtifactRepository ragArtifactRepository;

    @Override
    public ConversationResponseDTO startConversation(UUID userId, ManagerTypes managerType) {
        User user = userService.findById(userId).orElseThrow(
                () -> new RuntimeException("User not found"));

        if (managerType == null) {
            throw new RuntimeException("Manager type is required");
        }

        Conversation conversation = new Conversation();
        conversation.setUser(user);
        conversation.setManagerType(managerType);
        conversation.setCreatedAt(LocalDateTime.now());
        conversation.setTitle("New conversation"); // Default title

        Conversation savedConversation = conversationRepository.save(conversation);

        return new ConversationResponseDTO(
                savedConversation.getId(),
                savedConversation.getUser().getId(),
                savedConversation.getTitle(),
                savedConversation.getManagerType(),
                savedConversation.getCreatedAt()
        );
    }

    @Override
    public Optional<ConversationResponseDTO> getConversationById(UUID conversationId) {
        return conversationRepository.findById(conversationId).map(conversation -> {
            return new ConversationResponseDTO(
                    conversation.getId(),
                    conversation.getUser().getId(),
                    conversation.getTitle(),
                    conversation.getManagerType(),
                    conversation.getCreatedAt()
            );
        });
    }

    @Override
    public Optional<Conversation> getConversationEntityById(UUID conversationId) {
        return conversationRepository.findById(conversationId);
    }

    @Override
    public List<ConversationResponseDTO> getUserConversations(UUID userId) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Conversation> conversations = conversationRepository.findByUser(user);

        return conversations.stream()
                .map(conversation -> new ConversationResponseDTO(
                        conversation.getId(),
                        conversation.getUser().getId(),
                        conversation.getTitle(),
                        conversation.getManagerType(),
                        conversation.getCreatedAt()
                ))
                .toList();
    }

    @Override
    public ConversationResponseDTO updateConversationTitle(UUID conversationId, UUID userId, String title) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        
        // Verify the conversation belongs to the user
        if (!conversation.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to conversation");
        }
        
        // Update the title
        conversation.setTitle(title);
        conversation.setUpdatedAt(LocalDateTime.now());
        
        Conversation updatedConversation = conversationRepository.save(conversation);
        
        return new ConversationResponseDTO(
                updatedConversation.getId(),
                updatedConversation.getUser().getId(),
                updatedConversation.getTitle(),
                updatedConversation.getManagerType(),
                updatedConversation.getCreatedAt()
        );
    }

    @Override
    @Transactional
    public void deleteConversation(UUID conversationId) {
        log.info("[DELETE-{}] Attempting to delete conversation", conversationId);
        
        // 1. Check if conversation exists first
        if (!conversationRepository.existsById(conversationId)) {
            log.warn("[DELETE-{}] Conversation not found. Cannot delete.", conversationId);
            throw new EntityNotFoundException("Conversation not found with id: " + conversationId);
        }
        log.debug("[DELETE-{}] Conversation found. Proceeding with deletion.", conversationId);
        
        // 2. Delete associated conversation content
        try {
            log.info("[DELETE-{}] Attempting to delete associated conversation content...", conversationId);
            conversationContentRepository.deleteByConversationId(conversationId);
            log.info("[DELETE-{}] Successfully deleted associated conversation content.", conversationId);
        } catch (Exception e) {
            log.error("[DELETE-{}] Error deleting conversation content: {}", conversationId, e.getMessage(), e);
            // Re-throwing to ensure transaction rollback if content deletion fails
            throw new RuntimeException("Failed to delete conversation content for id: " + conversationId, e);
        }

        // 3. Delete associated practice scores
        try {
            log.info("[DELETE-{}] Attempting to delete associated practice scores...", conversationId);
            practiceScoreRepository.deleteByConversationId(conversationId);
            log.info("[DELETE-{}] Successfully deleted associated practice scores.", conversationId);
        } catch (Exception e) {
            log.error("[DELETE-{}] Error deleting practice scores: {}", conversationId, e.getMessage(), e);
            // Re-throwing to ensure transaction rollback if score deletion fails
            throw new RuntimeException("Failed to delete practice scores for id: " + conversationId, e);
        }
        
        // ADDED: Log right before artifact deletion attempt
        log.info("[DELETE-{}] Reached point right before attempting RAG artifact deletion.", conversationId); 

        // 4. Delete associated RAG artifacts
        try {
            log.info("[DELETE-{}] Attempting to delete associated RAG artifacts...", conversationId);
            ragArtifactRepository.deleteByConversationId(conversationId);
            log.info("[DELETE-{}] Successfully deleted associated RAG artifacts.", conversationId);
        } catch (Exception e) {
            log.error("[DELETE-{}] Error deleting RAG artifacts: {}", conversationId, e.getMessage(), e);
            // Re-throwing to ensure transaction rollback if artifact deletion fails
            throw new RuntimeException("Failed to delete RAG artifacts for id: " + conversationId, e);
        }

        // 5. Now delete the conversation itself
        try {
            log.info("[DELETE-{}] Attempting to delete conversation entity...", conversationId);
            conversationRepository.deleteById(conversationId);
            log.info("[DELETE-{}] Successfully deleted conversation entity.", conversationId);
        } catch (Exception e) {
             log.error("[DELETE-{}] Error deleting conversation entity: {}", conversationId, e.getMessage(), e);
             // Re-throw to ensure transaction rollback if the main deletion fails
             throw new RuntimeException("Failed to delete conversation entity with id: " + conversationId, e);
        }
        
        log.info("[DELETE-{}] Conversation deletion process completed successfully.", conversationId);
    }
}
