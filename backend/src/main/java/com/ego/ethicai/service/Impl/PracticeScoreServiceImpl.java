package com.ego.ethicai.service.Impl;

import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.PracticeScore;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.exception.ResourceNotFoundException;
import com.ego.ethicai.repository.ConversationRepository;
import com.ego.ethicai.repository.PracticeScoreRepository;
import com.ego.ethicai.repository.UserRepository;
import com.ego.ethicai.service.PracticeScoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PracticeScoreServiceImpl implements PracticeScoreService {

    @Autowired
    private PracticeScoreRepository practiceScoreRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional
    public PracticeScore submitPracticeScore(UUID conversationId, UUID userId, Integer score) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Check if practice score already exists for this conversation and user
        PracticeScore existingScore = practiceScoreRepository.findByConversationAndUser(conversation, user).orElse(null);

        if (existingScore != null) {
            // Update existing practice score
            existingScore.setScore(score);
            existingScore.setSubmittedAt(LocalDateTime.now());
            return practiceScoreRepository.save(existingScore);
        } else {
            // Create new practice score
            PracticeScore practiceScore = PracticeScore.builder()
                    .conversation(conversation)
                    .user(user)
                    .score(score)
                    .submittedAt(LocalDateTime.now())
                    .build();

            return practiceScoreRepository.save(practiceScore);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PracticeScore getPracticeScore(UUID conversationId, UUID userId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        return practiceScoreRepository.findByConversationAndUser(conversation, user)
                .orElseThrow(() -> new ResourceNotFoundException("Practice score not found for conversation: " + conversationId + " and user: " + userId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PracticeScore> getAllPracticeScores() {
        return practiceScoreRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PracticeScore> getPracticeScoresByUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        return practiceScoreRepository.findByUser(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PracticeScore> getPracticeScoresByConversation(UUID conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found with id: " + conversationId));

        return practiceScoreRepository.findByConversation(conversation);
    }
} 