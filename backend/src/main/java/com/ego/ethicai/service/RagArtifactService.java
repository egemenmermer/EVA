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
        
        // First delete any existing artifacts for this conversation
        ragArtifactRepository.deleteByConversationId(conversationId);
        
        List<RagArtifact> newArtifacts = new ArrayList<>();
        
        // Process guidelines
        if (request.getGuidelines() != null) {
            for (RagArtifactDTO guideline : request.getGuidelines()) {
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
            }
        }
        
        // Process case studies
        if (request.getCaseStudies() != null) {
            for (RagArtifactDTO caseStudy : request.getCaseStudies()) {
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
            }
        }
        
        // Save all artifacts
        List<RagArtifact> savedArtifacts = ragArtifactRepository.saveAll(newArtifacts);
        
        // Prepare response
        return createResponseDTO(conversationId, savedArtifacts);
    }

    /**
     * Get RAG artifacts for a conversation
     *
     * @param conversationId ID of the conversation
     * @return Response DTO with artifacts
     */
    @Transactional(readOnly = true)
    public List<RagArtifactsResponseDTO> getArtifacts(UUID conversationId) {
        List<RagArtifact> artifacts = ragArtifactRepository.findByConversationId(conversationId.toString());
        return List.of(createResponseDTO(conversationId.toString(), artifacts));
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