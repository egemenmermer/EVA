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
                // Handle both field name variations (old scenarios use "category", new ones use "tactic")
                JsonNode categoryNode = choice.get("category");
                if (categoryNode == null) {
                    categoryNode = choice.get("tactic");
                }
                choiceMap.put("category", categoryNode != null ? categoryNode.asText() : "Unknown");
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
        
        // Handle both field name variations for category
        JsonNode categoryNode = selectedChoice.get("category");
        if (categoryNode == null) {
            categoryNode = selectedChoice.get("tactic");
        }
        String category = categoryNode != null ? categoryNode.asText() : "Unknown";
        
        // Handle both field name variations for EVS score
        JsonNode evsNode = selectedChoice.get("EVS");
        if (evsNode == null) {
            evsNode = selectedChoice.get("evs_score");
        }
        int evs = evsNode != null ? evsNode.asInt() : 0;
        String nextStatementId = selectedChoice.get("leads_to").asText();
        
        // Don't generate hardcoded feedback - let EVA handle feedback naturally
        
        session.getChoiceHistory().add(choiceText);
        session.getEvsHistory().add(evs);
        session.getCategoryHistory().add(category);
        session.setCurrentStatementId(nextStatementId);
        session.setCurrentStep(session.getCurrentStep() + 1);
        
        // Check if scenario is complete
        boolean isComplete = nextStatementId.startsWith("end") || session.getCurrentStep() > 7;
        
        log.info("Processing choice for session {}: step={}, nextStatementId={}, isComplete={}", 
                sessionId, session.getCurrentStep(), nextStatementId, isComplete);
        
        ScenarioChoiceResponseDTO.ScenarioChoiceResponseDTOBuilder responseBuilder = ScenarioChoiceResponseDTO.builder()
                .sessionId(sessionId)
                .scenarioId(scenarioId)
                .currentStep(session.getCurrentStep())
                .evs(evs)
                .category(category)
                .isComplete(isComplete);
        
        if (isComplete) {
            log.info("Scenario completed for session {}: generating summary", sessionId);
            // Generate session summary
            Map<String, Object> summary = generateSessionSummary(session, scenario);
            responseBuilder.sessionSummary(summary);
        } else {
            // Get next statement and choices
            JsonNode nextStatement = statements.get(nextStatementId);
            if (nextStatement != null) {
                log.info("Found next statement for session {}: {}", sessionId, nextStatementId);
                List<Map<String, Object>> nextChoices = new ArrayList<>();
                JsonNode nextUserChoices = nextStatement.get("user_choices");
                
                if (nextUserChoices != null) {
                    for (int i = 0; i < nextUserChoices.size(); i++) {
                        JsonNode choice = nextUserChoices.get(i);
                        Map<String, Object> choiceMap = new HashMap<>();
                        choiceMap.put("index", i);
                        choiceMap.put("text", choice.get("choice").asText());
                        // Handle both field name variations for category
                        JsonNode nextCategoryNode = choice.get("category");
                        if (nextCategoryNode == null) {
                            nextCategoryNode = choice.get("tactic");
                        }
                        choiceMap.put("category", nextCategoryNode != null ? nextCategoryNode.asText() : "Unknown");
                        nextChoices.add(choiceMap);
                    }
                }
                
                responseBuilder
                        .nextStatementId(nextStatementId)
                        .nextStatement(nextStatement.get("text").asText())
                        .nextChoices(nextChoices);
            } else {
                log.error("Next statement not found for session {}: {}", sessionId, nextStatementId);
                throw new RuntimeException("Next statement not found: " + nextStatementId);
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
            "scenarioId", issueType + "_" + managerType,
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
            "scenarioId", issueType + "_" + managerType,
            "issue", issueType.substring(0, 1).toUpperCase() + issueType.substring(1),
            "managerType", managerType.toUpperCase()
        );
    }
    
    @Override
    public List<Map<String, Object>> getAvailableScenarios() {
        List<Map<String, Object>> scenarios = new ArrayList<>();
        
        String[] scenarioIds = {
            "privacy_puppeteer", "privacy_diluter", "privacy_camouflager",
            "accessibility_puppeteer", "accessibility_diluter", "accessibility_camouflager"
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
        log.info("Raw EVS total: {}, EVS history: {}", totalEvs, session.getEvsHistory());
        
        // Convert raw EVS to 0-10 scale
        // Dynamic scaling based on actual number of choices made
        int numChoices = session.getEvsHistory().size();
        int minPossibleScore = numChoices * 0;    // Worst case: all 0 choices (bad choices)
        int maxPossibleScore = numChoices * 1;    // Best case: all +1 choices (good choices)
        
        // Scale to 0-10 range based on actual range
        double scaledScore;
        if (maxPossibleScore == minPossibleScore) {
            scaledScore = 5.0; // Default middle score if no range
        } else {
            scaledScore = ((double)(totalEvs - minPossibleScore) / (maxPossibleScore - minPossibleScore)) * 10.0;
        }
        
        // Keep decimal precision, round to 1 decimal place
        double finalScore = Math.max(0.0, Math.min(10.0, Math.round(scaledScore * 10.0) / 10.0));
        log.info("Dynamic scaling: numChoices={}, raw={}, min={}, max={}, scaledScore={}, finalScore={}", 
                numChoices, totalEvs, minPossibleScore, maxPossibleScore, scaledScore, finalScore);
        
        double averageEvs = session.getEvsHistory().isEmpty() ? 0 : 
                           (double) totalEvs / session.getEvsHistory().size();
        
        // Count tactic categories used
        Map<String, Integer> tacticCounts = new HashMap<>();
        for (String category : session.getCategoryHistory()) {
            tacticCounts.put(category, tacticCounts.getOrDefault(category, 0) + 1);
        }
        
        // Determine performance level based on final score (0-10 scale)
        String performanceLevel;
        if (finalScore >= 8.0) {
            performanceLevel = "Excellent";
        } else if (finalScore >= 6.0) {
            performanceLevel = "Good";
        } else if (finalScore >= 4.0) {
            performanceLevel = "Fair";
        } else {
            performanceLevel = "Needs Improvement";
        }
        
        // Generate detailed feedback about user's decisions and tactics
        Map<String, Object> detailedFeedback = generateDetailedFeedback(session, finalScore);
        
        summary.put("totalEvs", finalScore); // Use scaled score instead of raw EVS
        summary.put("rawEvs", totalEvs); // Keep raw EVS for debugging if needed
        summary.put("averageEvs", Math.round(averageEvs * 100.0) / 100.0);
        summary.put("performanceLevel", performanceLevel);
        summary.put("tacticCounts", tacticCounts);
        summary.put("choiceHistory", session.getChoiceHistory());
        summary.put("categoryHistory", session.getCategoryHistory());
        summary.put("evsHistory", session.getEvsHistory());
        summary.put("scenarioTitle", scenario.get("title").asText());
        summary.put("issue", scenario.get("issue").asText());
        summary.put("managerType", scenario.get("manager_type").asText());
        summary.put("detailedFeedback", detailedFeedback);
        
        return summary;
    }
    
    private Map<String, Object> generateDetailedFeedback(ScenarioSession session, double finalScore) {
        Map<String, Object> feedback = new HashMap<>();
        
        // Analyze user's decision patterns
        List<String> strengths = new ArrayList<>();
        List<String> improvementAreas = new ArrayList<>();
        List<String> tacticAnalysis = new ArrayList<>();
        
        // Count high-scoring decisions (EVS >= 1)
        long strongDecisions = session.getEvsHistory().stream().filter(evs -> evs >= 1).count();
        long passiveDecisions = session.getEvsHistory().stream().filter(evs -> evs >= 0 && evs < 1).count();
        long complianceDecisions = session.getEvsHistory().stream().filter(evs -> evs < 0).count();
        
        // Analyze specific tactics used
        Map<String, Long> tacticTypes = new HashMap<>();
        session.getCategoryHistory().forEach(category -> {
            tacticTypes.put(category, tacticTypes.getOrDefault(category, 0L) + 1);
        });
        
        // Get most used tactics
        String mostUsedTactic = tacticTypes.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("Mixed Approach");
        
        long tacticsCount = tacticTypes.size();
        
        // Generate tactical strengths based on actual usage patterns
        if (strongDecisions >= 6) {
            strengths.add("Consistently used strong ethical argumentation tactics, particularly excelling with '" + mostUsedTactic + "' strategies");
            strengths.add("Demonstrated effective resistance to unethical pressure by employing " + tacticsCount + " different persuasive tactics throughout the scenario");
        } else if (strongDecisions >= 3) {
            strengths.add("Showed strong ethical reasoning in key moments using '" + mostUsedTactic + "' and other persuasive tactics");
            strengths.add("Good tactical diversity with " + tacticsCount + " different argumentation approaches when taking firm ethical stances");
        }
        
        // Specific tactic-based strengths
        if (tacticTypes.getOrDefault("Persuasive Rhetoric", 0L) >= 3) {
            strengths.add("Excellent command of 'Persuasive Rhetoric' tactics - used effectively " + tacticTypes.get("Persuasive Rhetoric") + " times for strong ethical advocacy");
        }
        
        if (tacticTypes.getOrDefault("Making It Visible", 0L) >= 2) {
            strengths.add("Strong use of 'Making It Visible' tactics to highlight ethical concerns and their implications");
        }
        
        if (tacticTypes.getOrDefault("Evoking Empathy", 0L) >= 2) {
            strengths.add("Effective application of 'Evoking Empathy' tactics to humanize ethical issues and build emotional connection");
        }
        
        if (tacticTypes.getOrDefault("Appealing to External Standards", 0L) >= 2) {
            strengths.add("Good use of 'Appealing to External Standards' tactics to reference policies, laws, and professional ethics");
        }
        
        if (session.getCategoryHistory().stream().distinct().count() >= 6) {
            strengths.add("Excellent tactical adaptability - employed " + session.getCategoryHistory().stream().distinct().count() + " different argumentation tactics showing versatility in ethical advocacy");
        }
        
        // Generate improvement areas based on tactical weaknesses
        if (complianceDecisions >= 3) {
            improvementAreas.add("Tendency to comply with unethical requests - practice using stronger resistance tactics like 'Personal Moral Appeals' or 'Emphasizing Harm'");
            improvementAreas.add("Consider developing 'Offering Alternatives' tactics to provide constructive solutions when refusing unethical requests");
        }
        
        if (passiveDecisions >= 5) {
            improvementAreas.add("Frequent passive responses - work on developing more assertive tactics like 'Making It Visible' or 'Appealing to External Standards'");
            improvementAreas.add("Practice using 'Persuasive Rhetoric' and 'Reframing' tactics for more proactive ethical advocacy");
        }
        
        if (strongDecisions <= 2) {
            improvementAreas.add("Limited use of strong ethical argumentation tactics - focus on mastering 'Evoking Empathy' and 'Emphasizing Harm' for greater impact");
            improvementAreas.add("Develop proficiency in 'Personal Moral Appeals' and 'Appealing to External Standards' tactics for more compelling ethical positions");
        }
        
        // Specific tactical gaps
        if (tacticTypes.getOrDefault("Persuasive Rhetoric", 0L) == 0) {
            improvementAreas.add("No use of 'Persuasive Rhetoric' tactics - practice emotional and moral appeals for high-impact ethical advocacy");
        }
        
        if (tacticTypes.getOrDefault("Making It Visible", 0L) == 0) {
            improvementAreas.add("Missing 'Making It Visible' tactics - learn to highlight consequences and make ethical issues transparent to others");
        }
        
        if (tacticTypes.getOrDefault("Offering Alternatives", 0L) == 0 && complianceDecisions > 0) {
            improvementAreas.add("Consider learning 'Offering Alternatives' tactics to provide constructive solutions when resisting unethical requests");
        }
        
        // Add tactical analysis summary
        tacticAnalysis.add("Primary tactic used: " + mostUsedTactic + " (" + tacticTypes.getOrDefault(mostUsedTactic, 0L) + " times)");
        tacticAnalysis.add("Total tactical approaches employed: " + tacticsCount);
        tacticAnalysis.add("Tactical effectiveness: " + (strongDecisions > 0 ? "Strong impact when using assertive tactics" : "Focus needed on higher-impact tactical approaches"));
        
        feedback.put("strengths", strengths);
        feedback.put("improvementAreas", improvementAreas);
        feedback.put("tacticAnalysis", tacticAnalysis);
        feedback.put("decisionBreakdown", Map.of(
            "strongDecisions", strongDecisions,
            "passiveDecisions", passiveDecisions,
            "complianceDecisions", complianceDecisions
        ));
        feedback.put("tacticTypes", tacticTypes);
        
        return feedback;
    }
    
    private String truncateChoice(String choice) {
        return choice.length() > 50 ? choice.substring(0, 47) + "..." : choice;
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