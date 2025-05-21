package com.ego.ethicai.controller;

import com.ego.ethicai.dto.practice.PracticeSessionRequestDTO;
import com.ego.ethicai.dto.practice.PracticeSessionResponseDTO;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.enums.AccountTypes;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.PracticeSessionService;
import com.ego.ethicai.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/practice")
public class PracticeController {

    private final PracticeSessionService practiceSessionService;
    private final UserService userService;

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
} 