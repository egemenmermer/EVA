package com.ego.ethicai.service.Impl;

import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.Feedback;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.repository.FeedbackRepository;
import com.ego.ethicai.service.ConversationService;
import com.ego.ethicai.service.FeedbackService;
import com.ego.ethicai.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class FeedbackServiceImpl implements FeedbackService {

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private ConversationService conversationService;

    @Autowired
    private UserService userService;

    @Override
    public Feedback submitFeedback(UUID conversationID, UUID userID, String feedback, int rating) {
        User user = userService.findById(userID).orElseThrow(
                () -> new RuntimeException("User not found"));

        Conversation conversation = conversationService.getConversationEntityById(conversationID)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        if (!conversation.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized access to conversation");
        }

        Feedback feedbackEntity = new Feedback();

        feedbackEntity.setConversation(conversation);
        feedbackEntity.setUser(user);
        feedbackEntity.setUserFeedback(feedback);
        feedbackEntity.setRating(rating);
        feedbackEntity.setSubmittedAt(LocalDateTime.now());

        return feedbackRepository.save(feedbackEntity);
    }

    @Override
    public Feedback getFeedback(UUID conversationID, UUID userID) {
        User user = userService.findById(userID).orElseThrow(
                () -> new RuntimeException("User not found"));

        Conversation conversation = conversationService.getConversationEntityById(conversationID)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        return feedbackRepository.findByConversationIdAndUserId(conversationID, userID);
    }

    @Override
    public List<Feedback> getAllFeedback() {
        return feedbackRepository.findAll();
    }
}
