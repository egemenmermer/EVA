package com.ego.ethicai.service;

import com.ego.ethicai.dto.ConversationResponseDTO;
import com.ego.ethicai.dto.request.ConversationCreationRequest;
import com.ego.ethicai.dto.scenario.ScenarioChoiceResponseDTO;
import com.ego.ethicai.dto.scenario.ScenarioSessionResponseDTO;
import com.ego.ethicai.enums.ManagerTypes;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScenarioServiceImpl implements ScenarioService {

    private final EvaLLMClient evaClient;
    private final ConversationService conversationService;   // 👈 add this

    // Active sessions storage
    private final Map<UUID, ScenarioSession> activeSessions = new ConcurrentHashMap<>();

    @Override
    public ScenarioSessionResponseDTO startScenario(UUID userId, String managerType, String concern, UUID sessionId, int difficulty) {
        log.info("Starting dynamic scenario for user {} with managerType={} and concern={} and difficulty={}", userId, managerType, concern, difficulty);

        // Step 1: Generate first manager response
        JsonNode managerStep = evaClient.generateManagerResponse(concern, managerType, difficulty);
        String managerStatement = managerStep.get("manager_statement").asText();

        // Step 2: Generate user choices for that manager statement
        JsonNode responseOptions = evaClient.generateResponseOptions(concern, managerStatement);
        log.info("Response options: {}", responseOptions.toString());

        List<Map<String, Object>> choices = new ArrayList<>();
        JsonNode userChoices = responseOptions.get("user_choices");
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

        ConversationCreationRequest req = new ConversationCreationRequest();
        req.setTitle(concern);
        req.setManagerType(ManagerTypes.valueOf(managerType)); // Convert string to enum
        req.setUserId(userId);

        ConversationResponseDTO conversation = conversationService.startConversation(req);

        // Use the conversationId that was persisted 
        UUID conversationId = conversation.getConversationId();

        // Initialize session
        ScenarioSession session = new ScenarioSession();

        session.setUserId(userId);
        session.setSessionId(sessionId);
        session.setManagerType(managerType);
        session.setConcern(concern);
        session.setDifficulty(difficulty);
        session.setCurrentManagerStatement(managerStatement);
        session.setCurrentChoices(userChoices);
        session.setCurrentStep(1);
        session.setChoiceHistory(new ArrayList<>());
        session.setEvsHistory(new ArrayList<>());
        session.setCategoryHistory(new ArrayList<>());
        session.setRecoveryUsed(false);
        activeSessions.put(sessionId, session);

        log.info("Returning choices: {}", choices);

        return ScenarioSessionResponseDTO.builder()
                .sessionId(sessionId)
                .conversationId(conversationId)
                .scenarioTitle(concern)
                .scenarioDescription("Generated scenario on " + concern + " with manager type " + managerType)
                .issue(concern)
                .concern(concern)
                .difficulty(difficulty)
                .managerType(managerType)
                .currentStatement(managerStatement)
                .choices(choices)
                .currentStep(1)
                .isComplete(false)
                .build();
    }
        
    @Override
    public ScenarioChoiceResponseDTO processChoice(UUID userId, UUID sessionId,
                                                    Integer choiceIndex, String unusedStatementId, int end) {
        ScenarioSession session = activeSessions.get(sessionId);
        if (session == null) {
            throw new RuntimeException("Session not found: " + sessionId);
        }

        if(end == 1){
            return ScenarioChoiceResponseDTO.builder()
            .sessionId(sessionId)
            .scenarioId("dynamic")
            .currentStep(session.getCurrentStep())
            .isComplete(true) // no fixed endings
            .build(); 
        }

        JsonNode currentChoices = session.getCurrentChoices();
        if ((currentChoices == null || choiceIndex >= currentChoices.size()) && choiceIndex != 99) {
            throw new RuntimeException("Invalid choice index: " + choiceIndex);
        }

        JsonNode selectedChoice = currentChoices.get(choiceIndex);
        String choiceText = selectedChoice.get("choice").asText();
        String category = selectedChoice.get("category").asText();
        int evs = selectedChoice.has("EVS") ? selectedChoice.get("EVS").asInt() : 0;

        // Record the choice in session
        session.getChoiceHistory().add(choiceText);
        session.getEvsHistory().add(evs);
        session.getCategoryHistory().add(category);
        session.setCurrentStep(session.getCurrentStep() + 1);

        String nextManagerStatement = "";
        List<Map<String, Object>> choices = new ArrayList<>();
        
        // Step 1: Generate next manager response based on the choice
        JsonNode managerStep = evaClient.generateManagerResponse(choiceText, session.getManagerType(), session.getDifficulty());
        nextManagerStatement = managerStep.get("manager_statement").asText();
        session.setCurrentManagerStatement(nextManagerStatement);

        // Step 2: Generate new user choices for that manager statement
        JsonNode responseOptions = evaClient.generateResponseOptions(session.getConcern(), nextManagerStatement);
        session.setCurrentChoices(responseOptions.get("user_choices"));
        
        JsonNode nextUserChoices = responseOptions.get("user_choices");
        if (nextUserChoices != null) {
            for (int i = 0; i < nextUserChoices.size(); i++) {
                JsonNode choice = nextUserChoices.get(i);
                Map<String, Object> choiceMap = new HashMap<>();
                choiceMap.put("index", i);
                choiceMap.put("text", choice.get("choice").asText());
                choiceMap.put("category", choice.get("category").asText());
                choices.add(choiceMap);
            }
        }
        
        return ScenarioChoiceResponseDTO.builder()
                .sessionId(sessionId)
                .scenarioId("dynamic")
                .nextStatement(nextManagerStatement)
                .nextChoices(choices)
                .currentStep(session.getCurrentStep())
                .evs(evs)
                .category(category)
                .isComplete(false) // no fixed endings
                .build();
    }
        
        
            @Override
            public JsonNode getScenarioData(String scenarioId) {
                throw new UnsupportedOperationException("Dynamic scenarios do not support static data loading");
            }
        
    // Session object for dynamic scenarios
    private static class ScenarioSession {
        private UUID userId;
        private UUID sessionId;
        private String managerType;
        private String concern;
        private int difficulty;
        private String currentManagerStatement;
        private JsonNode currentChoices;
        private int currentStep;
        private List<String> choiceHistory;
        private List<Integer> evsHistory;
        private List<String> categoryHistory;
        private boolean recoveryUsed;
        
        public UUID getUserId() { return userId; }
    
        public void setUserId(UUID userId) { this.userId = userId; }

        public UUID getSessionId() { return sessionId; }
        public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }

        public String getManagerType() { return managerType; }
        public void setManagerType(String managerType) { this.managerType = managerType; }

        public String getConcern() { return concern; }
        public void setConcern(String concern) { this.concern = concern; }

        public int getDifficulty() {return difficulty;}
        public void setDifficulty(int difficulty) { this.difficulty = difficulty; }

        public String getCurrentManagerStatement() { return currentManagerStatement; }
        public void setCurrentManagerStatement(String currentManagerStatement) { this.currentManagerStatement = currentManagerStatement; }

        public JsonNode getCurrentChoices() { return currentChoices; }
        public void setCurrentChoices(JsonNode currentChoices) { this.currentChoices = currentChoices; }

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

    @Override
public Map<String, Object> generateSessionFeedback(UUID userId, UUID sessionId) {
    ScenarioSession session = activeSessions.get(sessionId);
    if (session == null) {
        throw new RuntimeException("Session not found: " + sessionId);
    }

    int totalEvs = session.getEvsHistory().stream().mapToInt(Integer::intValue).sum();
    double avgEvs = session.getEvsHistory().isEmpty() ? 0 :
            (double) totalEvs / session.getEvsHistory().size();

    // Count tactics
    Map<String, Integer> tacticCounts = new HashMap<>();
    for (String tactic : session.getCategoryHistory()) {
        tacticCounts.put(tactic, tacticCounts.getOrDefault(tactic, 0) + 1);
    }

    // Find most used tactic
    String mostUsedTactic = tacticCounts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("None");

    // Build strengths & improvement feedback
    List<String> strengths = new ArrayList<>();
    List<String> improvements = new ArrayList<>();
    String performanceLevel = "Unsure";


    if (avgEvs >= 0.8) {
        strengths.add("Excellent performance — strong ethical advocacy in most decisions.");
        performanceLevel = "Excellent";
    } else if (avgEvs < .8 & avgEvs >= 0.5) {
        strengths.add("Good performance — some strong advocacy, with room to improve.");
        performanceLevel = "Good";
    } else if (avgEvs < 0.5 & avgEvs >= 0.3){
        improvements.add("Fair performance — consider focusing more on ethical principles.");
        performanceLevel = "Fair";
    }
    else if (avgEvs < 0.3) {
        improvements.add("Needs improvement — little to no arugmentation tactics used.");
        performanceLevel = "Needs Improvement";
    }
    if (tacticCounts.size() < 2) {
        improvements.add("Try diversifying your approach by using a wider variety of tactics.");
    }

    Map<String, Object> feedback = new HashMap<>();
    feedback.put("totalEvs", totalEvs);
    feedback.put("averageEvs", avgEvs);
    feedback.put("performanceLevel", performanceLevel);
    feedback.put("choiceHistory", session.getChoiceHistory());
    feedback.put("categoryHistory", session.getCategoryHistory());
    feedback.put("evsHistory", session.getEvsHistory());
    feedback.put("tacticCounts", tacticCounts);
    feedback.put("mostUsedTactic", mostUsedTactic);
    feedback.put("strengths", strengths);
    feedback.put("improvements", improvements);

    return feedback;
}

@Override
public Map<String, String> suggestScenarioForUser(UUID userId, String userQuery) {
    // Just echo the user's query directly as concern
    return Map.of(
        "concern", userQuery.trim()
        // managerType will come from frontend, so we don’t set it here
    );
}
}
       

