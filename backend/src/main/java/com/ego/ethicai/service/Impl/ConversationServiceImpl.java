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
import com.ego.ethicai.dto.request.ConversationCreationRequest;

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
    public ConversationResponseDTO startConversation(ConversationCreationRequest request) {
        User user = userService.findById(request.getUserId()).orElseThrow(
                () -> new RuntimeException("User not found with ID: " + request.getUserId()));

        if (request.getManagerType() == null) {
            throw new RuntimeException("Manager type is required in the request");
        }

        Conversation conversation = new Conversation();
        conversation.setUser(user);
        conversation.setManagerType(request.getManagerType());
        conversation.setCreatedAt(LocalDateTime.now());

        String title = request.getTitle();
        if (title != null && !title.trim().isEmpty()) {
            log.info("Using provided title: {}", title);
            conversation.setTitle(title);
        } else {
            String defaultTitle = "Chat on " + LocalDateTime.now().toLocalDate().toString();
            log.info("No title provided, using default: {}", defaultTitle);
            conversation.setTitle(defaultTitle);
        }

        Conversation savedConversation = conversationRepository.save(conversation);
        log.info("Saved new conversation with ID: {} and Title: {}", savedConversation.getId(), savedConversation.getTitle());

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
        
        if (!conversation.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to conversation");
        }
        
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
        
        if (!conversationRepository.existsById(conversationId)) {
            log.warn("[DELETE-{}] Conversation not found. Cannot delete.", conversationId);
            throw new EntityNotFoundException("Conversation not found with id: " + conversationId);
        }
        log.debug("[DELETE-{}] Conversation found. Proceeding with deletion.", conversationId);
        
        try {
            log.info("[DELETE-{}] Attempting to delete associated conversation content...", conversationId);
            conversationContentRepository.deleteByConversationId(conversationId);
            log.info("[DELETE-{}] Successfully deleted associated conversation content.", conversationId);
        } catch (Exception e) {
            log.error("[DELETE-{}] Error deleting conversation content: {}", conversationId, e.getMessage(), e);
            throw new RuntimeException("Failed to delete conversation content for id: " + conversationId, e);
        }

        try {
            log.info("[DELETE-{}] Attempting to delete associated practice scores...", conversationId);
            practiceScoreRepository.deleteByConversationId(conversationId);
            log.info("[DELETE-{}] Successfully deleted associated practice scores.", conversationId);
        } catch (Exception e) {
            log.error("[DELETE-{}] Error deleting practice scores: {}", conversationId, e.getMessage(), e);
            throw new RuntimeException("Failed to delete practice scores for id: " + conversationId, e);
        }
        
        log.info("[DELETE-{}] Reached point right before attempting RAG artifact deletion.", conversationId); 

        try {
            log.info("[DELETE-{}] Attempting to delete associated RAG artifacts...", conversationId);
            ragArtifactRepository.deleteByConversationId(conversationId);
            log.info("[DELETE-{}] Successfully deleted associated RAG artifacts.", conversationId);
        } catch (Exception e) {
            log.error("[DELETE-{}] Error deleting RAG artifacts: {}", conversationId, e.getMessage(), e);
            throw new RuntimeException("Failed to delete RAG artifacts for id: " + conversationId, e);
        }

        try {
            log.info("[DELETE-{}] Attempting to delete conversation entity...", conversationId);
            conversationRepository.deleteById(conversationId);
            log.info("[DELETE-{}] Successfully deleted conversation entity.", conversationId);
        } catch (Exception e) {
             log.error("[DELETE-{}] Error deleting conversation entity: {}", conversationId, e.getMessage(), e);
             throw new RuntimeException("Failed to delete conversation entity with id: " + conversationId, e);
        }
        
        log.info("[DELETE-{}] Conversation deletion process completed successfully.", conversationId);
    }
}
