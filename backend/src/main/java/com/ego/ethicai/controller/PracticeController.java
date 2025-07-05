package com.ego.ethicai.controller;

import com.ego.ethicai.dto.practice.*;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.enums.AccountTypes;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.PracticeSessionService;
import com.ego.ethicai.service.UserService;
import com.ego.ethicai.service.ScenarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/practice")
public class PracticeController {

    private final PracticeSessionService practiceSessionService;
    private final UserService userService;
    private final ScenarioService scenarioService;

    @PostMapping("/save")
    public ResponseEntity<PracticeSessionResponseDTO> savePracticeSession(
            @CurrentUser CustomUserDetails currentUser,
            @Valid @RequestBody PracticeSessionRequestDTO requestDTO) {
        log.info("Received request to save practice session: {}", requestDTO);
        PracticeSessionResponseDTO savedSession = practiceSessionService.savePracticeSession(requestDTO);
        return new ResponseEntity<>(savedSession, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<PracticeSessionResponseDTO>> getUserPracticeSessions(
            @CurrentUser CustomUserDetails currentUser) {

        log.info("Retrieving practice sessions for user: {}", currentUser.getEmail());

        try {
            List<PracticeSessionResponseDTO> sessions = practiceSessionService.getPracticeSessionsByUserId(currentUser.getId());
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            log.error("Error retrieving practice sessions: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<PracticeSessionResponseDTO> getPracticeSession(
            @CurrentUser CustomUserDetails currentUser,
            @PathVariable UUID sessionId) {

        log.info("Retrieving practice session {} for user: {}", sessionId, currentUser.getEmail());

        try {
            // Fetch the session entity and validate ownership
            var session = practiceSessionService.getPracticeSessionEntityById(sessionId);
            
            // Check if the session belongs to the current user
            if (!session.getUser().getId().equals(currentUser.getId())) {
                log.warn("Unauthorized access attempt to practice session: {}", sessionId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            
            // Convert to DTO and return
            PracticeSessionResponseDTO responseDTO = PracticeSessionResponseDTO.builder()
                    .id(session.getId())
                    .userId(session.getUser().getId())
                    .managerType(session.getManagerType())
                    .scenarioId(session.getScenarioId())
                    .selectedChoices(session.getSelectedChoices())
                    .createdAt(session.getCreatedAt())
                    .score(session.getScore())
                    .build();
                    
            return ResponseEntity.ok(responseDTO);
        } catch (Exception e) {
            log.error("Error retrieving practice session: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    // New endpoint to set auto-open tactics guide flag
    @PostMapping("/set-auto-open-tactics")
    public ResponseEntity<Map<String, String>> setAutoOpenTacticsFlag(
            @CurrentUser CustomUserDetails currentUser,
            @RequestBody Map<String, Object> request) {
        
        log.info("Setting auto-open tactics flag for user: {}", currentUser.getEmail());
        
        try {
            UUID conversationId = UUID.fromString((String) request.get("conversationId"));
            Map<String, Object> practiceData = (Map<String, Object>) request.get("practiceData");
            
            // Store the flag and practice data in the user service
            practiceSessionService.setAutoOpenTacticsFlag(currentUser.getId(), conversationId, practiceData);
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Auto-open tactics flag set successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error setting auto-open tactics flag: {}", e.getMessage(), e);
            Map<String, String> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to set auto-open tactics flag");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    // New endpoint to get and clear auto-open tactics guide flag
    @GetMapping("/get-auto-open-tactics")
    public ResponseEntity<Map<String, Object>> getAutoOpenTacticsFlag(
            @CurrentUser CustomUserDetails currentUser,
            @RequestParam UUID conversationId) {
        
        log.info("Getting auto-open tactics flag for user: {} and conversation: {}", currentUser.getEmail(), conversationId);
        
        try {
            Map<String, Object> result = practiceSessionService.getAndClearAutoOpenTacticsFlag(currentUser.getId(), conversationId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error getting auto-open tactics flag: {}", e.getMessage(), e);
            Map<String, Object> response = new HashMap<>();
            response.put("shouldAutoOpen", false);
            response.put("practiceData", null);
            return ResponseEntity.ok(response);
        }
    }

    // New endpoint to get latest practice session data for tactics modal
    @GetMapping("/latest-session-data")
    public ResponseEntity<Map<String, Object>> getLatestPracticeSessionData(
            @CurrentUser CustomUserDetails currentUser) {
        
        log.info("Getting latest practice session data for user: {}", currentUser.getEmail());
        
        try {
            Map<String, Object> sessionData = practiceSessionService.getLatestPracticeSessionData(currentUser.getId());
            return ResponseEntity.ok(sessionData);
        } catch (Exception e) {
            log.error("Error getting latest practice session data: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<PracticeSessionResponseDTO>> getAllPracticeSessions() {
        try {
            List<PracticeSessionResponseDTO> sessions = practiceSessionService.getAllPracticeSessions();
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            log.error("Error retrieving all practice sessions: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/admin/get-selections/{sessionId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<SelectionDataDTO>> getUserSelections(@PathVariable UUID sessionId) {
        log.info("=== ADMIN SELECTIONS ENDPOINT CALLED ===");
        log.info("SessionId: {}", sessionId);
        log.info("Authentication: {}", SecurityContextHolder.getContext().getAuthentication());
        log.info("Principal: {}", SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        log.info("Authorities: {}", SecurityContextHolder.getContext().getAuthentication().getAuthorities());
        
        try {
            log.info("Retrieving user selections for session: {}", sessionId);
            List<SelectionDataDTO> selections = practiceSessionService.getUserSelections(sessionId);
            log.info("Successfully retrieved {} selections", selections.size());
            return ResponseEntity.ok(selections);
        } catch (Exception e) {
            log.error("Error retrieving user selections for session {}: {}", sessionId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/admin/get-decision-tree/{sessionId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<DecisionTreeDataDTO> getDecisionTree(@PathVariable UUID sessionId) {
        log.info("=== ADMIN DECISION TREE ENDPOINT CALLED ===");
        log.info("SessionId: {}", sessionId);
        
        try {
            log.info("Retrieving decision tree for session: {}", sessionId);
            DecisionTreeDataDTO decisionTree = practiceSessionService.getDecisionTree(sessionId);
            return ResponseEntity.ok(decisionTree);
        } catch (Exception e) {
            log.error("Error retrieving decision tree for session {}: {}", sessionId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
} 