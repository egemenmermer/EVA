package com.ego.ethicai.service;

import com.ego.ethicai.dto.scenario.ScenarioSessionResponseDTO;
import com.ego.ethicai.dto.scenario.ScenarioChoiceResponseDTO;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.Map;
import java.util.UUID;

public interface ScenarioService {

    /**
     * Start a new dynamic scenario.
     *
     * @param userId      The ID of the user starting the scenario
     * @param managerType The type of manager to simulate (e.g., CAMOUFLAGER, CAPITALIST)
     * @param concern     The ethical concern/context (e.g., "privacy", "accessibility")
     * @param sessionId   A unique session identifier
     * @return The initial scenario session response with manager statement and choices
     */
    ScenarioSessionResponseDTO startScenario(UUID userId, String managerType, String concern, UUID sessionId, int difficulty);


    /**
     * Generate session-level feedback after the scenario ends.
     *
     * @param userId    The user who completed the scenario
     * @param sessionId The session ID
     * @return Feedback summary with EVS scores, tactic usage, etc.
     */
    Map<String, Object> generateSessionFeedback(UUID userId, UUID sessionId);

    /**
     * Get scenario data by ID.
     * For dynamic scenarios this may throw UnsupportedOperationException.
     *
     * @param scenarioId Scenario identifier
     * @return Scenario data
     */
    JsonNode getScenarioData(String scenarioId);


    /**
     * Process a user choice in the current scenario step and return the next manager statement + choices.
     *
     * @param userId        The ID of the user continuing the scenario
     * @param sessionId     The active session identifier
     * @param choiceIndex   The index of the chosen option
     * @param end 
     * @return The next scenario response containing the manager statement and user choices
     */
    ScenarioChoiceResponseDTO processChoice(UUID userId, UUID sessionId,Integer choiceIndex, String unusedStatementId, int end, boolean labelsVisible);

        /**
     * Process a user choice in the current scenario step and return the next manager statement + choices.
     *
     * @param userId        The ID of the user continuing the scenario
     * @param userQuery    The user's input or query
     * @return The scenario
     */
    Map<String, String> suggestScenarioForUser(UUID userId, String userQuery);



}
