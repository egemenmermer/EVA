package com.ego.ethicai.dto.agent;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentArtifactRequestDTO {
    private String query;
    // Using Integer to allow nulls if needed, matching agent's Optional<int> implicitly
    private Integer max_guidelines = 3;
    private Integer max_case_studies = 2;
} 