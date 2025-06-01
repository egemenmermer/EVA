package com.ego.ethicai.dto.practice;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelectionDataDTO {
    private int step;
    private String choice;
    private Double evs;
    private String tactic;
} 