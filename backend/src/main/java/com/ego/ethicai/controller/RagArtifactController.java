package com.ego.ethicai.controller;

import com.ego.ethicai.dto.RagArtifactsRequestDTO;
import com.ego.ethicai.dto.RagArtifactsResponseDTO;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.RagArtifactService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")  // Class-level security
public class RagArtifactController {

    private final RagArtifactService ragArtifactService;

    /**
     * Save RAG artifacts for a conversation
     *
     * @param request DTO containing artifacts to save
     * @return Response DTO with saved artifacts
     */
    @PostMapping("/rag-artifacts")
    public ResponseEntity<RagArtifactsResponseDTO> saveArtifacts(
            @RequestBody RagArtifactsRequestDTO request,
            @CurrentUser CustomUserDetails currentUser) {
        try {
            if (request == null || request.getConversationId() == null || request.getConversationId().isEmpty()) {
                log.warn("Invalid request or conversation ID provided");
                return ResponseEntity.ok(RagArtifactsResponseDTO.builder()
                        .guidelines(List.of())
                        .caseStudies(List.of())
                        .build());
            }
            
            log.info("Saving RAG artifacts for conversation: {} by user: {}", 
                    request.getConversationId(), currentUser.getEmail());
            
            // Validate conversation ID format
            String conversationId = request.getConversationId();
            try {
                UUID.fromString(conversationId);
                log.debug("Valid UUID format for conversation ID: {}", conversationId);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid UUID format for conversation ID: {}", conversationId);
                log.debug("UUID validation error: {}", e.getMessage());
                // We'll attempt to save anyway, let the service handle it
            }
            
            try {
                RagArtifactsResponseDTO response = ragArtifactService.saveArtifacts(request);
                log.info("Successfully saved RAG artifacts for conversation: {}", request.getConversationId());
                return ResponseEntity.ok(response);
            } catch (Exception e) {
                log.error("Service error saving RAG artifacts for conversation {}: {}", 
                        request.getConversationId(), e.getMessage(), e);
                
                // Return empty response instead of error
                return ResponseEntity.ok(RagArtifactsResponseDTO.builder()
                        .conversationId(request.getConversationId())
                        .guidelines(List.of())
                        .caseStudies(List.of())
                        .build());
            }
        } catch (Exception e) {
            log.error("Unexpected error saving RAG artifacts: {}", e.getMessage(), e);
            
            // Return empty response 
            String conversationId = request != null ? request.getConversationId() : null;
            return ResponseEntity.ok(RagArtifactsResponseDTO.builder()
                    .conversationId(conversationId)
                    .guidelines(List.of())
                    .caseStudies(List.of())
                    .build());
        }
    }

    /**
     * Get RAG artifacts for a conversation
     *
     * @param conversationId ID of the conversation
     * @return Response DTO with artifacts
     */
    @GetMapping("/knowledge-artifacts/{conversationId}")
    public ResponseEntity<RagArtifactsResponseDTO> getArtifacts(
            @PathVariable String conversationId,
            @CurrentUser CustomUserDetails currentUser) {
        final String operationId = UUID.randomUUID().toString().substring(0, 8);
        log.info("[GetArtifactsController-{}] START - Received request for conversation: {} by user: {}", 
                 operationId, conversationId, currentUser.getEmail());
        
        if (conversationId == null || conversationId.isEmpty()) {
            log.warn("[GetArtifactsController-{}] WARN - Invalid conversation ID provided: null or empty", operationId);
            // Return 400 Bad Request for invalid input - empty body or simple error DTO
            return ResponseEntity.badRequest().build(); // Or return a DTO with just the ID if needed
        }
        
        // Convert string to UUID, handling potential format issues
        UUID conversationUuid;
        try {
            conversationUuid = UUID.fromString(conversationId);
            log.info("[GetArtifactsController-{}] Parsed conversation ID to UUID: {}", operationId, conversationUuid);
        } catch (IllegalArgumentException e) {
            log.warn("[GetArtifactsController-{}] WARN - Could not convert conversation ID to UUID: {}", operationId, conversationId);
            // Return 400 Bad Request for invalid UUID format
             return ResponseEntity.badRequest().build(); // Or return a DTO with just the ID if needed
        }
        
        try {
            log.info("[GetArtifactsController-{}] Calling RagArtifactService.getArtifacts for UUID: {}", operationId, conversationUuid);
            List<RagArtifactsResponseDTO> serviceResponse = ragArtifactService.getArtifacts(conversationUuid);
            
            // Log the raw service response IMMEDIATELY
            if (serviceResponse == null) {
                 log.warn("[GetArtifactsController-{}] WARN - RagArtifactService returned null for UUID: {}", operationId, conversationUuid);
                 // Treat null response as not found
                 return ResponseEntity.notFound().build();
            } else {
                 log.info("[GetArtifactsController-{}] RagArtifactService returned list of size {} for UUID: {}", 
                          operationId, serviceResponse.size(), conversationUuid);
            }
            
            // Check if the list is empty or the DTO inside indicates no data was found
            // The service now returns a list containing one DTO, even if empty, so check the content
            if (serviceResponse.isEmpty() || 
               (serviceResponse.get(0).getGuidelines().isEmpty() && serviceResponse.get(0).getCaseStudies().isEmpty())) {
                
                log.info("[GetArtifactsController-{}] No artifacts found by service for conversation UUID: {}. Returning 404.", 
                         operationId, conversationUuid);
                // Return 404 Not Found if service explicitly returned empty
                return ResponseEntity.notFound().build(); 
            }
            
            // If we have data, return it
            RagArtifactsResponseDTO responseData = serviceResponse.get(0); // Assuming service returns list of 1
            log.info("[GetArtifactsController-{}] SUCCESS - Returning {} guidelines and {} case studies for conversation UUID: {}", 
                     operationId, responseData.getGuidelines().size(), responseData.getCaseStudies().size(), conversationUuid);
            return ResponseEntity.ok(responseData);
            
        } catch (Exception e) {
            log.error("[GetArtifactsController-{}] SERVICE ERROR - Error calling RagArtifactService for conversation {}: {}", 
                      operationId, conversationId, e.getMessage(), e);
            // Return 500 Internal Server Error for service layer exceptions
            // Consider sending a generic error response without sensitive details
            return ResponseEntity.internalServerError().build(); 
        }
    }

    /**
     * Delete RAG artifacts for a conversation
     *
     * @param conversationId ID of the conversation
     * @return Response entity
     */
    @DeleteMapping("/knowledge-artifacts/{conversationId}")
    public ResponseEntity<Void> deleteArtifacts(
            @PathVariable UUID conversationId,
            @CurrentUser CustomUserDetails currentUser) {
        try {
            log.info("Deleting RAG artifacts for conversation: {} by user: {}", 
                    conversationId, currentUser.getEmail());
            ragArtifactService.deleteArtifacts(conversationId);
            log.info("Successfully deleted RAG artifacts for conversation: {}", conversationId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Error deleting RAG artifacts for conversation {}: {}", conversationId, e.getMessage(), e);
            throw e;
        }
    }
} 