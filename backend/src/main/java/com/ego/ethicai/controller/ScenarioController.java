package com.ego.ethicai.controller;

import com.ego.ethicai.dto.scenario.ScenarioSessionRequestDTO;
import com.ego.ethicai.dto.scenario.ScenarioSessionResponseDTO;
import com.ego.ethicai.dto.scenario.ScenarioChoiceRequestDTO;
import com.ego.ethicai.dto.scenario.ScenarioChoiceResponseDTO;
import com.ego.ethicai.service.ScenarioService;
import com.ego.ethicai.service.ScenarioServiceImpl;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/scenarios")
public class ScenarioController {

    private final ScenarioService scenarioService;

    @PostMapping("/{scenarioId}/start")
    public ResponseEntity<ScenarioSessionResponseDTO> startScenario(
            @CurrentUser CustomUserDetails currentUser,
            @PathVariable String scenarioId,
            @Valid @RequestBody ScenarioSessionRequestDTO requestDTO) {
        
        log.info("Starting scenario {} for user: {}", scenarioId, currentUser.getEmail());
        
        try {
            ScenarioSessionResponseDTO response = scenarioService.startScenario(
                currentUser.getId(), 
                scenarioId, 
                requestDTO.getSessionId()
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error starting scenario {}: {}", scenarioId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/{scenarioId}/next")
    public ResponseEntity<ScenarioChoiceResponseDTO> processChoice(
            @CurrentUser CustomUserDetails currentUser,
            @PathVariable String scenarioId,
            @Valid @RequestBody ScenarioChoiceRequestDTO requestDTO) {
        
        log.info("Processing choice for scenario {} and session {}", scenarioId, requestDTO.getSessionId());
        
        try {
            ScenarioChoiceResponseDTO response = scenarioService.processChoice(
                currentUser.getId(),
                scenarioId,
                requestDTO.getSessionId(),
                requestDTO.getChoiceIndex(),
                requestDTO.getCurrentStatementId()
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error processing choice for scenario {}: {}", scenarioId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/suggest")
    public ResponseEntity<Map<String, String>> suggestScenario(
            @CurrentUser CustomUserDetails currentUser,
            @RequestParam String userQuery) {
        log.info("Suggesting scenario for user query: {}", userQuery);
        
        try {
            // Cast to get access to the new method
            ScenarioServiceImpl serviceImpl = (ScenarioServiceImpl) scenarioService;
            Map<String, String> suggestion = serviceImpl.suggestScenarioForUser(currentUser.getId(), userQuery);
            return ResponseEntity.ok(suggestion);
        } catch (Exception e) {
            log.error("Error suggesting scenario for query: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAvailableScenarios() {
        log.info("Fetching available scenarios");
        
        try {
            List<Map<String, Object>> scenarios = scenarioService.getAvailableScenarios();
            return ResponseEntity.ok(scenarios);
        } catch (Exception e) {
            log.error("Error fetching available scenarios: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{scenarioId}/feedback")
    public ResponseEntity<Map<String, Object>> getSessionFeedback(
            @CurrentUser CustomUserDetails currentUser,
            @PathVariable String scenarioId,
            @RequestParam String sessionId) {
        
        log.info("Getting feedback for scenario {} session {}", scenarioId, sessionId);
        
        try {
            Map<String, Object> feedback = scenarioService.generateSessionFeedback(
                currentUser.getId(),
                scenarioId,
                sessionId
            );
            return ResponseEntity.ok(feedback);
        } catch (Exception e) {
            log.error("Error generating feedback for scenario {}: {}", scenarioId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
} 