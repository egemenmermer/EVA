package com.ego.ethicai.service;

import com.ego.ethicai.dto.RagArtifactDTO;
import com.ego.ethicai.dto.RagArtifactsRequestDTO;
import com.ego.ethicai.dto.RagArtifactsResponseDTO;
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
        String conversationId = request.getConversationId();
        
        try {
            log.info("Processing request to save artifacts for conversation: {}", conversationId);
            
            if (conversationId == null || conversationId.isEmpty()) {
                log.error("Cannot save artifacts: conversation ID is null or empty");
                throw new IllegalArgumentException("Conversation ID cannot be null or empty");
            }
            
            log.debug("Request contains {} guidelines and {} case studies", 
                    request.getGuidelines() != null ? request.getGuidelines().size() : 0,
                    request.getCaseStudies() != null ? request.getCaseStudies().size() : 0);
            
            // First delete any existing artifacts for this conversation
            try {
                ragArtifactRepository.deleteByConversationId(conversationId);
                log.info("Deleted existing artifacts for conversation: {}", conversationId);
            } catch (Exception e) {
                log.warn("Could not delete existing artifacts: {}", e.getMessage());
                // Continue with saving new artifacts
            }
            
            List<RagArtifact> newArtifacts = new ArrayList<>();
            
            // Process guidelines
            if (request.getGuidelines() != null) {
                for (RagArtifactDTO guideline : request.getGuidelines()) {
                    try {
                        RagArtifact artifact = RagArtifact.builder()
                                .conversationId(conversationId)
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
                        RagArtifact artifact = RagArtifact.builder()
                                .conversationId(conversationId)
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
                log.warn("No valid artifacts to save for conversation: {}", conversationId);
                return RagArtifactsResponseDTO.builder()
                        .conversationId(conversationId)
                        .guidelines(List.of())
                        .caseStudies(List.of())
                        .build();
            }
            
            // Save all artifacts
            List<RagArtifact> savedArtifacts;
            try {
                savedArtifacts = ragArtifactRepository.saveAll(newArtifacts);
                log.info("Successfully saved {} artifacts for conversation: {}", savedArtifacts.size(), conversationId);
            } catch (Exception e) {
                log.error("Error saving artifacts to database: {}", e.getMessage(), e);
                throw e;
            }
            
            // Prepare response
            return createResponseDTO(conversationId, savedArtifacts);
        } catch (Exception e) {
            log.error("Unexpected error in saveArtifacts: {}", e.getMessage(), e);
            throw e;
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
        try {
            if (conversationId == null) {
                log.warn("Null conversationId provided to getArtifacts");
                return List.of(RagArtifactsResponseDTO.builder()
                        .guidelines(List.of())
                        .caseStudies(List.of())
                        .build());
            }
            
            String conversationIdStr = conversationId.toString();
            log.debug("Fetching RAG artifacts for conversation UUID: {} (String format: {})", 
                    conversationId, conversationIdStr);
            
            List<RagArtifact> artifacts = ragArtifactRepository.findByConversationId(conversationIdStr);
            log.debug("Found {} artifacts for conversation {}", artifacts.size(), conversationId);
            
            // Create and return the response DTO
            RagArtifactsResponseDTO responseDTO = createResponseDTO(conversationIdStr, artifacts);
            return List.of(responseDTO);
        } catch (Exception e) {
            log.error("Error retrieving artifacts for conversation {}: {}", conversationId, e.getMessage(), e);
            // Return empty response instead of failing
            return List.of(RagArtifactsResponseDTO.builder()
                    .conversationId(conversationId != null ? conversationId.toString() : null)
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
        ragArtifactRepository.deleteByConversationId(conversationId.toString());
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
                .relevance(artifact.getRelevance())
                .build();
        
        if (artifact.getArtifactType() == RagArtifact.ArtifactType.CASE_STUDY) {
            dto.setSummary(artifact.getSummary());
            dto.setOutcome(artifact.getOutcome());
        }
        
        return dto;
    }
} 