package com.ego.ethicai.entity;

import com.ego.ethicai.enums.AccountTypes;
import com.ego.ethicai.enums.AuthProvider;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = true)
    private String passwordHash; // Null for OAuth users

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private AuthProvider authProvider = AuthProvider.LOCAL; // Default to LOCAL

    @Column(name = "full_name", nullable = true)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, columnDefinition = "VARCHAR(20)")
    private AccountTypes role = AccountTypes.USER; // Default role is "user"

    // Helper method for setting the role that handles case conversion
    public void setRole(String roleStr) {
        try {
            this.role = AccountTypes.valueOf(roleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            this.role = AccountTypes.USER; // Default to USER if invalid
        }
    }

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "last_login", nullable = true)
    private LocalDateTime lastLogin;

    @Column(name = "activated_at", nullable = true)
    private LocalDateTime activatedAt;

    @Column(name = "provider_id", nullable = true)
    private String providerId;

    // New field to store manager type preference from quiz
    @Column(name = "manager_type_preference", nullable = true)
    private String managerTypePreference;

    // Survey completion tracking
    @Column(name = "pre_survey_completed", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean preSurveyCompleted = false;

    @Column(name = "post_survey_completed", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean postSurveyCompleted = false;

    @Column(name = "pre_survey_completed_at", nullable = true)
    private LocalDateTime preSurveyCompletedAt;

    @Column(name = "post_survey_completed_at", nullable = true)
    private LocalDateTime postSurveyCompletedAt;

    // Scenario completion tracking
    @Column(name = "accessibility_scenarios_completed", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean accessibilityScenariosCompleted = false;

    @Column(name = "privacy_scenarios_completed", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean privacyScenariosCompleted = false;

    @Column(name = "accessibility_scenarios_completed_at", nullable = true)
    private LocalDateTime accessibilityScenariosCompletedAt;

    @Column(name = "privacy_scenarios_completed_at", nullable = true)
    private LocalDateTime privacyScenariosCompletedAt;

    // Practice scenarios tracking - for showing tactics guide permanently
    @Column(name = "has_completed_practice", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean hasCompletedPractice = false;

    @Column(name = "first_practice_completed_at", nullable = true)
    private LocalDateTime firstPracticeCompletedAt;

    // Helper method to set manager type preference
    public void setManagerTypePreference(String managerType) {
        if (managerType != null) {
            String normalized = managerType.toUpperCase().trim();
            if (normalized.equals("PUPPETEER") || normalized.equals("DILUTER") || normalized.equals("CAMOUFLAGER")) {
                this.managerTypePreference = normalized;
            } else {
                this.managerTypePreference = null;
            }
        } else {
            this.managerTypePreference = null;
        }
    }

    // Helper methods for survey completion
    public void markPreSurveyCompleted() {
        this.preSurveyCompleted = true;
        this.preSurveyCompletedAt = LocalDateTime.now();
    }

    public void markPostSurveyCompleted() {
        this.postSurveyCompleted = true;
        this.postSurveyCompletedAt = LocalDateTime.now();
    }

    // Helper methods for scenario completion
    public void markAccessibilityScenariosCompleted() {
        this.accessibilityScenariosCompleted = true;
        this.accessibilityScenariosCompletedAt = LocalDateTime.now();
    }

    public void markPrivacyScenariosCompleted() {
        this.privacyScenariosCompleted = true;
        this.privacyScenariosCompletedAt = LocalDateTime.now();
    }

    // Helper method for practice completion
    public void markFirstPracticeCompleted() {
        if (!this.hasCompletedPractice) {
            this.hasCompletedPractice = true;
            this.firstPracticeCompletedAt = LocalDateTime.now();
        }
    }

}


