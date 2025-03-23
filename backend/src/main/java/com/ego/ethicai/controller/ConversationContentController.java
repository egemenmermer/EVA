package com.ego.ethicai.controller;

import com.ego.ethicai.dto.AIRequestDTO;
import com.ego.ethicai.dto.AIResponseDTO;
import com.ego.ethicai.dto.ConversationContentRequestDTO;
import com.ego.ethicai.dto.ConversationContentResponseDTO;
import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.ConversationContent;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.AIService;
import com.ego.ethicai.service.ConversationContentService;
import com.ego.ethicai.service.ConversationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/conversation")
public class ConversationContentController {
    
    private static final Logger logger = LoggerFactory.getLogger(ConversationContentController.class);

    @Autowired
    private ConversationContentService conversationContentService;

    @Autowired
    private ConversationService conversationService;

    @Autowired
    private AIService aiService;

    @PostMapping("/message")
    public ResponseEntity<ConversationContentResponseDTO> createMessage(
            @CurrentUser CustomUserDetails currentUser,
            @RequestBody ConversationContentRequestDTO request) {

        // Verify conversation exists and belongs to the current user
        Conversation conversation = conversationService.getConversationEntityById(request.getConversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        if (!conversation.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized access to conversation");
        }

        try {
            // Get AI response using AIService
            AIRequestDTO aiRequest = new AIRequestDTO(
                conversation.getManagerType(),
                request.getUserQuery(),
                conversation.getId()
            );
            
            logger.debug("Requesting AI response for query: {} with manager type: {}", 
                request.getUserQuery(), conversation.getManagerType());
            
            AIResponseDTO aiResponse = aiService.getAIResponse(aiRequest);

            // Save both user query and AI response
            conversationContentService.saveMessage(
                conversation.getId(),
                request.getUserQuery(),
                aiResponse.getAgentResponse()
            );

            // Return the response
            return ResponseEntity.ok(new ConversationContentResponseDTO(
                conversation.getId(),
                request.getUserQuery(),
                aiResponse.getAgentResponse(),
                LocalDateTime.now()
            ));

        } catch (Exception e) {
            logger.error("Error processing message: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process message: " + e.getMessage());
        }
    }

    @GetMapping("/message/{conversationId}")
    public ResponseEntity<List<ConversationContentResponseDTO>> getAllMessagesInConversation(
            @CurrentUser CustomUserDetails currentUser,
            @PathVariable UUID conversationId) {

        Conversation conversation = conversationService.getConversationEntityById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        if (!conversation.getUser().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Unauthorized access to conversation");
        }

        List<ConversationContent> conversationContents = conversationContentService.getMessages(conversation.getId(), currentUser.getId());

        List<ConversationContentResponseDTO> responseDTOs = conversationContents.stream()
                .map(this::mapToResponseDTO)
                .toList();

        return ResponseEntity.ok(responseDTOs);
    }

    private ConversationContentResponseDTO mapToResponseDTO(ConversationContent conversationContent) {
        return new ConversationContentResponseDTO(
                conversationContent.getConversation().getId(),
                conversationContent.getUserQuery(),
                conversationContent.getAgentResponse(),
                conversationContent.getCreatedAt()
        );
    }
}
