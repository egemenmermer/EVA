package com.ego.ethicai.service.Impl;

import com.ego.ethicai.dto.AIRequestDTO;
import com.ego.ethicai.dto.AIResponseDTO;
import com.ego.ethicai.service.AIService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;

@Service
public class AIServiceImpl implements AIService {

    private static final Logger logger = LoggerFactory.getLogger(AIServiceImpl.class);
    private final WebClient webClient;
    private static final int MAX_RETRIES = 2;
    private static final int TIMEOUT_SECONDS = 30;

    public AIServiceImpl(WebClient.Builder webClientBuilder, 
                        @Value("${ai.agent.url:http://localhost:5000}") String baseUrl) {
        this.webClient = webClientBuilder
            .baseUrl(baseUrl)
            .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
            .build();
        logger.info("Initialized AI Service with base URL: {}", baseUrl);
    }

    @Override
    public AIResponseDTO getAIResponse(AIRequestDTO request) {
        logger.debug("Requesting AI response for query with manager type: {}", request.getManagerType());
        
        try {
            return webClient.post()
                    .uri("/generate-response")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AIResponseDTO.class)
                    .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                    .retryWhen(Retry.backoff(MAX_RETRIES, Duration.ofSeconds(1))
                        .filter(throwable -> shouldRetry(throwable))
                        .doBeforeRetry(retrySignal -> 
                            logger.warn("Retrying AI request after error. Attempt: {}", 
                                retrySignal.totalRetries() + 1)))
                    .onErrorResume(WebClientResponseException.class, ex -> {
                        logger.error("AI service error: {} - {}", ex.getStatusCode(), ex.getResponseBodyAsString());
                        return Mono.error(new RuntimeException("AI service error: " + ex.getMessage()));
                    })
                    .onErrorResume(Exception.class, ex -> {
                        logger.error("Unexpected error calling AI service", ex);
                        return Mono.error(new RuntimeException("Failed to get AI response: " + ex.getMessage()));
                    })
                    .block(); // Blocking call for synchronous response
        } catch (Exception e) {
            logger.error("Failed to get AI response", e);
            throw new RuntimeException("Failed to get AI response: " + e.getMessage());
        }
    }

    private boolean shouldRetry(Throwable throwable) {
        if (throwable instanceof WebClientResponseException) {
            WebClientResponseException ex = (WebClientResponseException) throwable;
            // Retry on 5xx server errors and specific 4xx errors
            return ex.getStatusCode().is5xxServerError() || 
                   ex.getStatusCode().value() == 429; // Too Many Requests
        }
        // Retry on connection errors
        return true;
    }
}
