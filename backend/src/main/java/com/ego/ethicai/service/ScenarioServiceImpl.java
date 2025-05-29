package com.ego.ethicai.service;

import com.ego.ethicai.dto.scenario.ScenarioSessionResponseDTO;
import com.ego.ethicai.dto.scenario.ScenarioChoiceResponseDTO;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScenarioServiceImpl implements ScenarioService {
    
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;
    
    // Cache for loaded scenarios
    private final Map<String, JsonNode> scenarioCache = new ConcurrentHashMap<>();
    
    // Active sessions storage
    private final Map<String, ScenarioSession> activeSessions = new ConcurrentHashMap<>();
    
    @Override
    public ScenarioSessionResponseDTO startScenario(UUID userId, String scenarioId, String sessionId) {
        log.info("Starting scenario {} for user {} with session {}", scenarioId, userId, sessionId);
        
        JsonNode scenario = loadScenario(scenarioId);
        if (scenario == null) {
            throw new RuntimeException("Scenario not found: " + scenarioId);
        }
        
        String startingStatementId = scenario.get("starting_statement_id").asText();
        JsonNode statements = scenario.get("statements");
        if (statements == null) {
            throw new RuntimeException("No statements found in scenario: " + scenarioId);
        }
        
        JsonNode startingStatement = statements.get(startingStatementId);
        if (startingStatement == null) {
            throw new RuntimeException("Starting statement not found: " + startingStatementId);
        }
        
        // Create session
        ScenarioSession session = new ScenarioSession();
        session.setUserId(userId);
        session.setScenarioId(scenarioId);
        session.setSessionId(sessionId);
        session.setCurrentStatementId(startingStatementId);
        session.setCurrentStep(1);
        session.setChoiceHistory(new ArrayList<>());
        session.setEvsHistory(new ArrayList<>());
        session.setCategoryHistory(new ArrayList<>());
        
        activeSessions.put(sessionId, session);
        
        // Prepare choices with categories for display
        List<Map<String, Object>> choices = new ArrayList<>();
        JsonNode userChoices = startingStatement.get("user_choices");
        if (userChoices != null) {
            for (int i = 0; i < userChoices.size(); i++) {
                JsonNode choice = userChoices.get(i);
                Map<String, Object> choiceMap = new HashMap<>();
                choiceMap.put("index", i);
                choiceMap.put("text", choice.get("choice").asText());
                choiceMap.put("category", choice.get("category").asText());
                choices.add(choiceMap);
            }
        }
        
        return ScenarioSessionResponseDTO.builder()
                .sessionId(sessionId)
                .scenarioId(scenarioId)
                .scenarioTitle(scenario.get("title").asText())
                .scenarioDescription(scenario.get("description").asText())
                .issue(scenario.get("issue").asText())
                .managerType(scenario.get("manager_type").asText())
                .currentStatementId(startingStatementId)
                .currentStatement(startingStatement.get("text").asText())
                .choices(choices)
                .currentStep(1)
                .isComplete(false)
                .build();
    }
    
    @Override
    public ScenarioChoiceResponseDTO processChoice(UUID userId, String scenarioId, String sessionId, 
                                                  Integer choiceIndex, String currentStatementId) {
        
        ScenarioSession session = activeSessions.get(sessionId);
        if (session == null) {
            throw new RuntimeException("Session not found: " + sessionId);
        }
        
        JsonNode scenario = loadScenario(scenarioId);
        if (scenario == null) {
            throw new RuntimeException("Scenario not found: " + scenarioId);
        }
        
        JsonNode statements = scenario.get("statements");
        if (statements == null) {
            throw new RuntimeException("No statements found in scenario");
        }
        
        // Use session's current statement ID if currentStatementId is null or empty
        String statementId = (currentStatementId != null && !currentStatementId.trim().isEmpty()) 
                            ? currentStatementId : session.getCurrentStatementId();
        
        JsonNode currentStatement = statements.get(statementId);
        if (currentStatement == null) {
            log.error("Current statement not found: {} in scenario: {}", statementId, scenarioId);
            throw new RuntimeException("Current statement not found: " + statementId);
        }
        
        JsonNode userChoices = currentStatement.get("user_choices");
        if (userChoices == null || choiceIndex >= userChoices.size()) {
            throw new RuntimeException("Invalid choice index: " + choiceIndex);
        }
        
        JsonNode selectedChoice = userChoices.get(choiceIndex);
        
        // Record choice
        String choiceText = selectedChoice.get("choice").asText();
        String category = selectedChoice.get("category").asText();
        int evs = selectedChoice.get("EVS").asInt();
        String nextStatementId = selectedChoice.get("leads_to").asText();
        
        // Generate professional feedback
        String feedback = generateProfessionalFeedback(evs, category);
        
        session.getChoiceHistory().add(choiceText);
        session.getEvsHistory().add(evs);
        session.getCategoryHistory().add(category);
        session.setCurrentStatementId(nextStatementId);
        session.setCurrentStep(session.getCurrentStep() + 1);
        
        // Check if scenario is complete
        boolean isComplete = "end".equals(nextStatementId) || session.getCurrentStep() > 5;
        
        ScenarioChoiceResponseDTO.ScenarioChoiceResponseDTOBuilder responseBuilder = ScenarioChoiceResponseDTO.builder()
                .sessionId(sessionId)
                .scenarioId(scenarioId)
                .currentStep(session.getCurrentStep())
                .evs(evs)
                .category(category)
                .feedback(feedback)  // Include professional feedback
                .isComplete(isComplete);
        
        if (isComplete) {
            // Generate session summary
            Map<String, Object> summary = generateSessionSummary(session, scenario);
            responseBuilder.sessionSummary(summary);
        } else {
            // Get next statement and choices
            JsonNode nextStatement = statements.get(nextStatementId);
            if (nextStatement != null) {
                List<Map<String, Object>> nextChoices = new ArrayList<>();
                JsonNode nextUserChoices = nextStatement.get("user_choices");
                
                if (nextUserChoices != null) {
                    for (int i = 0; i < nextUserChoices.size(); i++) {
                        JsonNode choice = nextUserChoices.get(i);
                        Map<String, Object> choiceMap = new HashMap<>();
                        choiceMap.put("index", i);
                        choiceMap.put("text", choice.get("choice").asText());
                        choiceMap.put("category", choice.get("category").asText());
                        nextChoices.add(choiceMap);
                    }
                }
                
                responseBuilder
                        .nextStatementId(nextStatementId)
                        .nextStatement(nextStatement.get("text").asText())
                        .nextChoices(nextChoices);
            }
        }
        
        return responseBuilder.build();
    }
    
    @Override
    public Map<String, String> suggestScenarioForQuery(String userQuery) {
        String query = userQuery.toLowerCase();
        
        // Determine issue type from query
        String issueType = "privacy"; // default
        if (query.contains("accessibility") || query.contains("screen reader") || 
            query.contains("disability") || query.contains("a11y")) {
            issueType = "accessibility";
        }
        
        // Use default manager type for now - this should be enhanced to get from user context
        String managerType = "puppeteer";
        
        return Map.of(
            "scenarioId", issueType + "_" + managerType + "_1",
            "issue", issueType.substring(0, 1).toUpperCase() + issueType.substring(1),
            "managerType", managerType.toUpperCase()
        );
    }
    
    // New method to suggest scenario based on user preference
    public Map<String, String> suggestScenarioForUser(UUID userId, String userQuery) {
        String query = userQuery.toLowerCase();
        
        // Get user's manager type preference
        Optional<User> userOpt = userRepository.findById(userId);
        String managerType = "puppeteer"; // default
        
        if (userOpt.isPresent() && userOpt.get().getManagerTypePreference() != null) {
            managerType = userOpt.get().getManagerTypePreference().toLowerCase();
        }
        
        // Determine issue type from query
        String issueType = "privacy"; // default
        if (query.contains("accessibility") || query.contains("screen reader") || 
            query.contains("disability") || query.contains("a11y")) {
            issueType = "accessibility";
        } else if (query.contains("privacy") || query.contains("data") || query.contains("location") || 
                   query.contains("tracking") || query.contains("personal")) {
            issueType = "privacy";
        }
        
        return Map.of(
            "scenarioId", issueType + "_" + managerType + "_1",
            "issue", issueType.substring(0, 1).toUpperCase() + issueType.substring(1),
            "managerType", managerType.toUpperCase()
        );
    }
    
    @Override
    public List<Map<String, Object>> getAvailableScenarios() {
        List<Map<String, Object>> scenarios = new ArrayList<>();
        
        String[] scenarioIds = {
            "privacy_puppeteer_1", "privacy_diluter_1", "privacy_camouflager_1",
            "accessibility_puppeteer_1", "accessibility_diluter_1", "accessibility_camouflager_1"
        };
        
        for (String scenarioId : scenarioIds) {
            JsonNode scenario = loadScenario(scenarioId);
            if (scenario != null) {
                Map<String, Object> scenarioInfo = new HashMap<>();
                scenarioInfo.put("id", scenarioId);
                scenarioInfo.put("title", scenario.get("title").asText());
                scenarioInfo.put("description", scenario.get("description").asText());
                scenarioInfo.put("issue", scenario.get("issue").asText());
                scenarioInfo.put("managerType", scenario.get("manager_type").asText());
                scenarios.add(scenarioInfo);
            }
        }
        
        return scenarios;
    }
    
    @Override
    public Map<String, Object> generateSessionFeedback(UUID userId, String scenarioId, String sessionId) {
        ScenarioSession session = activeSessions.get(sessionId);
        if (session == null) {
            throw new RuntimeException("Session not found: " + sessionId);
        }
        
        JsonNode scenario = loadScenario(scenarioId);
        return generateSessionSummary(session, scenario);
    }
    
    @Override
    public JsonNode getScenarioData(String scenarioId) {
        JsonNode scenario = loadScenario(scenarioId);
        if (scenario == null) {
            throw new RuntimeException("Scenario not found: " + scenarioId);
        }
        return scenario;
    }
    
    private JsonNode loadScenario(String scenarioId) {
        return scenarioCache.computeIfAbsent(scenarioId, id -> {
            try {
                ClassPathResource resource = new ClassPathResource("scenarios/" + id + ".json");
                return objectMapper.readTree(resource.getInputStream());
            } catch (IOException e) {
                log.error("Failed to load scenario: {}", id, e);
                return null;
            }
        });
    }
    
    private Map<String, Object> generateSessionSummary(ScenarioSession session, JsonNode scenario) {
        Map<String, Object> summary = new HashMap<>();
        
        // Calculate total EVS score
        int totalEvs = session.getEvsHistory().stream().mapToInt(Integer::intValue).sum();
        double averageEvs = session.getEvsHistory().isEmpty() ? 0 : 
                           (double) totalEvs / session.getEvsHistory().size();
        
        // Count tactic categories used
        Map<String, Integer> tacticCounts = new HashMap<>();
        for (String category : session.getCategoryHistory()) {
            tacticCounts.put(category, tacticCounts.getOrDefault(category, 0) + 1);
        }
        
        // Determine performance level
        String performanceLevel;
        if (averageEvs >= 80) {
            performanceLevel = "Excellent";
        } else if (averageEvs >= 60) {
            performanceLevel = "Good";
        } else if (averageEvs >= 40) {
            performanceLevel = "Fair";
        } else {
            performanceLevel = "Needs Improvement";
        }
        
        summary.put("totalEvs", totalEvs);
        summary.put("averageEvs", Math.round(averageEvs * 100.0) / 100.0);
        summary.put("performanceLevel", performanceLevel);
        summary.put("tacticCounts", tacticCounts);
        summary.put("choiceHistory", session.getChoiceHistory());
        summary.put("categoryHistory", session.getCategoryHistory());
        summary.put("evsHistory", session.getEvsHistory());
        summary.put("scenarioTitle", scenario.get("title").asText());
        summary.put("issue", scenario.get("issue").asText());
        summary.put("managerType", scenario.get("manager_type").asText());
        
        return summary;
    }
    
    private String generateProfessionalFeedback(int evs, String category) {
        String[] templates;
        
        if (evs >= 3) {
            templates = new String[]{
                String.format("Strong approach. This %s strategy effectively addresses the ethical concern while maintaining professional credibility.", category),
                String.format("Effective choice. Your %s approach demonstrates thoughtful ethical reasoning with practical application.", category),
                String.format("Well-reasoned response. This %s strategy balances ethical principles with workplace dynamics appropriately.", category)
            };
        } else if (evs == 2) {
            templates = new String[]{
                String.format("Solid approach. This %s strategy addresses the issue, though more direct advocacy might be more impactful.", category),
                String.format("Reasonable choice. Your %s approach shows ethical awareness with room for stronger positioning.", category),
                String.format("Good direction. This %s strategy demonstrates ethical thinking but could be more assertive.", category)
            };
        } else if (evs == 1) {
            templates = new String[]{
                String.format("Cautious approach. This %s strategy shows awareness but may not effectively address the underlying ethical issue.", category),
                String.format("Minimal engagement. Your %s approach acknowledges the concern but lacks substantive ethical advocacy.", category),
                String.format("Conservative choice. This %s strategy is professionally safe but may not create meaningful change.", category)
            };
        } else if (evs == 0) {
            templates = new String[]{
                "Passive response. This approach maintains workplace harmony but doesn't address the ethical concern.",
                "Non-committal choice. This response avoids conflict but may enable continued unethical practices.",
                "Risk-averse approach. This strategy prioritizes immediate comfort over ethical responsibility."
            };
        } else {
            templates = new String[]{
                "Problematic choice. This response may inadvertently support or enable unethical practices.",
                "Concerning approach. This strategy could compromise professional ethical standards.",
                "Risky response. This choice may undermine ethical advocacy opportunities."
            };
        }
        
        // Return a random template from the appropriate array
        return templates[(int) (Math.random() * templates.length)];
    }
    
    // Inner class for session management
    private static class ScenarioSession {
        private UUID userId;
        private String scenarioId;
        private String sessionId;
        private String currentStatementId;
        private int currentStep;
        private List<String> choiceHistory;
        private List<Integer> evsHistory;
        private List<String> categoryHistory;
        
        // Getters and setters
        public UUID getUserId() { return userId; }
        public void setUserId(UUID userId) { this.userId = userId; }
        
        public String getScenarioId() { return scenarioId; }
        public void setScenarioId(String scenarioId) { this.scenarioId = scenarioId; }
        
        public String getSessionId() { return sessionId; }
        public void setSessionId(String sessionId) { this.sessionId = sessionId; }
        
        public String getCurrentStatementId() { return currentStatementId; }
        public void setCurrentStatementId(String currentStatementId) { this.currentStatementId = currentStatementId; }
        
        public int getCurrentStep() { return currentStep; }
        public void setCurrentStep(int currentStep) { this.currentStep = currentStep; }
        
        public List<String> getChoiceHistory() { return choiceHistory; }
        public void setChoiceHistory(List<String> choiceHistory) { this.choiceHistory = choiceHistory; }
        
        public List<Integer> getEvsHistory() { return evsHistory; }
        public void setEvsHistory(List<Integer> evsHistory) { this.evsHistory = evsHistory; }
        
        public List<String> getCategoryHistory() { return categoryHistory; }
        public void setCategoryHistory(List<String> categoryHistory) { this.categoryHistory = categoryHistory; }
    }
} 