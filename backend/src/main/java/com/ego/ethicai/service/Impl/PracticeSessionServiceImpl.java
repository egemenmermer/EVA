package com.ego.ethicai.service.Impl;

import com.ego.ethicai.dto.practice.*;
import com.ego.ethicai.entity.PracticeSession;
import com.ego.ethicai.entity.PracticeSessionChoice;
import com.ego.ethicai.entity.PracticeTacticsFlag;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.exception.ResourceNotFoundException;
import com.ego.ethicai.repository.PracticeSessionRepository;
import com.ego.ethicai.repository.PracticeSessionChoiceRepository;
import com.ego.ethicai.repository.PracticeTacticsFlagRepository;
import com.ego.ethicai.service.PracticeSessionService;
import com.ego.ethicai.service.UserService;
import com.ego.ethicai.service.ScenarioService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PracticeSessionServiceImpl implements PracticeSessionService {

    private final PracticeSessionRepository practiceSessionRepository;
    private final PracticeSessionChoiceRepository practiceSessionChoiceRepository;
    private final PracticeTacticsFlagRepository practiceTacticsFlagRepository;
    private final UserService userService;
    private final ScenarioService scenarioService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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
                .conversationId(requestDTO.getConversationId()) 
                .managerType(requestDTO.getManagerType())
                .concern(requestDTO.getConcern())
                .selectedChoices(requestDTO.getSelectedChoices()) // Keep for backward compatibility
                .createdAt(requestDTO.getTimestamp() != null ? requestDTO.getTimestamp() : LocalDateTime.now())
                .score(requestDTO.getScore())
                .build();

        // Save to database
        PracticeSession savedSession = practiceSessionRepository.save(practiceSession);
        log.info("Practice session saved with ID: {}", savedSession.getId());

        // Mark user as having completed practice (for permanent tactics guide)
        user.markFirstPracticeCompleted();
        
        // Also mark the specific scenario type as completed
        String scenarioType = extractScenarioType(requestDTO.getConcern());
        log.info("🔍 SCENARIO COMPLETION DEBUG - Scenario ID: {}, Extracted Type: {}", requestDTO.getConcern(), scenarioType);
        
        
        userService.saveUser(user);
        log.info("Marked user {} as having completed first practice", user.getId());

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
                                .tacticType(choiceDTO.getTacticType())
                                .build();
                        choiceEntities.add(choice);
                    }
                } else {
                    // Fall back to parsing scenario data for backward compatibility
                    log.info("DEBUG: Using scenario parsing for session {} (legacy mode)", savedSession.getId());
                    //JsonNode scenarioData = scenarioService.getScenarioData(requestDTO.getConcern());
                    
                    for (int i = 0; i < requestDTO.getSelectedChoices().size(); i++) {
                        SelectionDataDTO selectionData = requestDTO.getSelectedChoices().get(i);
                        
                        PracticeSessionChoice choice = PracticeSessionChoice.builder()
                                .practiceSession(savedSession)
                                .stepNumber(i + 1)
                                .choiceText(selectionData.getChoice())
                                .evsScore(selectionData != null ? selectionData.getEvs() : null)
                                .tactic(selectionData != null ? selectionData.getTactic() : "Unknown")
                                .tacticType(selectionData != null ? selectionData.getTacticType() : "Unknown")
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
            log.info("DEBUG: Found session with ID: {}, scenarioId: {}", session.getId(), session.getConcern());
            
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
                                    .tacticType(choice.getTacticType())
                                    .build();
                        })
                        .collect(Collectors.toList());
                log.info("DEBUG: Returning {} selection DTOs", result.size());
                return result;
            }
            
            // Fall back to legacy method for backward compatibility
            log.info("DEBUG: No stored choices found, falling back to legacy method");
            if (session.getConcern() == null || session.getSelectedChoices() == null) {
                log.info("DEBUG: No scenario ID or selected choices, returning empty list");
                return new ArrayList<>();
            }
            
            // Get scenario data from ScenarioService
            JsonNode scenarioData = scenarioService.getScenarioData(session.getConcern());
            List<SelectionDataDTO> selections = new ArrayList<>();
            
            // Process each user choice
            for (int i = 0; i < session.getSelectedChoices().size(); i++) {
                SelectionDataDTO selectionData = session.getSelectedChoices().get(i);
                
                // Find the matching choice in scenario data and get its EVS and tactic
                if (selectionData != null) {
                    selections.add(selectionData);
                } else {
                    // Create a basic entry if we can't find the choice data
                    selections.add(SelectionDataDTO.builder()
                            .step(i + 1)
                            .choice("unknown")
                            .evs(null)
                            .tactic("Unknown")
                            .tacticType("Unknown")
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
        
        if (session.getConcern() == null) {
            throw new ResourceNotFoundException("Scenario not found for session: " + sessionId);
        }
        
        try {
            // Get scenario data from ScenarioService
            JsonNode scenarioData = scenarioService.getScenarioData(session.getConcern());
            
            List<DecisionTreeStepDTO> steps = new ArrayList<>();
            
            // Try to get stored choices first
            List<PracticeSessionChoice> storedChoices = practiceSessionChoiceRepository.findByPracticeSessionIdOrderByStepNumber(sessionId);
            List<SelectionDataDTO> userChoices;
            
            if (!storedChoices.isEmpty()) {
                userChoices = storedChoices.stream()
                        .map(choice -> new SelectionDataDTO(
                                choice.getStepNumber(),
                                choice.getChoiceText(),
                                choice.getEvsScore(),
                                choice.getTactic(),
                                choice.getTacticType()
                        ))
                        .collect(Collectors.toList());
            } else {
                userChoices = session.getSelectedChoices() != null ? session.getSelectedChoices() : new ArrayList<>();
            }
            
            // Trace through the scenario following the user's path
            String currentStatementId = scenarioData.get("starting_statement_id").asText();
            
            for (int stepIndex = 0; stepIndex < 10 && currentStatementId != null; stepIndex++) {
                JsonNode statement = scenarioData.get("statements").get(currentStatementId);
                if (statement == null) break;
                
                SelectionDataDTO userChoice = stepIndex < userChoices.size() ? userChoices.get(stepIndex) : null;
                
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
                        if (choiceText.equals(userChoice.getChoice())) {
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
        // First try the provided scenario data
        SelectionDataDTO result = searchChoiceInScenario(scenarioData, userChoice, step);
        if (result != null) {
            return result;
        }
        
        // If not found, try to load alternative scenario versions and search there
        String scenarioId = scenarioData.get("id") != null ? scenarioData.get("id").asText() : null;
        if (scenarioId != null) {
            log.info("Choice '{}' not found in primary scenario, searching alternative versions for {}", userChoice, scenarioId);
            
            // Try both scenario versions
            String[] scenarioPaths = {
                "scenarios/with fallacy/" + scenarioId + ".json",
                "scenarios/" + scenarioId + ".json"
            };
            
            for (String scenarioPath : scenarioPaths) {
                try {
                    ClassPathResource resource = new ClassPathResource(scenarioPath);
                    if (resource.exists()) {
                        JsonNode alternativeScenario = objectMapper.readTree(resource.getInputStream());
                        result = searchChoiceInScenario(alternativeScenario, userChoice, step);
                        if (result != null) {
                            log.info("Found choice '{}' in alternative scenario: {}", userChoice, scenarioPath);
                            return result;
                        }
                    }
                } catch (Exception e) {
                    log.debug("Could not load alternative scenario from {}: {}", scenarioPath, e.getMessage());
                }
            }
        }
        
        log.warn("Could not find choice data for '{}' in any scenario version", userChoice);
        return null;
    }
    
    private SelectionDataDTO searchChoiceInScenario(JsonNode scenarioData, String userChoice, int step) {
        try {
            JsonNode statements = scenarioData.get("statements");
            if (statements != null) {
                for (JsonNode statement : statements) {
                    JsonNode choices = statement.get("user_choices");
                    if (choices != null && choices.isArray()) {
                        for (JsonNode choice : choices) {
                            if (choice.get("choice").asText().equals(userChoice)) {
                                // Try multiple field names for EVS score
                                JsonNode evsNode = choice.get("evs_score");
                                if (evsNode == null) {
                                    evsNode = choice.get("EVS");
                                }
                                double evsScore = (evsNode != null) ? evsNode.asDouble() : 0.0;
                                
                                // Try multiple field names for tactic
                                String tactic = "Unknown";
                                if (choice.get("tactic") != null) {
                                    tactic = choice.get("tactic").asText();
                                } else if (choice.get("tactic_type") != null) {
                                    tactic = choice.get("tactic_type").asText();
                                } else if (choice.get("category") != null) {
                                    tactic = choice.get("category").asText();
                                }
                                
                                return SelectionDataDTO.builder()
                                        .step(step)
                                        .choice(userChoice)
                                        .evs(evsScore)
                                        .tactic(tactic)
                                        .build();
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Error searching for choice '{}' in scenario: {}", userChoice, e.getMessage());
        }
        return null;
    }
    
    // Helper method to map entity to response DTO
    private String extractScenarioType(String scenarioId) {
        log.info("🔍 EXTRACT SCENARIO TYPE DEBUG - Input scenarioId: '{}'", scenarioId);
        
        if (scenarioId == null) {
            log.warn("⚠️ EXTRACT SCENARIO TYPE - scenarioId is null, returning 'unknown'");
            return "unknown";
        }
        
        try {
            // Get the actual scenario data to determine the type
            log.info("🔍 EXTRACT SCENARIO TYPE - Calling scenarioService.getScenarioData for: '{}'", scenarioId);
            JsonNode scenarioData = scenarioService.getScenarioData(scenarioId);
            
            if (scenarioData != null && scenarioData.has("concern")) {
                String concern = scenarioData.get("concern").asText().toLowerCase();
                log.info("🔍 EXTRACT SCENARIO TYPE - Found concern: '{}'", concern);
                
                // Map concern types to our scenario completion types
                if (concern.contains("privacy")) {
                    log.info("✅ EXTRACT SCENARIO TYPE - Detected PRIVACY scenario");
                    return "privacy";
                } else if (concern.contains("inequality") || concern.contains("bias") || concern.contains("accessibility")) {
                    log.info("✅ EXTRACT SCENARIO TYPE - Detected ACCESSIBILITY scenario");
                    return "accessibility";
                } else if (concern.contains("transparency")) {
                    // For now, map transparency to accessibility scenarios
                    // This can be adjusted based on your categorization needs
                    log.info("✅ EXTRACT SCENARIO TYPE - Detected TRANSPARENCY scenario, mapping to ACCESSIBILITY");
                    return "accessibility";
                } else {
                    log.warn("⚠️ EXTRACT SCENARIO TYPE - Unknown concern type: '{}'", concern);
                }
            } else {
                log.warn("⚠️ EXTRACT SCENARIO TYPE - scenarioData is null or missing 'concern' field");
                if (scenarioData != null) {
                    log.info("🔍 EXTRACT SCENARIO TYPE - Available fields in scenarioData: {}", scenarioData.fieldNames());
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ EXTRACT SCENARIO TYPE - Could not determine scenario type for scenarioId: {}, error: {}", scenarioId, e.getMessage());
        }
        
        // Fallback to old method if scenario data is not available
        log.info("🔍 EXTRACT SCENARIO TYPE - Falling back to string parsing method");
        if (scenarioId.startsWith("accessibility")) {
            log.info("✅ EXTRACT SCENARIO TYPE - Fallback detected ACCESSIBILITY (string starts with 'accessibility')");
            return "accessibility";
        } else if (scenarioId.startsWith("privacy")) {
            log.info("✅ EXTRACT SCENARIO TYPE - Fallback detected PRIVACY (string starts with 'privacy')");
            return "privacy";
        }
        
        log.warn("⚠️ EXTRACT SCENARIO TYPE - Returning 'unknown' for scenarioId: '{}'", scenarioId);
        return "unknown";
    }

    private PracticeSessionResponseDTO mapToResponseDTO(PracticeSession entity) {
        // Get choices from the new relationship
        List<SelectionDataDTO> choices = new ArrayList<>();
        
        if (entity.getPracticeSessionChoices() != null) {
            choices = entity.getPracticeSessionChoices().stream()
                    .sorted((c1, c2) -> Integer.compare(c1.getStepNumber(), c2.getStepNumber()))
                    .map(choice -> new SelectionDataDTO(
                                choice.getStepNumber(),
                                choice.getChoiceText(),
                                choice.getEvsScore(),
                                choice.getTactic(),
                                choice.getTacticType()
                        ))
                    .collect(Collectors.toList());
        } else if (entity.getSelectedChoices() != null) {
            // Fallback for backward compatibility
            choices.addAll(entity.getSelectedChoices());
        }
        
        return PracticeSessionResponseDTO.builder()
                .id(entity.getId())
                .userId(entity.getUser().getId())
                .conversationId(entity.getConversationId())
                .userFullName(entity.getUser().getFullName())
                .userEmail(entity.getUser().getEmail())
                .managerType(entity.getManagerType())
                .concern(entity.getConcern())
                .selectedChoices(choices)
                .createdAt(entity.getCreatedAt())
                .score(entity.getScore())
                .build();
    }

    @Override
    @Transactional
    public void setAutoOpenTacticsFlag(UUID userId, UUID conversationId, Map<String, Object> practiceData) {
        log.info("Setting auto-open tactics flag for user: {} and conversation: {}", userId, conversationId);
        
        try {
            User user = userService.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));
            
            // Convert practice data to JSON string
            String practiceDataJson = null;
            if (practiceData != null) {
                practiceDataJson = objectMapper.writeValueAsString(practiceData);
            }
            
            // Check if flag already exists for this user and conversation
            Optional<PracticeTacticsFlag> existingFlag = practiceTacticsFlagRepository
                    .findByUser_IdAndConversationId(userId, conversationId);
            
            if (existingFlag.isPresent()) {
                // Update existing flag
                PracticeTacticsFlag flag = existingFlag.get();
                flag.setShouldAutoOpen(true);
                flag.setPracticeDataJson(practiceDataJson);
                practiceTacticsFlagRepository.save(flag);
                log.info("Updated existing auto-open tactics flag for user: {} and conversation: {}", userId, conversationId);
            } else {
                // Create new flag
                PracticeTacticsFlag flag = PracticeTacticsFlag.builder()
                        .user(user)
                        .conversationId(conversationId)
                        .shouldAutoOpen(true)
                        .practiceDataJson(practiceDataJson)
                        .build();
                practiceTacticsFlagRepository.save(flag);
                log.info("Created new auto-open tactics flag for user: {} and conversation: {}", userId, conversationId);
            }
            
        } catch (Exception e) {
            log.error("Error setting auto-open tactics flag: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to set auto-open tactics flag", e);
        }
    }

    @Override
    @Transactional
    public Map<String, Object> getAndClearAutoOpenTacticsFlag(UUID userId, UUID conversationId) {
        log.info("Getting and clearing auto-open tactics flag for user: {} and conversation: {}", userId, conversationId);
        
        Map<String, Object> result = new HashMap<>();
        result.put("shouldAutoOpen", false);
        result.put("practiceData", null);
        
        try {
            Optional<PracticeTacticsFlag> flagOpt = practiceTacticsFlagRepository
                    .findByUser_IdAndConversationId(userId, conversationId);
            
            if (flagOpt.isPresent()) {
                PracticeTacticsFlag flag = flagOpt.get();
                
                if (flag.getShouldAutoOpen()) {
                    result.put("shouldAutoOpen", true);
                    
                    // Parse practice data from JSON
                    if (flag.getPracticeDataJson() != null) {
                        try {
                            Map<String, Object> practiceData = objectMapper.readValue(
                                    flag.getPracticeDataJson(), 
                                    objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Object.class)
                            );
                            result.put("practiceData", practiceData);
                        } catch (Exception e) {
                            log.warn("Failed to parse practice data JSON: {}", e.getMessage());
                        }
                    }
                    
                    // Clear the flag after reading
                    practiceTacticsFlagRepository.delete(flag);
                    log.info("Auto-open tactics flag found and cleared for user: {} and conversation: {}", userId, conversationId);
                }
            } else {
                log.info("No auto-open tactics flag found for user: {} and conversation: {}", userId, conversationId);
            }
            
        } catch (Exception e) {
            log.error("Error getting auto-open tactics flag: {}", e.getMessage(), e);
        }
        
        return result;
    }

    @Override
    @Transactional
    public Map<String, Object> getLatestPracticeSessionData(UUID userId) {
        log.info("Getting latest practice session data for user: {}", userId);
        
        try {
            // Get the most recent practice session for the user
            List<PracticeSession> sessions = practiceSessionRepository.findByUser_Id(userId);
            
            if (sessions.isEmpty()) {
                throw new ResourceNotFoundException("No practice sessions found for user: " + userId);
            }
            
            // Sort by creation date to get the latest
            PracticeSession latestSession = sessions.stream()
                    .max((s1, s2) -> s1.getCreatedAt().compareTo(s2.getCreatedAt()))
                    .orElseThrow(() -> new ResourceNotFoundException("No practice sessions found"));
            
            // Get the choices for this session
            List<PracticeSessionChoice> choices = practiceSessionChoiceRepository
                    .findByPracticeSessionIdOrderByStepNumber(latestSession.getId());
            
            // Build tactic counts
            Map<String, Integer> tacticCounts = new HashMap<>();
            for (PracticeSessionChoice choice : choices) {
                String tactic = choice.getTactic();
                if (tactic != null && !tactic.equals("Unknown")) {
                    tacticCounts.put(tactic, tacticCounts.getOrDefault(tactic, 0) + 1);
                }
            }
            
            // Get scenario information
            String scenarioTitle = "Practice Scenario";
            String issue = "Ethical Decision-Making";
            
            if (latestSession.getConcern() != null) {
                try {
                    JsonNode scenarioData = scenarioService.getScenarioData(latestSession.getConcern());
                    if (scenarioData != null) {
                        scenarioTitle = scenarioData.get("title") != null ? 
                                scenarioData.get("title").asText() : scenarioTitle;
                        issue = scenarioData.get("issue") != null ? 
                                scenarioData.get("issue").asText() : issue;
                    }
                } catch (Exception e) {
                    log.warn("Could not load scenario data for session: {}", latestSession.getId());
                }
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("tacticCounts", tacticCounts);
            result.put("scenarioTitle", scenarioTitle);
            result.put("issue", issue);
            result.put("sessionId", latestSession.getId());
            result.put("score", latestSession.getScore());
            
            log.info("Retrieved latest practice session data for user: {} with {} tactics", userId, tacticCounts.size());
            return result;
            
        } catch (Exception e) {
            log.error("Error getting latest practice session data: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to retrieve latest practice session data", e);
        }
    }
} 