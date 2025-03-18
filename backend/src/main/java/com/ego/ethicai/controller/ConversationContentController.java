package com.ego.ethicai.controller;

import com.ego.ethicai.dto.ConversationContentRequestDTO;
import com.ego.ethicai.dto.ConversationContentResponseDTO;
import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.ConversationContent;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.ConversationContentService;
import com.ego.ethicai.service.ConversationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/conversation")
public class ConversationContentController {

    @Autowired
    private ConversationContentService conversationContentService;

    @Autowired
    private ConversationService conversationService;

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

        // Get AI response (this will be replaced with actual AI integration)
        String agentResponse = getAIResponse(request.getUserQuery(), conversation);

        // Save the message
        conversationContentService.saveMessage(
            conversation.getId(),
            request.getUserQuery(),
            agentResponse
        );

        // Return the response
        ConversationContentResponseDTO responseDTO = new ConversationContentResponseDTO(
                conversation.getId(),
                request.getUserQuery(),
                agentResponse,
                LocalDateTime.now()
        );

        return ResponseEntity.ok(responseDTO);
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

    // Placeholder method for AI integration (replace with real AI call)
    private String getAIResponse(String userQuery, Conversation conversation) {
        // TODO: Integrate with actual AI service
        return "This is a placeholder response for: " + userQuery;
    }
}
