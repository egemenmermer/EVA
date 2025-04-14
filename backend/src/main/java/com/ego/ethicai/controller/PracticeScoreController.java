package com.ego.ethicai.controller;

import com.ego.ethicai.dto.PracticeScoreRequestDTO;
import com.ego.ethicai.dto.PracticeScoreResponseDTO;
import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.PracticeScore;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.exception.ResourceNotFoundException;
import com.ego.ethicai.repository.ConversationRepository;
import com.ego.ethicai.repository.UserRepository;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.PracticeScoreService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/practice-score")
public class PracticeScoreController {

    private static final Logger logger = LoggerFactory.getLogger(PracticeScoreController.class);

    @Autowired
    private PracticeScoreService practiceScoreService;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/submit")
    public ResponseEntity<?> submitPracticeScore(
            @CurrentUser(required = false) CustomUserDetails currentUser,
            @RequestBody PracticeScoreRequestDTO request) {

        logger.info("Received practice score submission: {}", request);
        
        try {
            // Validate conversation ID
            if (request.getConversationId() == null) {
                logger.error("Missing conversation ID in practice score request");
                return ResponseEntity.badRequest().body("Conversation ID is required");
            }
            
            // Log the conversation ID format
            logger.info("Conversation ID format: {}", request.getConversationId());
            
            // Find the conversation - this is required
            Conversation conversation;
            try {
                conversation = conversationRepository.findById(request.getConversationId())
                        .orElseThrow(() -> {
                            logger.error("Conversation not found with ID: {}", request.getConversationId());
                            return new ResourceNotFoundException("Conversation not found with id: " + request.getConversationId());
                        });
                logger.info("Found conversation: {}", conversation.getId());
            } catch (Exception e) {
                logger.error("Error finding conversation: {}", e.getMessage());
                return ResponseEntity.badRequest().body("Invalid conversation ID: " + e.getMessage());
            }
            
            // Get the user ID - use anonymous user if not authenticated
            UUID userId;
            if (currentUser != null) {
                userId = currentUser.getId();
                logger.info("Using authenticated user ID: {}", userId);
            } else {
                logger.info("No authenticated user, using system user");
                // Use a default system user for anonymous submissions
                User systemUser = userRepository.findByEmail("system@ethicai.com")
                        .orElseGet(() -> {
                            logger.info("Creating system user for anonymous submissions");
                            User newSystemUser = new User();
                            newSystemUser.setEmail("system@ethicai.com");
                            newSystemUser.setFullName("System User");
                            return userRepository.save(newSystemUser);
                        });
                userId = systemUser.getId();
                logger.info("Using system user ID for anonymous submission: {}", userId);
            }
            
            // Submit the practice score
            PracticeScore practiceScore = practiceScoreService.submitPracticeScore(
                    request.getConversationId(),
                    userId,
                    request.getScore()
            );
            
            logger.info("Practice score submitted successfully: {}", practiceScore.getId());
            
            return ResponseEntity.ok(mapToResponseDTO(practiceScore));
        } catch (Exception e) {
            logger.error("Error submitting practice score", e);
            return ResponseEntity.badRequest().body("Error submitting practice score: " + e.getMessage());
        }
    }

    @GetMapping("/{conversationId}")
    public ResponseEntity<PracticeScoreResponseDTO> getPracticeScoreByConversationId(
            @CurrentUser CustomUserDetails currentUser,
            @PathVariable UUID conversationId) {

        PracticeScore practiceScore = practiceScoreService.getPracticeScore(conversationId, currentUser.getId());

        return ResponseEntity.ok(mapToResponseDTO(practiceScore));
    }

    @GetMapping("/user")
    public ResponseEntity<List<PracticeScoreResponseDTO>> getUserPracticeScores(
            @CurrentUser CustomUserDetails currentUser) {

        List<PracticeScore> practiceScores = practiceScoreService.getPracticeScoresByUser(currentUser.getId());

        List<PracticeScoreResponseDTO> responseDTOs = practiceScores.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseDTOs);
    }

    @GetMapping("/all")
    public ResponseEntity<List<PracticeScoreResponseDTO>> getAllPracticeScores() {

        List<PracticeScore> practiceScores = practiceScoreService.getAllPracticeScores();

        List<PracticeScoreResponseDTO> responseDTOs = practiceScores.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responseDTOs);
    }

    private PracticeScoreResponseDTO mapToResponseDTO(PracticeScore practiceScore) {
        return new PracticeScoreResponseDTO(
                practiceScore.getId(),
                practiceScore.getConversation().getId(),
                practiceScore.getScore(),
                practiceScore.getSubmittedAt()
        );
    }
} 