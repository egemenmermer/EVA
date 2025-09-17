package com.ego.ethicai.service;

import com.ego.ethicai.entity.ConversationContent;

import java.util.List;
import java.util.UUID;

public interface ConversationContentService {

    void saveMessage(UUID conversationId, String userQuery, String agentResponse);
    List<ConversationContent> getMessages(UUID conversationId, UUID userId);
}
