package com.ego.ethicai.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.context.annotation.Configuration;


@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "File Sharing Collaboration API",
                version = "1.0",
                description = "API documentation for File Sharing Collaboration System"
        )
)
public class SwaggerConfig {
}
