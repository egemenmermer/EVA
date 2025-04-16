package com.ego.ethicai.dto.agent;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AgentArtifactResponseDTO {
    private List<AgentArtifactItemDTO> guidelines;
    private List<AgentArtifactItemDTO> caseStudies;
} 