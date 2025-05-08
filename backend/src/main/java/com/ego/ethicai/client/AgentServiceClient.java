package com.ego.ethicai.client;

import com.ego.ethicai.dto.agent.AgentArtifactRequestDTO;
import com.ego.ethicai.dto.agent.AgentArtifactResponseDTO;
import com.ego.ethicai.enums.ManagerTypes;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
@Slf4j
public class AgentServiceClient implements com.ego.ethicai.service.AgentServiceClient {

    private final RestTemplate restTemplate;

    // Use the property name matching application.properties
    @Value("${ai.agent.url:http://localhost:5001}") 
    private String agentServiceUrl;

    // Inject RestTemplate - ensure a Bean is configured elsewhere
    public AgentServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        log.info("Initialized AgentServiceClient with URL: {}", agentServiceUrl);
    }

    @Override
    public String getAgentResponse(ManagerTypes managerType, String userQuery, UUID conversationId, 
                                  Boolean includeHistory, Integer historyLimit) {
        String url = agentServiceUrl + "/generate-response";
        log.info("Sending request to Agent service for response at URL: {}", url);
        log.debug("Requesting response for query (first 100 chars): {}", 
                userQuery.length() > 100 ? userQuery.substring(0, 100) + "..." : userQuery);
        log.debug("History parameters - includeHistory: {}, historyLimit: {}", 
                includeHistory, historyLimit);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("userQuery", userQuery);
        requestBody.put("managerType", managerType.toString());
        requestBody.put("conversationId", conversationId.toString());
        requestBody.put("temperature", 0.7); // Default temperature
        
        // Add history parameters if provided
        if (includeHistory != null) {
            requestBody.put("includeHistory", includeHistory);
        }
        
        if (historyLimit != null) {
            requestBody.put("historyLimit", historyLimit);
        }
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> responseEntity = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    Map.class
            );

            if (responseEntity.getStatusCode().is2xxSuccessful() && responseEntity.getBody() != null) {
                Map responseBody = responseEntity.getBody();
                if (responseBody.containsKey("agentResponse")) {
                    String agentResponse = (String) responseBody.get("agentResponse");
                    log.info("Successfully received response from agent ({} chars)", 
                            agentResponse != null ? agentResponse.length() : 0);
                    return agentResponse;
                } else {
                    log.error("Agent response missing 'agentResponse' field: {}", responseBody);
                    return "Error: Invalid response format from the AI service.";
                }
            } else {
                log.error("Agent service returned non-successful status code: {} or empty body", 
                         responseEntity.getStatusCode());
                return "Error: AI service returned an error.";
            }
        } catch (Exception e) {
            log.error("Error calling Agent service at {}: {}", url, e.getMessage());
            return "Error communicating with the AI service: " + e.getMessage();
        }
    }

    @Override
    public AgentArtifactResponseDTO generateArtifacts(String query) {
        String url = agentServiceUrl + "/generate-artifacts";
        log.info("Sending request to Agent service at URL: {}", url);
        log.debug("Requesting artifacts for query (first 100 chars): {}", query.length() > 100 ? query.substring(0, 100) + "..." : query);

        AgentArtifactRequestDTO requestDTO = AgentArtifactRequestDTO.builder()
                .query(query)
                // Add max_guidelines/max_case_studies here if you want to override agent defaults
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<AgentArtifactRequestDTO> requestEntity = new HttpEntity<>(requestDTO, headers);

        try {
            ResponseEntity<AgentArtifactResponseDTO> responseEntity = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    AgentArtifactResponseDTO.class
            );

            if (responseEntity.getStatusCode().is2xxSuccessful() && responseEntity.getBody() != null) {
                log.info("Successfully received artifacts from agent. Guidelines: {}, Case Studies: {}",
                        responseEntity.getBody().getGuidelines().size(),
                        responseEntity.getBody().getCaseStudies().size());
                return responseEntity.getBody();
            } else {
                log.error("Agent service returned non-successful status code: {} or empty body", responseEntity.getStatusCode());
                // Return empty response on error
                return new AgentArtifactResponseDTO(Collections.emptyList(), Collections.emptyList());
            }
        } catch (Exception e) {
            log.error("Error calling Agent service at {}: {}", url, e.getMessage());
            // Return empty response on communication error
            return new AgentArtifactResponseDTO(Collections.emptyList(), Collections.emptyList());
        }
    }
} 