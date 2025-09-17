package com.ego.ethicai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RagArtifactDTO {
    private String id;
    private String title;
    private String description;
    private String source;
    private String category;
    private Float relevance;
    
    // Only for case studies
    private String summary;
    private String outcome;
} 