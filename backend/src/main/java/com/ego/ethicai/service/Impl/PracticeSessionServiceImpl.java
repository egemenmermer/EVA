package com.ego.ethicai.service.Impl;

import com.ego.ethicai.dto.practice.PracticeSessionRequestDTO;
import com.ego.ethicai.dto.practice.PracticeSessionResponseDTO;
import com.ego.ethicai.entity.PracticeSession;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.exception.ResourceNotFoundException;
import com.ego.ethicai.repository.PracticeSessionRepository;
import com.ego.ethicai.service.PracticeSessionService;
import com.ego.ethicai.service.UserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PracticeSessionServiceImpl implements PracticeSessionService {

    private final PracticeSessionRepository practiceSessionRepository;
    private final UserService userService;

    @Override
    @Transactional
    public PracticeSessionResponseDTO savePracticeSession(PracticeSessionRequestDTO requestDTO) {
        log.info("Received PracticeSessionRequestDTO in service: {}", requestDTO);
        log.info("Saving practice session for user: {}", requestDTO.getUserId());
        
        // Find the user
        User user = userService.findById(requestDTO.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + requestDTO.getUserId()));

        // Build the entity
        PracticeSession practiceSession = PracticeSession.builder()
                .user(user)
                .managerType(requestDTO.getManagerType())
                .scenarioId(requestDTO.getScenarioId())
                .selectedChoices(requestDTO.getSelectedChoices())
                .createdAt(requestDTO.getTimestamp() != null ? requestDTO.getTimestamp() : LocalDateTime.now())
                .score(requestDTO.getScore())
                .build();

        // Save to database
        PracticeSession savedSession = practiceSessionRepository.save(practiceSession);
        log.info("Practice session saved with ID: {}", savedSession.getId());

        // Map to response DTO
        return mapToResponseDTO(savedSession);
    }

    @Override
    @Transactional
    public List<PracticeSessionResponseDTO> getPracticeSessionsByUserId(UUID userId) {
        log.info("Fetching practice sessions for user: {}", userId);
        return practiceSessionRepository.findByUser_Id(userId).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public PracticeSession getPracticeSessionEntityById(UUID id) {
        log.info("Fetching practice session by ID: {}", id);
        return practiceSessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Practice session not found with ID: " + id));
    }
    
    // Helper method to map entity to response DTO
    private PracticeSessionResponseDTO mapToResponseDTO(PracticeSession entity) {
        return PracticeSessionResponseDTO.builder()
                .id(entity.getId())
                .userId(entity.getUser().getId())
                .managerType(entity.getManagerType())
                .scenarioId(entity.getScenarioId())
                .selectedChoices(entity.getSelectedChoices())
                .createdAt(entity.getCreatedAt())
                .score(entity.getScore())
                .build();
    }
} 