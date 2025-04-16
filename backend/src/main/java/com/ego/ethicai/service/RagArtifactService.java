package com.ego.ethicai.service;

import com.ego.ethicai.dto.RagArtifactDTO;
import com.ego.ethicai.dto.RagArtifactsRequestDTO;
import com.ego.ethicai.dto.RagArtifactsResponseDTO;
import com.ego.ethicai.dto.agent.AgentArtifactItemDTO;
import com.ego.ethicai.dto.agent.AgentArtifactResponseDTO;
import com.ego.ethicai.entity.RagArtifact;
import com.ego.ethicai.repository.RagArtifactRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationAdapter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagArtifactService {

    private final RagArtifactRepository ragArtifactRepository;

    /**
     * Save RAG artifacts for a conversation
     *
     * @param request DTO containing artifacts to save
     * @return Response DTO with saved artifacts
     */
    @Transactional
    public RagArtifactsResponseDTO saveArtifacts(RagArtifactsRequestDTO request) {
        String conversationIdStr = request.getConversationId();
        UUID conversationUuid = null;
        final String operationId = UUID.randomUUID().toString().substring(0, 8); // Unique ID for this save operation
        
        try {
            log.info("[SaveArtifacts-{}] START - Processing request for conversation: {}", operationId, conversationIdStr);
            
            // Attempt to parse the String ID into a UUID
            try {
                conversationUuid = UUID.fromString(conversationIdStr);
                log.info("[SaveArtifacts-{}] Parsed conversation ID to UUID: {}", operationId, conversationUuid);
            } catch (IllegalArgumentException e) {
                log.error("[SaveArtifacts-{}] ERROR - Invalid UUID format for conversation ID: {}", operationId, conversationIdStr, e);
                // Return empty immediately if UUID is invalid, as we can't proceed
                return RagArtifactsResponseDTO.builder()
                        .conversationId(conversationIdStr)
                        .guidelines(List.of())
                        .caseStudies(List.of())
                        .build();
            }
            
            log.debug("[SaveArtifacts-{}] Request contains {} guidelines and {} case studies", operationId, 
                    request.getGuidelines() != null ? request.getGuidelines().size() : 0,
                    request.getCaseStudies() != null ? request.getCaseStudies().size() : 0);
            
            // Final UUID for use in lambda/inner class
            final UUID finalConversationUuid = conversationUuid;

            // Add transaction synchronization to log commit/rollback
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronizationAdapter() {
                @Override
                public void afterCompletion(int status) {
                    if (status == TransactionSynchronization.STATUS_COMMITTED) {
                        log.info("[SaveArtifacts-{}] Transaction COMMITTED for conversation: {}", operationId, finalConversationUuid);
                    } else if (status == TransactionSynchronization.STATUS_ROLLED_BACK) {
                        log.warn("[SaveArtifacts-{}] Transaction ROLLED BACK for conversation: {}", operationId, finalConversationUuid);
                    } else {
                        log.warn("[SaveArtifacts-{}] Transaction completed with UNKNOWN status ({}) for conversation: {}", operationId, status, finalConversationUuid);
                    }
                }
            });
            
            // First delete any existing artifacts for this conversation
            try {
                log.info("[SaveArtifacts-{}] Deleting existing artifacts for conversation: {}", operationId, conversationUuid);
                ragArtifactRepository.deleteByConversationId(conversationUuid);
                log.info("[SaveArtifacts-{}] Finished deleting existing artifacts for conversation: {}", operationId, conversationUuid);
            } catch (Exception e) {
                // Log delete error but continue, as save might still succeed
                log.warn("[SaveArtifacts-{}] WARN - Could not delete existing artifacts for conv {}: {}. Proceeding with save.", 
                         operationId, conversationUuid, e.getMessage());
            }
            
            List<RagArtifact> newArtifacts = new ArrayList<>();
            
            // Process guidelines (ensure conversationUuid is final or effectively final for lambda)
            if (request.getGuidelines() != null) {
                request.getGuidelines().forEach(guideline -> {
                    try {
                        if (guideline.getId() == null || guideline.getId().trim().isEmpty()) {
                            log.warn("[SaveArtifacts-{}] Skipping guideline with null/empty ID for conv: {}", operationId, finalConversationUuid);
                            return; // continue to next guideline in lambda
                        }
                        RagArtifact artifact = RagArtifact.builder()
                                .conversationId(finalConversationUuid) // Use final variable
                                .artifactType(RagArtifact.ArtifactType.GUIDELINE)
                                .artifactId(guideline.getId())
                                .title(guideline.getTitle())
                                .description(guideline.getDescription())
                                .source(guideline.getSource())
                                .category(guideline.getCategory())
                                .relevance(guideline.getRelevance())
                                .build();
                        newArtifacts.add(artifact);
                    } catch (Exception e) {
                        log.error("[SaveArtifacts-{}] ERROR processing guideline ID {}: {}", operationId, guideline.getId(), e.getMessage());
                    }
                });
            }
            
            // Process case studies
            if (request.getCaseStudies() != null) {
                request.getCaseStudies().forEach(caseStudy -> {
                     try {
                        if (caseStudy.getId() == null || caseStudy.getId().trim().isEmpty()) {
                            log.warn("[SaveArtifacts-{}] Skipping case study with null/empty ID for conv: {}", operationId, finalConversationUuid);
                             return; // continue to next case study in lambda
                        }
                        RagArtifact artifact = RagArtifact.builder()
                                .conversationId(finalConversationUuid) // Use final variable
                                .artifactType(RagArtifact.ArtifactType.CASE_STUDY)
                                .artifactId(caseStudy.getId())
                                .title(caseStudy.getTitle())
                                .source(caseStudy.getSource())
                                .category(caseStudy.getCategory())
                                .relevance(caseStudy.getRelevance())
                                .summary(caseStudy.getSummary())
                                .outcome(caseStudy.getOutcome())
                                .build();
                        newArtifacts.add(artifact);
                    } catch (Exception e) {
                        log.error("[SaveArtifacts-{}] ERROR processing case study ID {}: {}", operationId, caseStudy.getId(), e.getMessage());
                    }
                });
            }
            
            if (newArtifacts.isEmpty()) {
                log.warn("[SaveArtifacts-{}] No valid artifacts to save for conversation: {}", operationId, conversationUuid);
                return RagArtifactsResponseDTO.builder()
                        .conversationId(conversationUuid.toString())
                        .guidelines(List.of())
                        .caseStudies(List.of())
                        .build();
            }
            
            // Save all artifacts
            List<RagArtifact> savedArtifacts = null;
            try {
                log.info("[SaveArtifacts-{}] Attempting to save {} artifacts for conversation: {}", operationId, newArtifacts.size(), conversationUuid);
                savedArtifacts = ragArtifactRepository.saveAll(newArtifacts);
                // Log success *immediately* after saveAll returns, inside the try block
                log.info("[SaveArtifacts-{}] SUCCESS - ragArtifactRepository.saveAll completed for conversation: {}. Saved count: {}", 
                         operationId, conversationUuid, savedArtifacts != null ? savedArtifacts.size() : 0);
            } catch (Exception e) {
                log.error("[SaveArtifacts-{}] DATABASE ERROR - Error during ragArtifactRepository.saveAll for conv {}: {}", 
                          operationId, conversationUuid, e.getMessage(), e);
                // Re-throw to ensure transaction rollback
                throw new RuntimeException("Database error saving artifacts for conversation: " + conversationUuid, e);
            }
            
            // Prepare response DTO (only if save succeeded)
            RagArtifactsResponseDTO responseDTO = createResponseDTO(conversationUuid.toString(), savedArtifacts);
            log.info("[SaveArtifacts-{}] END - Successfully prepared response for conversation: {}", operationId, conversationUuid);
            return responseDTO;
            
        } catch (IllegalArgumentException e) {
            // Already logged the UUID format error
            // Return the pre-built empty response
             return RagArtifactsResponseDTO.builder()
                        .conversationId(conversationIdStr) // Use original string ID here
                        .guidelines(List.of())
                        .caseStudies(List.of())
                        .build();
        } catch (Exception e) {
            // Catch unexpected errors (including re-thrown DB error)
            log.error("[SaveArtifacts-{}] UNEXPECTED ERROR in saveArtifacts for conv {}: {}", 
                      operationId, conversationIdStr, e.getMessage(), e);
            // Re-throw to ensure transaction rollback on any major error
            throw new RuntimeException("Unexpected error saving artifacts for conversation: " + conversationIdStr, e);
        }
    }

    /**
     * NEW method to save artifacts received FROM the agent AFTER generation.
     *
     * @param conversationId UUID of the conversation
     * @param agentResponse DTO containing artifacts generated by the agent
     */
    @Transactional
    public void saveAgentGeneratedArtifacts(UUID conversationId, AgentArtifactResponseDTO agentResponse) {
        log.info("Attempting to save agent-generated artifacts for conversation: {}", conversationId);
        if (conversationId == null) {
            log.error("Cannot save artifacts with a null conversationId.");
            return;
        }
        
        try {
            if (agentResponse == null) {
                log.warn("Agent response was null for conversation: {}. Nothing to save.", conversationId);
                return;
            }
            log.debug("Received agent response for {}: Guidelines={}, CaseStudies={}", 
                     conversationId, 
                     agentResponse.getGuidelines() != null ? agentResponse.getGuidelines().size() : "null", 
                     agentResponse.getCaseStudies() != null ? agentResponse.getCaseStudies().size() : "null");

            if (agentResponse.getGuidelines().isEmpty() && agentResponse.getCaseStudies().isEmpty()) {
                log.info("Agent response contained no artifacts for conversation: {}. Nothing to save.", conversationId);
                return;
            }
            
            // Delete existing artifacts first
            try {
                log.info("Attempting deletion of existing artifacts for conversation: {}", conversationId);
                ragArtifactRepository.deleteByConversationId(conversationId);
                log.info("Successfully completed deletion attempt for existing artifacts for conversation: {}", conversationId);
            } catch (Exception e) {
                log.warn("Failed to delete existing artifacts for conversation {}: {}. Proceeding might lead to duplicates.", conversationId, e.getMessage());
            }

            List<RagArtifact> newArtifacts = new ArrayList<>();

            // Map Guidelines
            if (agentResponse.getGuidelines() != null) {
                for (AgentArtifactItemDTO guideline : agentResponse.getGuidelines()) {
                    try {
                        if (guideline == null || guideline.getId() == null || guideline.getId().trim().isEmpty()) {
                            log.warn("Skipping agent guideline with null or empty ID for conversation: {}", conversationId);
                            continue;
                        }
                        RagArtifact artifact = RagArtifact.builder()
                                .conversationId(conversationId)
                                .artifactType(RagArtifact.ArtifactType.GUIDELINE)
                                .artifactId(guideline.getId())
                                .title(guideline.getTitle())
                                .description(guideline.getDescription())
                                .source(guideline.getSource())
                                .category(guideline.getCategory())
                                .relevance(guideline.getRelevance()) // Assumes DTO has Float
                                .build();
                        log.debug("Mapped guideline: ID={}, Title={}", artifact.getArtifactId(), artifact.getTitle());
                        newArtifacts.add(artifact);
                    } catch (Exception e) {
                        log.error("Error mapping guideline DTO for conversation {}: {}", conversationId, e.getMessage(), e);
                    }
                }
            }

            // Map Case Studies
            if (agentResponse.getCaseStudies() != null) {
                for (AgentArtifactItemDTO caseStudy : agentResponse.getCaseStudies()) {
                     try {
                        if (caseStudy == null || caseStudy.getId() == null || caseStudy.getId().trim().isEmpty()) {
                            log.warn("Skipping agent case study with null or empty ID for conversation: {}", conversationId);
                            continue;
                        }
                        RagArtifact artifact = RagArtifact.builder()
                                .conversationId(conversationId)
                                .artifactType(RagArtifact.ArtifactType.CASE_STUDY)
                                .artifactId(caseStudy.getId())
                                .title(caseStudy.getTitle())
                                .summary(caseStudy.getSummary())
                                .outcome(caseStudy.getOutcome())
                                .source(caseStudy.getSource())
                                .relevance(caseStudy.getRelevance()) // Assumes DTO has Float
                                .category(caseStudy.getCategory() != null ? caseStudy.getCategory() : "Case Study") // Default category
                                .build();
                         log.debug("Mapped case study: ID={}, Title={}", artifact.getArtifactId(), artifact.getTitle());
                        newArtifacts.add(artifact);
                    } catch (Exception e) {
                        log.error("Error mapping case study DTO for conversation {}: {}", conversationId, e.getMessage(), e);
                    }
                }
            }

            if (newArtifacts.isEmpty()) {
                log.warn("No valid agent-generated artifacts were mapped for conversation: {}. Nothing to save.", conversationId);
                return;
            }

            // Save mapped artifacts
            log.info("Attempting to save {} mapped artifacts for conversation: {}", newArtifacts.size(), conversationId);
            List<RagArtifact> savedArtifacts = ragArtifactRepository.saveAll(newArtifacts);
            log.info("Successfully saved {} agent-generated artifacts for conversation: {}", savedArtifacts.size(), conversationId);

        } catch (Exception e) {
            log.error("Critical error saving agent-generated artifacts for conversation {}: {}", conversationId, e.getMessage(), e);
            // Decide if re-throwing is appropriate based on application needs
            // throw new RuntimeException("Failed to save agent-generated artifacts", e);
        }
    }

    /**
     * Get RAG artifacts for a conversation
     *
     * @param conversationId ID of the conversation
     * @return Response DTO with artifacts
     */
    @Transactional(readOnly = true)
    public List<RagArtifactsResponseDTO> getArtifacts(UUID conversationId) {
        final String operationId = UUID.randomUUID().toString().substring(0, 8);
        log.info("[GetArtifacts-{}] START - Attempting to get artifacts for conversation UUID: {}", operationId, conversationId);
        if (conversationId == null) {
            log.warn("[GetArtifacts-{}] WARN - getArtifacts called with null conversationId.", operationId);
            return List.of(RagArtifactsResponseDTO.builder()
                    .conversationId("null")
                    .guidelines(List.of())
                    .caseStudies(List.of())
                    .build());
        }
        
        String conversationIdStr = conversationId.toString();
        List<RagArtifact> artifacts = null;
        try {
            log.info("[GetArtifacts-{}] Fetching RAG artifacts from repository for conversation UUID: {}", operationId, conversationId);
            artifacts = ragArtifactRepository.findByConversationId(conversationId);
            // Log count *immediately* after the call returns
            int count = artifacts != null ? artifacts.size() : 0;
            log.info("[GetArtifacts-{}] Repository returned {} raw artifacts for conversation UUID: {}", operationId, count, conversationId);
            
            if (artifacts == null || artifacts.isEmpty()) {
                log.info("[GetArtifacts-{}] No artifacts found in database for conversation {}. Returning empty list.", operationId, conversationId);
                // Return list containing one empty response DTO for clarity
                return List.of(RagArtifactsResponseDTO.builder()
                                .conversationId(conversationIdStr)
                                .guidelines(List.of())
                                .caseStudies(List.of())
                                .build());
            }
            
            // Map results to DTO
            RagArtifactsResponseDTO responseDTO = createResponseDTO(conversationIdStr, artifacts);
            log.info("[GetArtifacts-{}] Successfully mapped {} artifacts to DTO for conversation {}: Guidelines={}, CaseStudies={}", 
                     operationId, count, conversationId, responseDTO.getGuidelines().size(), responseDTO.getCaseStudies().size());
            log.info("[GetArtifacts-{}] END - Returning response DTO for conversation UUID: {}", operationId, conversationId);
            return List.of(responseDTO);
            
        } catch (Exception e) {
            log.error("[GetArtifacts-{}] DATABASE ERROR - Error retrieving artifacts from repository for conversation {}: {}", 
                      operationId, conversationId, e.getMessage(), e);
            // Return list containing one empty response DTO on error
            return List.of(RagArtifactsResponseDTO.builder()
                    .conversationId(conversationIdStr)
                    .guidelines(List.of())
                    .caseStudies(List.of())
                    .build());
        }
    }

    /**
     * Delete RAG artifacts for a conversation
     *
     * @param conversationId ID of the conversation
     */
    @Transactional
    public void deleteArtifacts(UUID conversationId) {
        ragArtifactRepository.deleteByConversationId(conversationId);
    }

    /**
     * Create a response DTO from a list of artifacts
     *
     * @param conversationId ID of the conversation
     * @param artifacts List of artifacts
     * @return Response DTO
     */
    private RagArtifactsResponseDTO createResponseDTO(String conversationId, List<RagArtifact> artifacts) {
        List<RagArtifactDTO> guidelines = artifacts.stream()
                .filter(a -> a.getArtifactType() == RagArtifact.ArtifactType.GUIDELINE)
                .map(this::mapToDTO)
                .collect(Collectors.toList());
        
        List<RagArtifactDTO> caseStudies = artifacts.stream()
                .filter(a -> a.getArtifactType() == RagArtifact.ArtifactType.CASE_STUDY)
                .map(this::mapToDTO)
                .collect(Collectors.toList());
        
        return RagArtifactsResponseDTO.builder()
                .conversationId(conversationId)
                .guidelines(guidelines)
                .caseStudies(caseStudies)
                .build();
    }

    /**
     * Map a RagArtifact entity to a RagArtifactDTO
     *
     * @param artifact RagArtifact entity
     * @return RagArtifactDTO
     */
    private RagArtifactDTO mapToDTO(RagArtifact artifact) {
        RagArtifactDTO dto = RagArtifactDTO.builder()
                .id(artifact.getArtifactId())
                .title(artifact.getTitle())
                .description(artifact.getDescription())
                .source(artifact.getSource())
                .category(artifact.getCategory())
                .relevance(artifact.getRelevance() != null ? artifact.getRelevance().floatValue() : 0.0f)
                .build();
        
        if (artifact.getArtifactType() == RagArtifact.ArtifactType.CASE_STUDY) {
            dto.setSummary(artifact.getSummary());
            dto.setOutcome(artifact.getOutcome());
        }
        
        return dto;
    }
} 