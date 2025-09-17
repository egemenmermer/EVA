package com.ego.ethicai.controller;

import com.ego.ethicai.dto.scenario.ScenarioSessionRequestDTO;
import com.ego.ethicai.dto.scenario.ScenarioSessionResponseDTO;
import com.ego.ethicai.dto.scenario.ScenarioChoiceRequestDTO;
import com.ego.ethicai.dto.scenario.ScenarioChoiceResponseDTO;
import com.ego.ethicai.service.ScenarioService;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;


@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/scenarios")
public class ScenarioController {

    private final ScenarioService scenarioService;

    @PostMapping("/dynamic/start")
    public ResponseEntity<ScenarioSessionResponseDTO> startScenario(
            @CurrentUser CustomUserDetails currentUser,
            @Valid @RequestBody ScenarioSessionRequestDTO requestDTO) {
        
        log.info("Starting scenario for user: {} with managerType={} and concern={}", 
                 currentUser.getEmail(), requestDTO.getManagerType(), requestDTO.getConcern());
           
        try {
            ScenarioSessionResponseDTO response = scenarioService.startScenario(
                currentUser.getId(),
                requestDTO.getManagerType(),
                requestDTO.getConcern(),
                requestDTO.getSessionId(),
                requestDTO.getDifficulty()
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error starting scenario: {}",  e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/dynamic/next")
    public ResponseEntity<ScenarioChoiceResponseDTO> processChoice(
        @CurrentUser CustomUserDetails currentUser,
        @Valid @RequestBody ScenarioChoiceRequestDTO requestDTO,
        @RequestParam(name = "end", required = false, defaultValue = "0") int end) {
    
        
        log.info("Processing choice for scenario and session {}",  requestDTO.getSessionId());
        
        try {
            ScenarioChoiceResponseDTO response = scenarioService.processChoice(
                currentUser.getId(),
                requestDTO.getSessionId(),
                requestDTO.getChoiceIndex(),
                requestDTO.getCurrentStatementId(),
                end
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error processing choice for scenario: {}",  e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    @GetMapping("/dynamic/feedback")
    public ResponseEntity<Map<String, Object>> getSessionFeedback(
            @CurrentUser CustomUserDetails currentUser,
            @RequestParam UUID sessionId) {
        
        log.info("Getting feedback for scenario {} session {}", sessionId);
        
        try {
            Map<String, Object> feedback = scenarioService.generateSessionFeedback(
                currentUser.getId(),
                sessionId
            );
            return ResponseEntity.ok(feedback);
        } catch (Exception e) {
            log.error("Error generating feedback: {}",  e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
} 