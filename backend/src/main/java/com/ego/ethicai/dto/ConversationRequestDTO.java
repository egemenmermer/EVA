package com.ego.ethicai.dto;

import com.ego.ethicai.enums.ManagerTypes;
import lombok.*;
import org.antlr.v4.runtime.misc.NotNull;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationRequestDTO {

    private ManagerTypes managerType;

}
