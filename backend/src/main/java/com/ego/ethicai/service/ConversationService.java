package com.ego.ethicai.service;

import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.enums.ManagerTypes;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationService {
    Conversation startConversation(UUID userId, ManagerTypes managerType);
    Optional<Conversation> getConversationById(UUID conversationId);
    List<Conversation> getUserConversations(UUID userId);
    void deleteConversation(UUID conversationId);
}
