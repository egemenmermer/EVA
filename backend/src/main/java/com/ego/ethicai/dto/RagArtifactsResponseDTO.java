package com.ego.ethicai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RagArtifactsResponseDTO {
    private String conversationId;
    private List<RagArtifactDTO> guidelines;
    private List<RagArtifactDTO> caseStudies;
} 