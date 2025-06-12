package com.ego.ethicai.dto;

import com.ego.ethicai.enums.AccountTypes;
import lombok.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDTO {

    private UUID id;
    private String email;
    private String fullName;
    private LocalDateTime lastLogin;
    private LocalDateTime updatedAt;
    private AccountTypes role;
    private String managerTypePreference;
    
    // Survey completion tracking
    private Boolean consentFormCompleted;
    private LocalDateTime consentFormCompletedAt;
    private Boolean preSurveyCompleted;
    private Boolean postSurveyCompleted;
    private LocalDateTime preSurveyCompletedAt;
    private LocalDateTime postSurveyCompletedAt;
    
    // Scenario completion tracking
    private Boolean accessibilityScenariosCompleted;
    private Boolean privacyScenariosCompleted;
    private LocalDateTime accessibilityScenariosCompletedAt;
    private LocalDateTime privacyScenariosCompletedAt;
    private Boolean hasCompletedPractice;
    private LocalDateTime firstPracticeCompletedAt;

}
