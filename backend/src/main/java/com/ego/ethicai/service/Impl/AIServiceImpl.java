package com.ego.ethicai.service.Impl;

import com.ego.ethicai.dto.AIRequestDTO;
import com.ego.ethicai.dto.AIResponseDTO;
import com.ego.ethicai.service.AIService;
import com.ego.ethicai.service.AgentServiceClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AIServiceImpl implements AIService {

    private static final Logger logger = LoggerFactory.getLogger(AIServiceImpl.class);

    private final AgentServiceClient agentServiceClient;

    @Autowired
    public AIServiceImpl(AgentServiceClient agentServiceClient) {
        this.agentServiceClient = agentServiceClient;
        logger.info("AIServiceImpl initialized with AgentServiceClient");
    }

    @Override
    public AIResponseDTO getAIResponse(AIRequestDTO request) {
        try {
            logger.info("Sending request to agent service for query: '{}'", request.getUserQuery());
            
            // Ensure the request has all needed fields
            if (request.getUserQuery() == null || request.getUserQuery().isEmpty()) {
                logger.error("User query is null or empty in AIServiceImpl.getAIResponse");
                return AIResponseDTO.builder()
                    .agentResponse("Error: No query was provided.")
                    .build();
            }
            
            // Call the agent service
            String agentResponse = agentServiceClient.getAgentResponse(
                request.getManagerType(), 
                request.getUserQuery(),
                request.getConversationId()
            );
            
            // Check if the response is valid
            if (agentResponse == null || agentResponse.isEmpty()) {
                logger.error("Received null or empty response from agent service");
                return AIResponseDTO.builder()
                    .agentResponse("Error: The AI agent did not provide a response.")
                    .build();
            }
            
            logger.info("Successfully received response from agent service");
            
            // Build and return the response DTO
            return AIResponseDTO.builder()
                .agentResponse(agentResponse)
                .build();
                
        } catch (Exception e) {
            logger.error("Error getting response from AI agent: {}", e.getMessage(), e);
            return AIResponseDTO.builder()
                .agentResponse("Sorry, I'm having trouble connecting to my AI services right now. Please try again later.")
                .build();
        }
    }
}
