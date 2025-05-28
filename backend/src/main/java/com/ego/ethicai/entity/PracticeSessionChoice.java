package com.ego.ethicai.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "practice_session_choices")
public class PracticeSessionChoice {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "practice_session_id", nullable = false)
    private UUID practiceSessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "practice_session_id", insertable = false, updatable = false)
    private PracticeSession practiceSession;

    @Column(name = "step_number", nullable = false)
    private Integer stepNumber;

    @Column(name = "choice", nullable = false, length = 1000)
    private String choiceText;

    @Column(name = "evs_score")
    private Integer evsScore;

    @Column(name = "tactic", length = 100)
    private String tactic;
} 