package com.ego.ethicai.dto.practice;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DecisionTreeDataDTO {
    private String scenario;
    private List<DecisionTreeStepDTO> steps;
} 