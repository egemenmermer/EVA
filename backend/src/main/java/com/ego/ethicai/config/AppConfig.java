package com.ego.ethicai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    @Bean
    public RestTemplate restTemplate() {
        // Creates a standard RestTemplate bean
        // You could add configuration here if needed (e.g., timeouts, message converters)
        return new RestTemplate();
    }
} 