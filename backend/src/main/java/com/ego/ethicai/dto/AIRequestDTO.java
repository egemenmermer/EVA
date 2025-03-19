package com.ego.ethicai.dto;

import com.ego.ethicai.enums.ManagerTypes;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AIRequestDTO {

    private ManagerTypes managerType;
    private String userQuery;
}
