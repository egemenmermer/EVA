package com.ego.ethicai.repository;

import com.ego.ethicai.entity.PracticeSession;
import com.ego.ethicai.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

@Repository
public interface PracticeSessionRepository extends JpaRepository<PracticeSession, UUID> {
    List<PracticeSession> findByUser_Id(UUID userId);
    
    @Query("SELECT DISTINCT ps FROM PracticeSession ps LEFT JOIN FETCH ps.practiceSessionChoices WHERE ps.id = :id")
    Optional<PracticeSession> findByIdWithChoices(@Param("id") UUID id);
} 