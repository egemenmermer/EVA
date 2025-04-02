package com.ego.ethicai.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "rag_artifacts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagArtifact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private String conversationId;

    @Column(name = "artifact_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private ArtifactType artifactType;

    @Column(name = "artifact_id", nullable = false)
    private String artifactId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "source")
    private String source;

    @Column(name = "category")
    private String category;

    @Column(name = "relevance")
    private Float relevance;

    // For case studies only
    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "outcome", columnDefinition = "TEXT")
    private String outcome;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ArtifactType {
        GUIDELINE,
        CASE_STUDY
    }
} 