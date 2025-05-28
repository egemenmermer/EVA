package com.ego.ethicai.dto.practice;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PracticeChoiceDTO {
    private Integer stepNumber;
    private String choiceText;
    private Integer evsScore;
    private String tactic;
} 