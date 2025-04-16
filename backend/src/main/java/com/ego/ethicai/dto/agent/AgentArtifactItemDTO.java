package com.ego.ethicai.dto.agent;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentArtifactItemDTO {
    private String id;
    private String title;
    private String description; // Optional: For guidelines
    private String summary;     // Optional: For case studies
    private String outcome;     // Optional: For case studies
    private String source;
    private Float relevance;
    private String category;    // Optional: For guidelines
} 