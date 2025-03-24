package com.ego.ethicai.service;

import com.ego.ethicai.dto.ConversationResponseDTO;
import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.enums.ManagerTypes;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationService {
    ConversationResponseDTO startConversation(UUID userId, ManagerTypes managerType);
    Optional<ConversationResponseDTO> getConversationById(UUID conversationId);
    List<ConversationResponseDTO> getUserConversations(UUID userId);
    void deleteConversation(UUID conversationId);
    Optional<Conversation> getConversationEntityById(UUID conversationId);
    ConversationResponseDTO updateConversationTitle(UUID conversationId, UUID userId, String title);
}
