package com.ego.ethicai.service;

import com.ego.ethicai.entity.Feedback;

import java.util.List;
import java.util.UUID;

public interface FeedbackService {

    Feedback submitFeedback(UUID conversationID, UUID userID, String feedback, int rating);
    Feedback getFeedback(UUID conversationID, UUID userID);
    List<Feedback> getAllFeedback();
}
