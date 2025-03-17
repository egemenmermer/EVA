package com.ego.ethicai.service.Impl;

import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.ConversationContent;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.repository.ConversationContentRepository;
import com.ego.ethicai.service.ConversationContentService;
import com.ego.ethicai.service.ConversationService;
import com.ego.ethicai.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ConversationContentServiceImpl implements ConversationContentService {

    @Autowired
    private ConversationContentRepository conversationContentRepository;

    @Autowired
    private ConversationService conversationService;

    @Autowired
    private UserService userService;

    @Override
    public void saveMessage(UUID conversationId, String userQuery, String agentResponse) {
        Conversation conversation = conversationService.getConversationById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        ConversationContent conversationContent = new ConversationContent();

        conversationContent.setConversation(conversation);
        conversationContent.setUserQuery(userQuery);
        conversationContent.setAgentResponse(agentResponse);
        conversationContent.setCreatedAt(LocalDateTime.now());

        conversationContentRepository.save(conversationContent);
    }

    @Override
    public List<ConversationContent> getMessages(UUID conversationId, UUID userId) {

        User user = userService.findById(userId).orElseThrow(
                () -> new RuntimeException("User not found"));

        Conversation conversation = conversationService.getConversationById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        if(!conversation.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized access to conversation");
        }

        return conversationContentRepository.findByConversationAndUserId(conversation, userId);

    }
}
