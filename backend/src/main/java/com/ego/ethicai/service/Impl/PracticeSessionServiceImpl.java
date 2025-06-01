package com.ego.ethicai.service.Impl;

import com.ego.ethicai.dto.practice.*;
import com.ego.ethicai.entity.PracticeSession;
import com.ego.ethicai.entity.PracticeSessionChoice;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.exception.ResourceNotFoundException;
import com.ego.ethicai.repository.PracticeSessionRepository;
import com.ego.ethicai.repository.PracticeSessionChoiceRepository;
import com.ego.ethicai.service.PracticeSessionService;
import com.ego.ethicai.service.UserService;
import com.ego.ethicai.service.ScenarioService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PracticeSessionServiceImpl implements PracticeSessionService {

    private final PracticeSessionRepository practiceSessionRepository;
    private final PracticeSessionChoiceRepository practiceSessionChoiceRepository;
    private final UserService userService;
    private final ScenarioService scenarioService;

    @Override
    @Transactional
    public PracticeSessionResponseDTO savePracticeSession(PracticeSessionRequestDTO requestDTO) {
        log.info("Received PracticeSessionRequestDTO in service: {}", requestDTO);
        log.info("Saving practice session for user: {}", requestDTO.getUserId());
        log.info("DEBUG: RequestDTO choices field: {}", requestDTO.getChoices());
        log.info("DEBUG: RequestDTO choices size: {}", requestDTO.getChoices() != null ? requestDTO.getChoices().size() : "null");
        
        // Find the user
        User user = userService.findById(requestDTO.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + requestDTO.getUserId()));

        // Build the entity
        PracticeSession practiceSession = PracticeSession.builder()
                .user(user)
                .managerType(requestDTO.getManagerType())
                .scenarioId(requestDTO.getScenarioId())
                .selectedChoices(requestDTO.getSelectedChoices()) // Keep for backward compatibility
                .createdAt(requestDTO.getTimestamp() != null ? requestDTO.getTimestamp() : LocalDateTime.now())
                .score(requestDTO.getScore())
                .build();

        // Save to database
        PracticeSession savedSession = practiceSessionRepository.save(practiceSession);
        log.info("Practice session saved with ID: {}", savedSession.getId());

        // Save detailed choice data if available
        if (requestDTO.getSelectedChoices() != null && !requestDTO.getSelectedChoices().isEmpty()) {
            try {
                List<PracticeSessionChoice> choiceEntities = new ArrayList<>();
                
                // Use detailed choices if available
                if (requestDTO.getChoices() != null && !requestDTO.getChoices().isEmpty()) {
                    log.info("DEBUG: Using detailed choice data for session {} with {} choices", savedSession.getId(), requestDTO.getChoices().size());
                    for (PracticeChoiceDTO choiceDTO : requestDTO.getChoices()) {
                        log.info("DEBUG: Processing choice - Step: {}, Text: {}, EVS: {}, Tactic: {}", 
                                choiceDTO.getStepNumber(), choiceDTO.getChoiceText(), choiceDTO.getEvsScore(), choiceDTO.getTactic());
                        
                        PracticeSessionChoice choice = PracticeSessionChoice.builder()
                                .practiceSession(savedSession)
                                .stepNumber(choiceDTO.getStepNumber())
                                .choiceText(choiceDTO.getChoiceText())
                                .evsScore(choiceDTO.getEvsScore())
                                .tactic(choiceDTO.getTactic())
                                .build();
                        choiceEntities.add(choice);
                    }
                } else {
                    // Fall back to parsing scenario data for backward compatibility
                    log.info("DEBUG: Using scenario parsing for session {} (legacy mode)", savedSession.getId());
                    JsonNode scenarioData = scenarioService.getScenarioData(requestDTO.getScenarioId());
                    
                    for (int i = 0; i < requestDTO.getSelectedChoices().size(); i++) {
                        String userChoice = requestDTO.getSelectedChoices().get(i);
                        SelectionDataDTO selectionData = findChoiceData(scenarioData, userChoice, i + 1);
                        
                        PracticeSessionChoice choice = PracticeSessionChoice.builder()
                                .practiceSession(savedSession)
                                .stepNumber(i + 1)
                                .choiceText(userChoice)
                                .evsScore(selectionData != null ? selectionData.getEvs() : null)
                                .tactic(selectionData != null ? selectionData.getTactic() : "Unknown")
                                .build();
                        choiceEntities.add(choice);
                    }
                }
                
                log.info("DEBUG: About to save {} choice entities", choiceEntities.size());
                List<PracticeSessionChoice> savedChoices = practiceSessionChoiceRepository.saveAll(choiceEntities);
                log.info("DEBUG: Successfully saved {} choice entities for session {}", savedChoices.size(), savedSession.getId());
            } catch (Exception e) {
                log.error("DEBUG: Could not save choice data for session {}: {}", savedSession.getId(), e.getMessage(), e);
            }
        } else {
            log.warn("DEBUG: No selected choices provided for session {}", savedSession.getId());
        }

        // Map to response DTO
        return mapToResponseDTO(savedSession);
    }

    @Override
    @Transactional
    public List<PracticeSessionResponseDTO> getPracticeSessionsByUserId(UUID userId) {
        log.info("Fetching practice sessions for user: {}", userId);
        return practiceSessionRepository.findByUser_Id(userId).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PracticeSession getPracticeSessionEntityById(UUID id) {
        log.info("Fetching practice session by ID: {}", id);
        return practiceSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Practice session not found with ID: " + id));
    }

    @Override
    @Transactional
    public List<PracticeSessionResponseDTO> getAllPracticeSessions() {
        List<PracticeSession> sessions = practiceSessionRepository.findAll();
        
        // Sort by createdAt in descending order (most recent first)
        sessions.sort((s1, s2) -> s2.getCreatedAt().compareTo(s1.getCreatedAt()));
        
        return sessions.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<SelectionDataDTO> getUserSelections(UUID sessionId) {
        log.info("Getting user selections for session: {}", sessionId);
        
        try {
            PracticeSession session = getPracticeSessionEntityById(sessionId);
            log.info("DEBUG: Found session with ID: {}, scenarioId: {}", session.getId(), session.getScenarioId());
            
            // First try to get data from stored choices (new format)
            List<PracticeSessionChoice> storedChoices = practiceSessionChoiceRepository.findByPracticeSessionIdOrderByStepNumber(sessionId);
            log.info("DEBUG: Found {} stored choices for session {}", storedChoices.size(), sessionId);
            
            if (!storedChoices.isEmpty()) {
                log.info("DEBUG: Using stored choices data");
                List<SelectionDataDTO> result = storedChoices.stream()
                        .map(choice -> {
                            log.info("DEBUG: Processing choice - Step: {}, Text: {}, EVS: {}, Tactic: {}", 
                                    choice.getStepNumber(), choice.getChoiceText(), choice.getEvsScore(), choice.getTactic());
                            return SelectionDataDTO.builder()
                                    .step(choice.getStepNumber())
                                    .choice(choice.getChoiceText())
                                    .evs(choice.getEvsScore())
                                    .tactic(choice.getTactic())
                                    .build();
                        })
                        .collect(Collectors.toList());
                log.info("DEBUG: Returning {} selection DTOs", result.size());
                return result;
            }
            
            // Fall back to legacy method for backward compatibility
            log.info("DEBUG: No stored choices found, falling back to legacy method");
            if (session.getScenarioId() == null || session.getSelectedChoices() == null) {
                log.info("DEBUG: No scenario ID or selected choices, returning empty list");
                return new ArrayList<>();
            }
            
            // Get scenario data from ScenarioService
            JsonNode scenarioData = scenarioService.getScenarioData(session.getScenarioId());
            List<SelectionDataDTO> selections = new ArrayList<>();
            
            // Process each user choice
            for (int i = 0; i < session.getSelectedChoices().size(); i++) {
                String userChoice = session.getSelectedChoices().get(i);
                
                // Find the matching choice in scenario data and get its EVS and tactic
                SelectionDataDTO selectionData = findChoiceData(scenarioData, userChoice, i + 1);
                if (selectionData != null) {
                    selections.add(selectionData);
                } else {
                    // Create a basic entry if we can't find the choice data
                    selections.add(SelectionDataDTO.builder()
                            .step(i + 1)
                            .choice(userChoice)
                            .evs(null)
                            .tactic("Unknown")
                            .build());
                }
            }
            
            return selections;
        } catch (Exception e) {
            log.error("Error getting user selections for session {}: {}", sessionId, e.getMessage(), e);
            throw new RuntimeException("Failed to retrieve user selections", e);
        }
    }

    @Override
    @Transactional
    public DecisionTreeDataDTO getDecisionTree(UUID sessionId) {
        log.info("Getting decision tree for session: {}", sessionId);
        
        PracticeSession session = getPracticeSessionEntityById(sessionId);
        
        if (session.getScenarioId() == null) {
            throw new ResourceNotFoundException("Scenario not found for session: " + sessionId);
        }
        
        try {
            // Get scenario data from ScenarioService
            JsonNode scenarioData = scenarioService.getScenarioData(session.getScenarioId());
            
            List<DecisionTreeStepDTO> steps = new ArrayList<>();
            
            // Try to get stored choices first
            List<PracticeSessionChoice> storedChoices = practiceSessionChoiceRepository.findByPracticeSessionIdOrderByStepNumber(sessionId);
            List<String> userChoices;
            
            if (!storedChoices.isEmpty()) {
                userChoices = storedChoices.stream()
                        .map(PracticeSessionChoice::getChoiceText)
                        .collect(Collectors.toList());
            } else {
                userChoices = session.getSelectedChoices() != null ? session.getSelectedChoices() : new ArrayList<>();
            }
            
            // Trace through the scenario following the user's path
            String currentStatementId = scenarioData.get("starting_statement_id").asText();
            
            for (int stepIndex = 0; stepIndex < 10 && currentStatementId != null; stepIndex++) {
                JsonNode statement = scenarioData.get("statements").get(currentStatementId);
                if (statement == null) break;
                
                String userChoice = stepIndex < userChoices.size() ? userChoices.get(stepIndex) : "No choice recorded";
                
                // Get all alternatives for this step
                List<DecisionTreeAlternativeDTO> alternatives = new ArrayList<>();
                int chosenIndex = -1;
                String nextStatementId = null;
                
                JsonNode choices = statement.get("user_choices");
                if (choices != null && choices.isArray()) {
                    for (int i = 0; i < choices.size(); i++) {
                        JsonNode choice = choices.get(i);
                        String choiceText = choice.get("choice").asText();
                        
                        alternatives.add(DecisionTreeAlternativeDTO.builder()
                                .text(choiceText)
                                .tactic(choice.get("category").asText())
                                .evs((double) choice.get("EVS").asInt())
                                .build());
                        
                        // Check if this matches the user's choice
                        if (choiceText.equals(userChoice)) {
                            chosenIndex = i;
                            nextStatementId = choice.get("leads_to").asText();
                        }
                    }
                }
                
                steps.add(DecisionTreeStepDTO.builder()
                        .step(stepIndex + 1)
                        .managerStatement(statement.get("text").asText())
                        .userChoice(userChoice)
                        .alternatives(alternatives)
                        .chosenIndex(chosenIndex)
                        .build());
                
                currentStatementId = nextStatementId;
            }
            
            return DecisionTreeDataDTO.builder()
                    .scenario(scenarioData.get("title").asText())
                    .steps(steps)
                    .build();
                    
        } catch (Exception e) {
            log.error("Error getting decision tree for session {}: {}", sessionId, e.getMessage());
            throw new RuntimeException("Failed to retrieve decision tree", e);
        }
    }

    private SelectionDataDTO findChoiceData(JsonNode scenarioData, String userChoice, int step) {
        try {
            JsonNode statements = scenarioData.get("statements");
            if (statements != null) {
                for (JsonNode statement : statements) {
                    JsonNode choices = statement.get("user_choices");
                    if (choices != null && choices.isArray()) {
                        for (JsonNode choice : choices) {
                            if (choice.get("choice").asText().equals(userChoice)) {
                                return SelectionDataDTO.builder()
                                        .step(step)
                                        .choice(userChoice)
                                        .evs((double) choice.get("EVS").asInt())
                                        .tactic(choice.get("category").asText())
                                        .build();
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not find choice data for: {}", userChoice);
        }
        return null;
    }
    
    // Helper method to map entity to response DTO
    private PracticeSessionResponseDTO mapToResponseDTO(PracticeSession entity) {
        // Get choices from the new relationship
        List<String> choices = new ArrayList<>();
        
        if (entity.getPracticeSessionChoices() != null) {
            choices = entity.getPracticeSessionChoices().stream()
                    .sorted((c1, c2) -> Integer.compare(c1.getStepNumber(), c2.getStepNumber()))
                    .map(PracticeSessionChoice::getChoiceText)
                    .collect(Collectors.toList());
        } else if (entity.getSelectedChoices() != null) {
            // Fallback for backward compatibility
            choices.addAll(entity.getSelectedChoices());
        }
        
        return PracticeSessionResponseDTO.builder()
                .id(entity.getId())
                .userId(entity.getUser().getId())
                .userFullName(entity.getUser().getFullName())
                .userEmail(entity.getUser().getEmail())
                .managerType(entity.getManagerType())
                .scenarioId(entity.getScenarioId())
                .selectedChoices(choices)
                .createdAt(entity.getCreatedAt())
                .score(entity.getScore())
                .build();
    }
} 