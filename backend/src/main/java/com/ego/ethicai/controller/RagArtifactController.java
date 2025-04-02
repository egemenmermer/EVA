package com.ego.ethicai.controller;

import com.ego.ethicai.dto.RagArtifactsRequestDTO;
import com.ego.ethicai.dto.RagArtifactsResponseDTO;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.security.CurrentUser;
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
            @CurrentUser User currentUser) {
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
            @CurrentUser User currentUser) {
        try {
            log.info("Retrieving RAG artifacts for conversation: {} by user: {}", 
                    conversationId, currentUser.getEmail());
            
            if (conversationId == null || conversationId.isEmpty()) {
                log.warn("Invalid conversation ID provided: null or empty");
                return ResponseEntity.ok(RagArtifactsResponseDTO.builder()
                        .guidelines(List.of())
                        .caseStudies(List.of())
                        .build());
            }
            
            // Convert string to UUID, handling potential format issues
            UUID conversationUuid;
            try {
                conversationUuid = UUID.fromString(conversationId);
                log.debug("Successfully converted conversation ID to UUID: {}", conversationUuid);
            } catch (IllegalArgumentException e) {
                log.warn("Could not convert conversation ID to UUID: {}", conversationId);
                log.debug("UUID conversion error: {}", e.getMessage());
                // Return empty response for invalid UUID
                return ResponseEntity.ok(RagArtifactsResponseDTO.builder()
                        .conversationId(conversationId)
                        .guidelines(List.of())
                        .caseStudies(List.of())
                        .build());
            }
            
            try {
                List<RagArtifactsResponseDTO> response = ragArtifactService.getArtifacts(conversationUuid);
                
                if (response.isEmpty()) {
                    log.info("No artifacts found for conversation: {}", conversationId);
                    return ResponseEntity.ok(RagArtifactsResponseDTO.builder()
                            .conversationId(conversationId)
                            .guidelines(List.of())
                            .caseStudies(List.of())
                            .build());
                }
                
                log.info("Successfully retrieved RAG artifacts for conversation: {}", conversationId);
                return ResponseEntity.ok(response.get(0));
            } catch (Exception e) {
                log.error("Service error retrieving RAG artifacts for conversation {}: {}", 
                        conversationId, e.getMessage(), e);
                // Return empty collection instead of error to allow frontend to continue
                return ResponseEntity.ok(RagArtifactsResponseDTO.builder()
                        .conversationId(conversationId)
                        .guidelines(List.of())
                        .caseStudies(List.of())
                        .build());
            }
        } catch (Exception e) {
            log.error("Unexpected error retrieving RAG artifacts for conversation {}: {}", 
                    conversationId, e.getMessage(), e);
            // Return empty collection instead of error to allow frontend to continue
            return ResponseEntity.ok(RagArtifactsResponseDTO.builder()
                    .conversationId(conversationId)
                    .guidelines(List.of())
                    .caseStudies(List.of())
                    .build());
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
            @CurrentUser User currentUser) {
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