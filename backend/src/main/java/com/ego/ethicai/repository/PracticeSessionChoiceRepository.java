package com.ego.ethicai.repository;

import com.ego.ethicai.entity.PracticeSessionChoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PracticeSessionChoiceRepository extends JpaRepository<PracticeSessionChoice, UUID> {
    
    @Query("SELECT psc FROM PracticeSessionChoice psc WHERE psc.practiceSession.id = :sessionId ORDER BY psc.stepNumber")
    List<PracticeSessionChoice> findByPracticeSessionIdOrderByStepNumber(@Param("sessionId") UUID sessionId);
    
    List<PracticeSessionChoice> findByPracticeSession_Id(UUID practiceSessionId);
} 