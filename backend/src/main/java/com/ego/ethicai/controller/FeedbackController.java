package com.ego.ethicai.controller;

import com.ego.ethicai.dto.FeedbackRequestDTO;
import com.ego.ethicai.dto.FeedbackResponseDTO;
import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.Feedback;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.ConversationService;
import com.ego.ethicai.service.FeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/feedback")
public class FeedbackController {

    @Autowired
    private FeedbackService feedbackService;

    @Autowired
    private ConversationService conversationService;

    @PostMapping("/submit")
    public ResponseEntity<FeedbackResponseDTO> submitFeedback(
            @CurrentUser CustomUserDetails currentUser,
            @RequestBody FeedbackRequestDTO request) {

        Conversation conversation = conversationService.getConversationEntityById(request.getConversationId())
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        Feedback feedback = feedbackService.submitFeedback(
                conversation.getId(),
                currentUser.getId(),
                request.getUserFeedback(),
                request.getRating()
        );

        return ResponseEntity.ok(new FeedbackResponseDTO(
                feedback.getId(),
                conversation.getId(),
                feedback.getUserFeedback(),
                feedback.getRating(),
                feedback.getSubmittedAt()
        ));
    }

    @GetMapping("/{conversationId}")
    public ResponseEntity<FeedbackResponseDTO> getFeedbackByConversationId(
            @CurrentUser CustomUserDetails currentUser,
            @PathVariable UUID conversationId) {

        Feedback feedback = feedbackService.getFeedback(conversationId, currentUser.getId());

        return ResponseEntity.ok(new FeedbackResponseDTO(
                feedback.getId(),
                feedback.getConversation().getId(),
                feedback.getUserFeedback(),
                feedback.getRating(),
                feedback.getSubmittedAt()
        ));
    }

    @GetMapping("/all")
    public ResponseEntity<List<FeedbackResponseDTO>> getAllFeedback() {

        List<Feedback> feedbacks = feedbackService.getAllFeedback();

        List<FeedbackResponseDTO> responseDTOs = feedbacks.stream()
                .map(feedback -> new FeedbackResponseDTO(
                        feedback.getId(),
                        feedback.getConversation().getId(),
                        feedback.getUserFeedback(),
                        feedback.getRating(),
                        feedback.getSubmittedAt()
                ))
                .toList();

        return ResponseEntity.ok(responseDTOs);
    }
}