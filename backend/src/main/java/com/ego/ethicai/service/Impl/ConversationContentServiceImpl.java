package com.ego.ethicai.service.Impl;

import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.ConversationContent;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.repository.ConversationContentRepository;
import com.ego.ethicai.service.ConversationContentService;
import com.ego.ethicai.service.ConversationService;
import com.ego.ethicai.service.UserService;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ConversationContentServiceImpl implements ConversationContentService {

    private static final Logger logger = LoggerFactory.getLogger(ConversationContentServiceImpl.class);

    @Autowired
    private ConversationContentRepository conversationContentRepository;

    @Autowired
    private ConversationService conversationService;

    @Autowired
    private UserService userService;

    @Override
    @Transactional
    public void saveMessage(UUID conversationId, String userQuery, String agentResponse) {
        logger.info("Start saving message for conversation: {}", conversationId);
        try {
            logger.debug("Fetching conversation entity with ID: {}", conversationId);
        Conversation conversation = conversationService.getConversationEntityById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
            logger.debug("Conversation entity found: {}", conversation.getId());

            logger.debug("Creating ConversationContent entity...");
        ConversationContent conversationContent = ConversationContent.builder()
                .conversation(conversation)
                .userQuery(userQuery)
                .agentResponse(agentResponse)
                .createdAt(LocalDateTime.now())
                .build();
            logger.debug("ConversationContent entity created.");

            logger.debug("Saving ConversationContent entity to repository...");
        conversationContentRepository.save(conversationContent);
            logger.info("Message saved successfully for conversation: {}", conversationId);
        } catch (Exception e) {
            logger.error("Error saving message for conversation {}: {}", conversationId, e.getMessage(), e);
            throw e; // Re-throw the exception to ensure transaction rollback
        }
    }

    @Override
    public List<ConversationContent> getMessages(UUID conversationId, UUID userId) {
        User user = userService.findById(userId).orElseThrow(
                () -> new RuntimeException("User not found"));

        Conversation conversation = conversationService.getConversationEntityById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        if(!conversation.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized access to conversation");
        }

        return conversationContentRepository.findByConversation(conversation);
    }
}
