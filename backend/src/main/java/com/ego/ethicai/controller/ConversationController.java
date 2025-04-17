package com.ego.ethicai.controller;

import com.ego.ethicai.dto.ConversationRequestDTO;
import com.ego.ethicai.dto.ConversationResponseDTO;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.ConversationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.persistence.EntityNotFoundException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/conversation")
public class ConversationController {

    private static final Logger logger = LoggerFactory.getLogger(ConversationController.class);

    @Autowired
    private ConversationService conversationService;
    
    /**
     * Get all conversations for the current user - this is the main endpoint used by the frontend
     */
    @GetMapping
    public ResponseEntity<List<ConversationResponseDTO>> getAllConversations(
            @CurrentUser CustomUserDetails currentUser) {
        logger.info("Getting all conversations for user: {}", currentUser.getEmail());
        List<ConversationResponseDTO> conversations = conversationService.getUserConversations(currentUser.getId());
        return ResponseEntity.ok(conversations);
    }

    @PostMapping
    public ResponseEntity<ConversationResponseDTO> createConversation(
            @CurrentUser CustomUserDetails currentUser,
            @RequestBody ConversationRequestDTO conversationRequestDTO) {
        logger.info("Creating conversation with manager type: {} for user: {}", 
                   conversationRequestDTO.getManagerType(), currentUser.getEmail());
        ConversationResponseDTO response = conversationService.startConversation(
            currentUser.getId(), conversationRequestDTO.getManagerType());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationResponseDTO> getConversationById(
            @CurrentUser CustomUserDetails currentUser,
            @PathVariable UUID id) {
        logger.info("Getting conversation with ID: {} for user: {}", id, currentUser.getEmail());
        ConversationResponseDTO response = conversationService.getConversationById(id)
            .orElseThrow(() -> new RuntimeException("Conversation not found"));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<List<ConversationResponseDTO>> getConversationsByUserId(
            @PathVariable UUID id) {
        logger.info("Getting conversations for user ID: {}", id);
        List<ConversationResponseDTO> response = conversationService.getUserConversations(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/update-title")
    public ResponseEntity<ConversationResponseDTO> updateConversationTitle(
            @CurrentUser CustomUserDetails currentUser,
            @PathVariable UUID id,
            @RequestBody UpdateTitleRequest updateTitleRequest) {
        logger.info("Updating title for conversation: {} to: {}", id, updateTitleRequest.getTitle());
        ConversationResponseDTO response = conversationService.updateConversationTitle(
            id, currentUser.getId(), updateTitleRequest.getTitle());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(
            @CurrentUser CustomUserDetails currentUser,
            @PathVariable UUID id) {
        logger.info("Deleting conversation with ID: {} for user: {}", id, currentUser.getEmail());
        try {
            // Optional: Add ownership check here before deleting
            // boolean ownsConversation = conversationService.checkOwnership(id, currentUser.getId());
            // if (!ownsConversation) {
            //     logger.warn("User {} does not own conversation {}", currentUser.getEmail(), id);
            //     return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            // }
            
            conversationService.deleteConversation(id);
            logger.info("Successfully deleted conversation with ID: {}", id);
            // Return 204 No Content on successful deletion
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException e) {
            // Catch the specific exception from the service
            logger.warn("Conversation not found for deletion with ID: {}. Details: {}", id, e.getMessage());
            return ResponseEntity.notFound().build(); // Return 404 Not Found
        } catch (EmptyResultDataAccessException e) {
            // Keep this catch block in case other repository methods might throw it
            logger.warn("Data access exception (possibly not found) during deletion for ID: {}", id);
            return ResponseEntity.notFound().build(); // Return 404 Not Found
        } catch (RuntimeException e) { // Catch potential RuntimeException from service
            logger.error("Runtime error deleting conversation {}: {}", id, e.getMessage(), e);
            // Check if the cause was the EntityNotFoundException to ensure 404
            if (e.getCause() instanceof EntityNotFoundException || e instanceof EntityNotFoundException) {
                logger.warn("Conversation not found (runtime exception wrapper) for deletion with ID: {}", id);
                return ResponseEntity.notFound().build(); // Return 404
            }    
            return ResponseEntity.internalServerError().build(); // Return 500 otherwise
        } catch (Exception e) {
            // Catch other potential errors during deletion
            logger.error("General error deleting conversation {}: {}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().build(); // Return 500
        }
    }
    
    // Request class for updating conversation title
    public static class UpdateTitleRequest {
        private String title;
        
        public String getTitle() {
            return title;
        }
        
        public void setTitle(String title) {
            this.title = title;
        }
    }
}
