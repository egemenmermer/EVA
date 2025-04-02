package com.ego.ethicai.controller;

import com.ego.ethicai.dto.RagArtifactsRequestDTO;
import com.ego.ethicai.dto.RagArtifactsResponseDTO;
import com.ego.ethicai.service.RagArtifactService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class RagArtifactController {

    private final RagArtifactService ragArtifactService;

    /**
     * Save RAG artifacts for a conversation
     *
     * @param request DTO containing artifacts to save
     * @return Response DTO with saved artifacts
     */
    @PostMapping("/rag-artifacts")
    public ResponseEntity<RagArtifactsResponseDTO> saveArtifacts(@RequestBody RagArtifactsRequestDTO request) {
        log.info("Saving RAG artifacts for conversation: {}", request.getConversationId());
        RagArtifactsResponseDTO response = ragArtifactService.saveArtifacts(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Get RAG artifacts for a conversation
     *
     * @param conversationId ID of the conversation
     * @return Response DTO with artifacts
     */
    @GetMapping("/knowledge-artifacts/{conversationId}")
    public ResponseEntity<List<RagArtifactsResponseDTO>> getArtifacts(@PathVariable UUID conversationId) {
        log.info("Retrieving RAG artifacts for conversation: {}", conversationId);
        List<RagArtifactsResponseDTO> response = ragArtifactService.getArtifacts(conversationId);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete RAG artifacts for a conversation
     *
     * @param conversationId ID of the conversation
     * @return Response entity
     */
    @DeleteMapping("/knowledge-artifacts/{conversationId}")
    public ResponseEntity<Void> deleteArtifacts(@PathVariable UUID conversationId) {
        log.info("Deleting RAG artifacts for conversation: {}", conversationId);
        ragArtifactService.deleteArtifacts(conversationId);
        return ResponseEntity.noContent().build();
    }
} 