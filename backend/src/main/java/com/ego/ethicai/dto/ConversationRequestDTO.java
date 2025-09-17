package com.ego.ethicai.dto;

import com.ego.ethicai.enums.ManagerTypes;
import lombok.*;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationRequestDTO {

    private ManagerTypes managerType;

}
