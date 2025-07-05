package com.ego.ethicai.controller;

import com.ego.ethicai.dto.AIRequestDTO;
import com.ego.ethicai.dto.AIResponseDTO;
import com.ego.ethicai.dto.ConversationContentRequestDTO;
import com.ego.ethicai.dto.ConversationContentResponseDTO;
import com.ego.ethicai.dto.agent.AgentArtifactResponseDTO;
import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.ConversationContent;
import com.ego.ethicai.repository.ConversationContentRepository;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.AIService;
import com.ego.ethicai.service.AgentServiceClient;
import com.ego.ethicai.service.ConversationContentService;
import com.ego.ethicai.service.ConversationService;
import com.ego.ethicai.service.RagArtifactService;
import com.ego.ethicai.dto.SaveMessageRequestDTO;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/conversation")
@RequiredArgsConstructor
public class ConversationContentController {
    
    private static final Logger logger = LoggerFactory.getLogger(ConversationContentController.class);

    private final ConversationContentService conversationContentService;
    private final ConversationContentRepository conversationContentRepository;
    private final ConversationService conversationService;
    private final AIService aiService;
    private final AgentServiceClient agentServiceClient;
    private final RagArtifactService ragArtifactService;

    @PostMapping("/message")
    public ResponseEntity<ConversationContentResponseDTO> createMessage(
            @CurrentUser CustomUserDetails currentUser,
            @RequestBody ConversationContentRequestDTO request) {

        logger.debug("createMessage endpoint hit for conversationId: {} by user: {}", request.getConversationId(), currentUser.getEmail());

        // Get conversation (might be newly created or existing)
        Conversation conversation = conversationService.getConversationEntityById(request.getConversationId())
                .orElseThrow(() -> {
                    logger.error("Conversation not found with ID: {}", request.getConversationId());
                    return new RuntimeException("Conversation not found");
                });

        if (!conversation.getUser().getId().equals(currentUser.getId())) {
            logger.warn("Unauthorized access attempt to conversation {} by user {}", conversation.getId(), currentUser.getEmail());
            throw new RuntimeException("Unauthorized access to conversation");
        }

        // Check if this is the first message and title needs updating
        boolean isFirstMessage = false;
        try {
            List<ConversationContent> existingContent = conversationContentRepository.findByConversation(conversation);
            isFirstMessage = existingContent.isEmpty();
            logger.debug("Conversation {} - Is first message? {}", conversation.getId(), isFirstMessage);

            if (isFirstMessage && "New conversation".equals(conversation.getTitle())) {
                logger.info("Updating title for conversation {} with first query: '{}'...", conversation.getId(), request.getUserQuery().substring(0, Math.min(request.getUserQuery().length(), 30)));
                // Update the title using the conversation service
                // We pass the first user query as the new title
                // Truncate title if needed
                String newTitle = request.getUserQuery();
                if (newTitle.length() > 100) { // Example max length
                    newTitle = newTitle.substring(0, 97) + "...";
                }
                conversationService.updateConversationTitle(conversation.getId(), currentUser.getId(), newTitle);
                logger.info("Successfully updated title for conversation {}", conversation.getId());
                // Refresh conversation object in case the service returns updated one (though current service might not)
                 conversation = conversationService.getConversationEntityById(request.getConversationId()).orElse(conversation); // Re-fetch or keep old
            }
        } catch (Exception titleUpdateEx) {
            logger.error("Failed to check existing content or update title for conversation {}: {}", conversation.getId(), titleUpdateEx.getMessage(), titleUpdateEx);
            // Proceed without title update if it fails
        }

        logger.debug("Requesting AI response for query: '{}' with manager type: {}", 
            request.getUserQuery(), conversation.getManagerType());

        String agentResponseContent = "Error: Could not get response from AI."; // Default error response
        boolean success = false;

        try {
            // Extract history parameters from request
            Boolean includeHistory = request.getIncludeHistory();
            Integer historyLimit = request.getHistoryLimit();
            
            logger.debug("History parameters from request - includeHistory: {}, historyLimit: {}", 
                    includeHistory, historyLimit);
                    
            // Build request with history parameters
            AIRequestDTO aiRequest = new AIRequestDTO(
                conversation.getManagerType(),
                request.getUserQuery(),
                conversation.getId()
            );
            
            // Set history parameters if provided
            aiRequest.setIncludeHistory(includeHistory);
            aiRequest.setHistoryLimit(historyLimit);
            
            // Get AI response with history context
            AIResponseDTO aiResponse = aiService.getAIResponse(aiRequest);

            if (aiResponse != null && aiResponse.getAgentResponse() != null && !aiResponse.getAgentResponse().isEmpty()) {
                agentResponseContent = aiResponse.getAgentResponse();
                logger.debug("Received AI response successfully: '{}'...", agentResponseContent.substring(0, Math.min(agentResponseContent.length(), 50)));
                
                // Save both user query and AI response *only if AI response was successful*
                try {
                    conversationContentService.saveMessage(
                        conversation.getId(),
                        request.getUserQuery(),
                        agentResponseContent
                    );
                    logger.info("Successfully saved user query and AI response for conversation {}", conversation.getId());
                    success = true;
                } catch (Exception saveEx) {
                    logger.error("Failed to save message to database for conversation {}: {}", conversation.getId(), saveEx.getMessage(), saveEx);
                    agentResponseContent = "Error: Could not save message after getting AI response."; // Update error message
                }
            } else {
                logger.error("Received null or empty response from AI service for conversation {}", conversation.getId());
            }

        } catch (Exception aiEx) {
            logger.error("Error calling AI service for conversation {}: {}", conversation.getId(), aiEx.getMessage(), aiEx);
            // Keep the default error message
        }

        // Always return a response DTO, indicating success or failure in the content
        // Populate all fields the frontend expects
        ConversationContentResponseDTO responseDto = ConversationContentResponseDTO.builder()
            .id(UUID.randomUUID().toString()) // Generate a temporary ID for the response message
            .conversationId(conversation.getId().toString())
            .userQuery(request.getUserQuery()) // Include the user query in the response
            .agentResponse(agentResponseContent) // The actual AI response or an error message
            .content(agentResponseContent) // Populate content field for frontend
            .role("assistant") // This DTO represents the assistant's part of the exchange
            .createdAt(LocalDateTime.now().toString())
            .build();

        // Return 200 OK even if AI failed, but the error is in the content
        return ResponseEntity.ok(responseDto);
    }

    /**
     * NEW Endpoint: Specifically for the Agent to save a pre-generated message pair.
     */
    @PostMapping("/message/save")
    public ResponseEntity<Void> saveAgentMessage(
            @CurrentUser CustomUserDetails currentUser,
            @RequestBody SaveMessageRequestDTO request) {
                
        logger.info("saveAgentMessage endpoint hit for conversationId: {} with role: {} by user: {}", 
                   request.getConversationId(), request.getRole(), currentUser.getEmail());

        try {
            // Validate required fields
            if (request.getConversationId() == null || 
                request.getContent() == null || request.getContent().isEmpty() ||
                request.getRole() == null || request.getRole().isEmpty()) {
                logger.warn("Missing required fields in SaveMessageRequestDTO for conversation {}", request.getConversationId());
                return ResponseEntity.badRequest().build();
            }
            
            Conversation conversation = conversationService.getConversationEntityById(request.getConversationId())
                    .orElseThrow(() -> new RuntimeException("Conversation not found"));

            // Authorization check: Ensure conversation belongs to the logged-in user
            if (!conversation.getUser().getId().equals(currentUser.getId())) {
                logger.warn("Unauthorized attempt to save message to conversation {} by user {}", 
                           request.getConversationId(), currentUser.getEmail());
                return ResponseEntity.status(403).build(); // Forbidden
            }

            boolean messageSavedOrUpdated = false;

            if ("user".equalsIgnoreCase(request.getRole())) {
                // --- Title Update Logic --- 
                try {
                    long messageCount = conversationContentRepository.countByConversationId(conversation.getId());
                    logger.debug("Existing message count for conversation {}: {}", conversation.getId(), messageCount);
                    
                    if (messageCount == 0) { 
                         logger.info("First message for conversation {}. Updating title with query: '{}'...", conversation.getId(), request.getContent().substring(0, Math.min(request.getContent().length(), 30)));
                         String newTitle = request.getContent();
                         if (newTitle.length() > 100) { 
                             newTitle = newTitle.substring(0, 97) + "...";
                         }
                         conversationService.updateConversationTitle(conversation.getId(), currentUser.getId(), newTitle);
                         logger.info("Successfully updated title for conversation {}", conversation.getId());
                    } else {
                         logger.debug("Skipping title update for conversation {}. Message count: {}", 
                                      conversation.getId(), messageCount);
                    }
                } catch (Exception titleUpdateEx) {
                     logger.error("Error checking message count or updating title for conversation {}: {}", conversation.getId(), titleUpdateEx.getMessage(), titleUpdateEx);
                }
                // --- End Title Update --- 

                // Save the user message
                conversationContentService.saveMessage(conversation.getId(), request.getContent(), null);
                messageSavedOrUpdated = true;
                logger.info("Saved new user message content for conversation {}", conversation.getId());

            } else if ("assistant".equalsIgnoreCase(request.getRole())) {
                 // Try to update the last message entry if it was just a user query
                 List<ConversationContent> existing = conversationContentRepository.findByConversationIdOrderByCreatedAtDesc(request.getConversationId());
                 if (!existing.isEmpty()) {
                     ConversationContent lastEntry = existing.get(0); // Get the latest entry
                     if (lastEntry.getUserQuery() != null && lastEntry.getAgentResponse() == null) {
                         lastEntry.setAgentResponse(request.getContent());
                         conversationContentRepository.save(lastEntry);
                         messageSavedOrUpdated = true;
                         logger.info("Updated existing message pair with assistant response for conversation {}", request.getConversationId());
                     } else {
                         logger.warn("Could not find matching user query to update for assistant response. Creating new entry with null userQuery for conv: {}", request.getConversationId());
                         // Create a new message entry with null userQuery
                         conversationContentService.saveMessage(conversation.getId(), "", request.getContent());
                         messageSavedOrUpdated = true;
                         logger.info("Created new entry with null userQuery for assistant response in conversation {}", request.getConversationId());
                     }
                 } else {
                      logger.warn("No prior messages found for conversation {}. Creating new entry with empty user query.", request.getConversationId());
                      // Create a new entry with empty user query
                      conversationContentService.saveMessage(conversation.getId(), "", request.getContent());
                      messageSavedOrUpdated = true;
                      logger.info("Created new entry with empty user query for assistant response in conversation {}", request.getConversationId());
                 }
            } else {
                logger.warn("Invalid role provided in SaveMessageRequestDTO: {}", request.getRole());
                return ResponseEntity.badRequest().build();
            }
            
            // Determine response status based on whether action was taken
            if (messageSavedOrUpdated) {
                 return ResponseEntity.status(201).build(); // 201 Created or 200 OK if updated
            } else {
                 // This might happen if assistant message arrived without a user query pair
                 logger.info("No save/update action taken for request (role: {}) on conversation {}", request.getRole(), request.getConversationId());
                 return ResponseEntity.ok().build(); // Return 200 OK as the request was processed, even if no DB change
            }

        } catch (RuntimeException e) {
            logger.error("Error saving agent message for conversation {}: {}", request.getConversationId(), e.getMessage(), e);
            // Distinguish between not found and other errors if needed
            if (e.getMessage() != null && e.getMessage().contains("Conversation not found")) {
                 return ResponseEntity.status(404).build(); // Not Found
            }
            return ResponseEntity.internalServerError().build();
        } catch (Exception e) {
            logger.error("Unexpected error saving agent message for conversation {}: {}", request.getConversationId(), e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    private List<ConversationContentResponseDTO> mapToResponseDTO(ConversationContent conversationContent) {
        List<ConversationContentResponseDTO> messages = new ArrayList<>();
        
        // Add user message representation if userQuery exists
        if (conversationContent.getUserQuery() != null && !conversationContent.getUserQuery().isEmpty()) {
            messages.add(ConversationContentResponseDTO.builder()
                    .id(conversationContent.getId().toString() + "-user") // Adjust ID slightly
                    .conversationId(conversationContent.getConversation().getId().toString())
                    .role("user")
                    .content(conversationContent.getUserQuery())
                    .userQuery(conversationContent.getUserQuery())
                    .createdAt(conversationContent.getCreatedAt().toString())
                    .build());
        }
        
        // Add assistant message representation if agentResponse exists
        if (conversationContent.getAgentResponse() != null && !conversationContent.getAgentResponse().isEmpty()) {
            messages.add(ConversationContentResponseDTO.builder()
                    .id(conversationContent.getId().toString() + "-assistant") // Adjust ID slightly
                    .conversationId(conversationContent.getConversation().getId().toString())
                    .role("assistant")
                    .content(conversationContent.getAgentResponse())
                    .agentResponse(conversationContent.getAgentResponse())
                    // Use the same timestamp as the user query for the pair
                    .createdAt(conversationContent.getCreatedAt().toString()) 
                    .build());
        }
        
        return messages;
    }

    @GetMapping("/message/{conversationId}")
    public ResponseEntity<List<ConversationContentResponseDTO>> getAllMessagesInConversation(
            @CurrentUser CustomUserDetails currentUser,
            @PathVariable UUID conversationId) {

        logger.debug("getAllMessagesInConversation endpoint hit for conversationId: {} by user: {}", conversationId, currentUser.getEmail());

        Conversation conversation = conversationService.getConversationEntityById(conversationId)
                .orElseThrow(() -> {
                     logger.error("Conversation not found in getAllMessages: {}", conversationId);
                     return new RuntimeException("Conversation not found");
                });

        if (!conversation.getUser().getId().equals(currentUser.getId())) {
             logger.warn("Unauthorized access attempt in getAllMessages for conversation {} by user {}", conversationId, currentUser.getEmail());
            throw new RuntimeException("Unauthorized access to conversation");
        }

        List<ConversationContent> conversationContents;
        try {
            conversationContents = conversationContentService.getMessages(conversation.getId(), currentUser.getId());
            logger.info("Retrieved {} ConversationContent entities from database for conversation {}", conversationContents.size(), conversationId);
        } catch (Exception e) {
             logger.error("Error retrieving messages from service for conversation {}: {}", conversationId, e.getMessage(), e);
             // Return an empty list or appropriate error response
             return ResponseEntity.ok(Collections.emptyList()); // Return empty list on error
        }

        if (conversationContents.isEmpty()) {
             logger.info("No messages found in database for conversation {}, returning empty list.", conversationId);
             return ResponseEntity.ok(Collections.emptyList());
        }

        List<ConversationContentResponseDTO> responseDTOs = conversationContents.stream()
                .flatMap(content -> mapToResponseDTO(content).stream()) // Use the existing mapToResponseDTO which creates user/assistant pairs
                .sorted(Comparator.comparing(ConversationContentResponseDTO::getCreatedAt)) // Sort messages by creation time
                .collect(Collectors.toList());

        logger.info("Returning {} formatted messages for conversation {}", responseDTOs.size(), conversationId);
        return ResponseEntity.ok(responseDTOs);
    }
}
