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
public class DecisionTreeStepDTO {
    private int step;
    private String managerStatement;
    private String userChoice;
    private List<DecisionTreeAlternativeDTO> alternatives;
    private int chosenIndex;
} 