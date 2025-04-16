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
        UUID conversationUuid;
        
        try {
            log.info("Processing request to save artifacts for conversation: {}", conversationIdStr);
            
            // Attempt to parse the String ID into a UUID
            try {
                conversationUuid = UUID.fromString(conversationIdStr);
            } catch (IllegalArgumentException e) {
                log.error("Invalid UUID format for conversation ID: {}", conversationIdStr, e);
                throw new IllegalArgumentException("Invalid conversation ID format provided");
            }
            
            log.debug("Request contains {} guidelines and {} case studies", 
                    request.getGuidelines() != null ? request.getGuidelines().size() : 0,
                    request.getCaseStudies() != null ? request.getCaseStudies().size() : 0);
            
            // First delete any existing artifacts for this conversation
            try {
                ragArtifactRepository.deleteByConversationId(conversationUuid);
                log.info("Deleted existing artifacts for conversation: {}", conversationUuid);
            } catch (Exception e) {
                log.warn("Could not delete existing artifacts: {}", e.getMessage());
                // Continue with saving new artifacts
            }
            
            List<RagArtifact> newArtifacts = new ArrayList<>();
            
            // Process guidelines, ensuring conversationId is set correctly
            if (request.getGuidelines() != null) {
                for (RagArtifactDTO guideline : request.getGuidelines()) {
                    try {
                        // Check if artifactId is valid before building
                        if (guideline.getId() == null || guideline.getId().trim().isEmpty()) {
                            log.warn("Skipping guideline artifact with null or empty ID for conversation: {}", conversationUuid);
                            continue; // Skip this artifact
                        }

                        RagArtifact artifact = RagArtifact.builder()
                                .conversationId(conversationUuid)
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
                        log.error("Error processing guideline: {}", e.getMessage());
                        // Continue with next guideline
                    }
                }
            }
            
            // Process case studies
            if (request.getCaseStudies() != null) {
                for (RagArtifactDTO caseStudy : request.getCaseStudies()) {
                    try {
                        // Check if artifactId is valid
                        if (caseStudy.getId() == null || caseStudy.getId().trim().isEmpty()) {
                            log.warn("Skipping case study artifact with null or empty ID for conversation: {}", conversationUuid);
                            continue; // Skip this artifact
                        }

                        RagArtifact artifact = RagArtifact.builder()
                                .conversationId(conversationUuid)
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
                        log.error("Error processing case study: {}", e.getMessage());
                        // Continue with next case study
                    }
                }
            }
            
            if (newArtifacts.isEmpty()) {
                log.warn("No valid artifacts to save for conversation: {}", conversationUuid);
                return RagArtifactsResponseDTO.builder()
                        .conversationId(conversationUuid.toString())
                        .guidelines(List.of())
                        .caseStudies(List.of())
                        .build();
            }
            
            // Save all artifacts
            List<RagArtifact> savedArtifacts;
            try {
                savedArtifacts = ragArtifactRepository.saveAll(newArtifacts);
                log.info("Successfully saved {} artifacts for conversation: {}", savedArtifacts.size(), conversationUuid);
            } catch (Exception e) {
                log.error("Error saving artifacts to database: {}", e.getMessage(), e);
                throw e;
            }
            
            // Prepare response
            return createResponseDTO(conversationUuid.toString(), savedArtifacts);
        } catch (Exception e) {
            log.error("Unexpected error in saveArtifacts: {}", e.getMessage(), e);
            throw e;
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
        log.info("Attempting to get artifacts for conversation: {}", conversationId);
        if (conversationId == null) {
            log.warn("getArtifacts called with null conversationId.");
            return List.of(RagArtifactsResponseDTO.builder()
                    .guidelines(List.of())
                    .caseStudies(List.of())
                    .build());
        }
        
        String conversationIdStr = conversationId.toString();
        try {
            log.debug("Fetching RAG artifacts from repository for conversation UUID: {}", conversationId);
            List<RagArtifact> artifacts = ragArtifactRepository.findByConversationId(conversationId);
            log.info("Repository returned {} artifacts for conversation {}", artifacts.size(), conversationId);
            
            if (artifacts.isEmpty()) {
                log.info("No artifacts found in database for conversation {}. Returning empty response.", conversationId);
                // Return empty response DTO, but indicate the conversation ID it was for
                return List.of(RagArtifactsResponseDTO.builder()
                                .conversationId(conversationIdStr)
                                .guidelines(List.of())
                                .caseStudies(List.of())
                                .build());
            }
            
            // Create and return the response DTO
            RagArtifactsResponseDTO responseDTO = createResponseDTO(conversationIdStr, artifacts);
            log.info("Successfully prepared artifact response DTO for conversation {}: Guidelines={}, CaseStudies={}", 
                     conversationId, responseDTO.getGuidelines().size(), responseDTO.getCaseStudies().size());
            return List.of(responseDTO);
        } catch (Exception e) {
            log.error("Error retrieving artifacts from repository for conversation {}: {}", conversationId, e.getMessage(), e);
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