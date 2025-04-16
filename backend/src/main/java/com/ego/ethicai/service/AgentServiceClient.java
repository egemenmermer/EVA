package com.ego.ethicai.service;

import com.ego.ethicai.dto.agent.AgentArtifactResponseDTO;
import com.ego.ethicai.enums.ManagerTypes;

import java.util.UUID;

/**
 * Client interface for communicating with the Agent service
 */
public interface AgentServiceClient {
    
    /**
     * Gets a response from the agent for a user query
     * 
     * @param managerType The type of manager to use
     * @param userQuery The user's query text
     * @param conversationId The UUID of the conversation
     * @return The agent's response text or an error message
     */
    String getAgentResponse(ManagerTypes managerType, String userQuery, UUID conversationId);
    
    /**
     * Generate artifacts related to a query
     * 
     * @param userQuery The user query to generate artifacts for
     * @return The response from the agent containing artifacts
     */
    AgentArtifactResponseDTO generateArtifacts(String userQuery);
} 