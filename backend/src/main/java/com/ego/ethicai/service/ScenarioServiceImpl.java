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
    
    // Helper method to check if user is doing their first practice scenario
    private boolean isFirstTimeUser(UUID userId) {
        if (userId == null) {
            // When userId is null (e.g., for admin panel or general scenario listing), 
            // default to false (regular scenarios)
            return false;
        }
        
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                log.warn("User not found for ID: {}, treating as first-time user", userId);
                return true;
            }
            
            // User is first-time if they haven't completed either accessibility or privacy scenarios
            boolean hasCompletedAccessibility = user.getAccessibilityScenariosCompleted() != null && user.getAccessibilityScenariosCompleted();
            boolean hasCompletedPrivacy = user.getPrivacyScenariosCompleted() != null && user.getPrivacyScenariosCompleted();
            
            boolean isFirstTime = !hasCompletedAccessibility && !hasCompletedPrivacy;
            log.info("User {} first-time check: accessibility={}, privacy={}, isFirstTime={}", 
                    userId, hasCompletedAccessibility, hasCompletedPrivacy, isFirstTime);
            
            return isFirstTime;
        } catch (Exception e) {
            log.error("Error checking if user is first-time: {}", e.getMessage(), e);
            return true; // Default to first-time if there's an error
        }
    }
    
    @Override
    public ScenarioSessionResponseDTO startScenario(UUID userId, String scenarioId, String sessionId) {
        log.info("Starting scenario {} for user {} with session {}", scenarioId, userId, sessionId);
        
        JsonNode scenario = loadScenario(scenarioId, userId);
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
        session.setRecoveryUsed(false);
        
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
                // Handle both field name variations, prioritizing tactic (specific name) over tactic_type for tooltips
                JsonNode categoryNode = choice.get("tactic");
                if (categoryNode == null) {
                    categoryNode = choice.get("tactic_type");
                }
                if (categoryNode == null) {
                    categoryNode = choice.get("category");
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
        
        JsonNode scenario = loadScenario(scenarioId, userId);
        if (scenario == null) {
            throw new RuntimeException("Scenario not found: " + scenarioId);
        }
        
        // Check if session is already complete (prevent duplicate processing)
        if (session.getCurrentStatementId() != null && 
            (session.getCurrentStatementId().endsWith("_ending") || 
             session.getCurrentStatementId().equals("bad_ending") ||
             session.getCurrentStatementId().equals("mid_ending") ||
             session.getCurrentStatementId().equals("good_ending"))) {
            log.info("Session {} is at ending: {}. Completing scenario.", 
                    sessionId, session.getCurrentStatementId());
            
            // Complete the scenario since we're at an ending
            Map<String, Object> summary = generateSessionSummary(session, scenario);
            
            // Add ending message from scenarios endings section
            String endingId = session.getCurrentStatementId();
            JsonNode endings = scenario.get("endings");
            if (endings != null && endings.has(endingId)) {
                JsonNode ending = endings.get(endingId);
                summary.put("endingMessage", ending.get("text").asText());
                summary.put("endingTitle", ending.get("title").asText());
                summary.put("endingLearning", ending.get("learning").asText());
                summary.put("endingType", endingId);
            }
            
            ScenarioChoiceResponseDTO response = ScenarioChoiceResponseDTO.builder()
                    .sessionId(sessionId)
                    .scenarioId(scenarioId)
                    .currentStep(session.getCurrentStep())
                    .evs(0) // No new EVS for completion request
                    .category("NONE") // No category for completion request
                    .isComplete(true)
                    .sessionSummary(summary)
                    .build();
            
            log.info("Returning completion response for session {}: isComplete={}, hasSessionSummary={}", 
                    sessionId, response.isComplete(), response.getSessionSummary() != null);
            
            return response;
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
        
        // Check if choice is disabled due to recovery system
        JsonNode recoveryDisabled = selectedChoice.get("disabled_if_recovery_used");
        if (recoveryDisabled != null && recoveryDisabled.asBoolean() && session.isRecoveryUsed()) {
            throw new RuntimeException("Choice disabled: recovery already used");
        }
        
        // Record choice
        String choiceText = selectedChoice.get("choice").asText();
        
        // Handle field name variations for category/tactic
        // Prioritize tactic (specific name) over tactic_type for tooltips
        JsonNode tacticNode = selectedChoice.get("tactic");
        JsonNode tacticTypeNode = selectedChoice.get("tactic_type");
        String category = tacticNode != null ? tacticNode.asText() : 
                         (tacticTypeNode != null ? tacticTypeNode.asText() : "Unknown");
        
        // Handle EVS score
        JsonNode evsNode = selectedChoice.get("evs_score");
        if (evsNode == null) {
            evsNode = selectedChoice.get("EVS");
        }
        int evs = evsNode != null ? evsNode.asInt() : 0;
        
        String nextStatementId = selectedChoice.get("leads_to").asText();
        
        // Mark recovery as used if this is a recovery choice
        if (recoveryDisabled != null && recoveryDisabled.asBoolean()) {
            session.setRecoveryUsed(true);
        }
        
        // Update session with current choice
        session.getChoiceHistory().add(choiceText);
        session.getEvsHistory().add(evs);
        session.getCategoryHistory().add(category);
        session.setCurrentStep(session.getCurrentStep() + 1);
        
        // Check if we're at step 5 and current statement has score_ranges (cumulative scoring logic)
        JsonNode scoreRanges = currentStatement.get("score_ranges");
        if (scoreRanges != null && !scoreRanges.isNull() && session.getCurrentStep() == 5) {
            // Calculate cumulative EVS score from all steps
            int cumulativeScore = session.getEvsHistory().stream().mapToInt(Integer::intValue).sum();
            nextStatementId = determineNextStatementFromScore(scoreRanges, cumulativeScore);
            log.info("Using cumulative scoring at step {} for session {}: totalEVS={}, nextStatement={}", 
                    session.getCurrentStep(), sessionId, cumulativeScore, nextStatementId);
        }
        
        log.info("Processing choice for session {}: step={}, nextStatementId={}, evs={}, cumulativeEVS={}", 
                sessionId, session.getCurrentStep(), nextStatementId, evs, 
                session.getEvsHistory().stream().mapToInt(Integer::intValue).sum());
        
        // Check if we've reached an ending
        if (nextStatementId.equals("bad_ending") || nextStatementId.equals("mid_ending") || 
            nextStatementId.equals("good_ending")) {
            
            log.info("Reached ending for session {}: {}", sessionId, nextStatementId);
            
            session.setCurrentStatementId(nextStatementId);
            
            // Generate session summary for completion
            Map<String, Object> summary = generateSessionSummary(session, scenario);
            
            // Add ending message from scenarios endings section
            JsonNode endings = scenario.get("endings");
            if (endings != null && endings.has(nextStatementId)) {
                JsonNode ending = endings.get(nextStatementId);
                summary.put("endingMessage", ending.get("text").asText());
                summary.put("endingTitle", ending.get("title").asText());
                summary.put("endingLearning", ending.get("learning").asText());
                summary.put("endingType", nextStatementId);
            }
            
            return ScenarioChoiceResponseDTO.builder()
                    .sessionId(sessionId)
                    .scenarioId(scenarioId)
                    .currentStep(session.getCurrentStep())
                    .evs(evs)
                    .category(category)
                    .isComplete(true)
                    .sessionSummary(summary)
                    .build();
        }
        
        // Get next statement
        JsonNode nextStatement = statements.get(nextStatementId);
        if (nextStatement == null) {
            throw new RuntimeException("Next statement not found: " + nextStatementId);
        }
        
        session.setCurrentStatementId(nextStatementId);
        
        // Get statement text
        String nextStatementText = nextStatement.get("text").asText();
        
        // Build choices list
        List<Map<String, Object>> choices = new ArrayList<>();
        JsonNode nextUserChoices = nextStatement.get("user_choices");
        if (nextUserChoices != null) {
            for (int i = 0; i < nextUserChoices.size(); i++) {
                JsonNode choice = nextUserChoices.get(i);
                
                // Check recovery system
                JsonNode disabledIfRecovery = choice.get("disabled_if_recovery_used");
                if (disabledIfRecovery != null && disabledIfRecovery.asBoolean() && session.isRecoveryUsed()) {
                    continue; // Skip this choice if recovery was already used
                }
                
                Map<String, Object> choiceMap = new HashMap<>();
                choiceMap.put("index", i);
                choiceMap.put("text", choice.get("choice").asText());
                
                // Handle category/tactic
                JsonNode choiceTactic = choice.get("tactic");
                JsonNode choiceTacticType = choice.get("tactic_type");
                String choiceCategory = choiceTactic != null ? choiceTactic.asText() : 
                                       (choiceTacticType != null ? choiceTacticType.asText() : "Unknown");
                choiceMap.put("category", choiceCategory);
                choices.add(choiceMap);
            }
        }
        
        return ScenarioChoiceResponseDTO.builder()
                .sessionId(sessionId)
                .scenarioId(scenarioId)
                .nextStatementId(nextStatementId)
                .nextStatement(nextStatementText)
                .nextChoices(choices)
                .currentStep(session.getCurrentStep())
                .evs(evs)
                .category(category)
                .isComplete(false)
                .build();
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
            JsonNode scenario = loadScenario(scenarioId, null);
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
        
        JsonNode scenario = loadScenario(scenarioId, userId);
        return generateSessionSummary(session, scenario);
    }
    
    @Override
    public JsonNode getScenarioData(String scenarioId) {
        JsonNode scenario = loadScenario(scenarioId, null);
        if (scenario == null) {
            throw new RuntimeException("Scenario not found: " + scenarioId);
        }
        return scenario;
    }
    
    private JsonNode loadScenario(String scenarioId, UUID userId) {
        // Determine if this is a first-time user and create appropriate cache key
        boolean isFirstTime = isFirstTimeUser(userId);
        String cacheKey = scenarioId + (isFirstTime ? "_first_time" : "_regular");
        
        return scenarioCache.computeIfAbsent(cacheKey, key -> {
            try {
                String folder = isFirstTime ? "scenarios/with fallacy/" : "scenarios/";
                ClassPathResource resource = new ClassPathResource(folder + scenarioId + ".json");
                log.info("Loading scenario {} from {} for user {} (first-time: {})", 
                        scenarioId, folder, userId, isFirstTime);
                return objectMapper.readTree(resource.getInputStream());
            } catch (IOException e) {
                log.error("Failed to load scenario: {} from folder for user {}", scenarioId, userId, e);
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
    
    private String formatFinalScoreMessage(Map<String, Object> summary) {
        double finalScore = (Double) summary.get("totalEvs"); // This is actually the scaled final score (0-10)
        int rawEvs = (Integer) summary.get("rawEvs"); // This is the raw EVS total
        int numChoices = ((List<?>) summary.get("evsHistory")).size(); // Get count from EVS history
        
        // Calculate the maximum possible EVS score (each choice can be +1 at most)
        int maxPossibleEvs = numChoices * 1;
        
        // Get tactics information from detailed feedback
        Map<String, Object> detailedFeedback = (Map<String, Object>) summary.get("detailedFeedback");
        Map<String, Long> tacticTypes = (Map<String, Long>) detailedFeedback.get("tacticTypes");
        Map<String, Object> decisionBreakdown = (Map<String, Object>) detailedFeedback.get("decisionBreakdown");
        
        // Calculate tactics statistics
        int totalTacticsUsed = tacticTypes.values().stream().mapToInt(Long::intValue).sum();
        int uniqueTacticsUsed = tacticTypes.size();
        String mostUsedTactic = tacticTypes.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("Mixed Approach");
        long mostUsedCount = tacticTypes.getOrDefault(mostUsedTactic, 0L);
        
        long strongDecisions = (Long) decisionBreakdown.get("strongDecisions");
        long passiveDecisions = (Long) decisionBreakdown.get("passiveDecisions");
        long complianceDecisions = (Long) decisionBreakdown.get("complianceDecisions");
        
        String scoreCategory;
        String feedback;
        
        if (finalScore >= 8.0) {
            scoreCategory = "Excellent";
            feedback = "You consistently made ethical choices that prioritize user needs and company values. Your approach demonstrates strong ethical leadership.";
        } else if (finalScore >= 6.0) {
            scoreCategory = "Good";
            feedback = "You made mostly ethical choices with some room for improvement. Consider the long-term impact of decisions on all stakeholders.";
        } else if (finalScore >= 4.0) {
            scoreCategory = "Fair";
            feedback = "Your choices showed mixed ethical considerations. Reflect on how to better balance competing priorities while maintaining ethical standards.";
        } else {
            scoreCategory = "Needs Improvement";
            feedback = "Consider focusing more on ethical implications and stakeholder impact in your decision-making process.";
        }
        
        return String.format(
            "Great work completing this scenario! Here's your comprehensive performance summary:\n\n" +
            "📊 **Final Score: %d/8 (%s)**\n" +
            "🎯 Total EVS Points: %d/%d\n" +
            "📋 Decisions Made: %d\n\n" +
            "🎭 **Tactics Analysis:**\n" +
            "• Total tactics employed: %d across %d unique types\n" +
            "• Most used tactic: '%s' (%d times)\n" +
            "• Decision types: %d strong, %d passive, %d compliance\n\n" +
            "💡 **Overall Feedback:** %s\n\n" +
            "Your tactical approach shows %s. %s\n\n" +
            "Thank you for practicing ethical decision-making with EVA!",
            rawEvs, scoreCategory, rawEvs, maxPossibleEvs, numChoices,
            totalTacticsUsed, uniqueTacticsUsed, mostUsedTactic, mostUsedCount,
            strongDecisions, passiveDecisions, complianceDecisions, feedback,
            uniqueTacticsUsed >= 6 ? "excellent diversity and adaptability" : 
            uniqueTacticsUsed >= 4 ? "good tactical variety" : 
            uniqueTacticsUsed >= 2 ? "moderate tactical range" : "limited tactical diversity",
            strongDecisions >= 4 ? "Keep leveraging high-impact tactics for ethical advocacy!" :
            strongDecisions >= 2 ? "Consider using more assertive tactics for greater impact." :
            "Focus on developing stronger tactical approaches for ethical situations."
        );
    }
    
    private String truncateChoice(String choice) {
        return choice.length() > 50 ? choice.substring(0, 47) + "..." : choice;
    }
    
    /**
     * Determines the next statement based on cumulative EVS score and score ranges
     */
    private String determineNextStatementFromScore(JsonNode scoreRanges, int cumulativeScore) {
        log.info("Determining next statement from cumulative score: {}", cumulativeScore);
        
        // Iterate through score ranges to find the matching range
        Iterator<Map.Entry<String, JsonNode>> fields = scoreRanges.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            String range = entry.getKey();
            String nextStatement = entry.getValue().asText();
            
            if (isScoreInRange(cumulativeScore, range)) {
                log.info("Score {} matches range '{}', next statement: {}", cumulativeScore, range, nextStatement);
                return nextStatement;
            }
        }
        
        // Default fallback - this shouldn't happen if ranges are properly defined
        log.warn("No matching score range found for score: {}, using default ending", cumulativeScore);
        return "ending_4_balanced_compromise"; // Safe middle ground
    }
    
    /**
     * Checks if a score falls within a given range string (e.g., "6_to_7", "-2_to_-1", "7_and_above")
     */
    private boolean isScoreInRange(int score, String range) {
        try {
            if (range.contains("_to_")) {
                // Handle ranges like "6_to_7", "-2_to_-1"
                String[] parts = range.split("_to_");
                int min = Integer.parseInt(parts[0]);
                int max = Integer.parseInt(parts[1]);
                return score >= min && score <= max;
            } else if (range.endsWith("_and_above")) {
                // Handle ranges like "7_and_above"
                String minStr = range.replace("_and_above", "");
                int min = Integer.parseInt(minStr);
                return score >= min;
            } else if (range.endsWith("_and_below")) {
                // Handle ranges like "-7_and_below"
                String maxStr = range.replace("_and_below", "");
                int max = Integer.parseInt(maxStr);
                return score <= max;
            } else {
                // Handle exact matches like "0"
                int exactScore = Integer.parseInt(range);
                return score == exactScore;
            }
        } catch (NumberFormatException e) {
            log.error("Error parsing score range '{}': {}", range, e.getMessage());
            return false;
        }
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
        private boolean recoveryUsed;
        
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
        
        public boolean isRecoveryUsed() { return recoveryUsed; }
        public void setRecoveryUsed(boolean recoveryUsed) { this.recoveryUsed = recoveryUsed; }
    }
} 