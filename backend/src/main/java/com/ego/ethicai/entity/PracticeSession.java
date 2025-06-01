package com.ego.ethicai.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@Table(name = "practice_sessions")
public class PracticeSession {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "manager_type", nullable = false)
    private String managerType;

    @Column(name = "scenario_id")
    private String scenarioId;

    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JoinColumn(name = "practice_session_id")
    private List<PracticeSessionChoice> practiceSessionChoices;

    // Transient field for backward compatibility
    @Transient
    private List<String> selectedChoices;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "score")
    private Double score;
} 