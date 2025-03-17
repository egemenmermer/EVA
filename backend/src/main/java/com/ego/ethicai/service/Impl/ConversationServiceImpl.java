package com.ego.ethicai.service.Impl;

import com.ego.ethicai.entity.Conversation;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.enums.ManagerTypes;
import com.ego.ethicai.repository.ConversationRepository;
import com.ego.ethicai.service.ConversationService;
import com.ego.ethicai.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ConversationServiceImpl implements ConversationService {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private UserService userService;



    @Override
    public Conversation startConversation(UUID userId, ManagerTypes managerType) {
        User user = userService.findById(userId).orElseThrow(
                () -> new RuntimeException("User not found"));

        if (managerType == null) {
            throw new RuntimeException("Manager type is required");
        }

        if (initialQuery == null) {
            throw new RuntimeException("Initial query is required");
        }

        Conversation conversation = new Conversation();
        conversation.setUser(user);
        conversation.setManagerType(managerType);
        conversation.setCreatedAt(LocalDateTime.now());

        return conversationRepository.save(conversation);
    }

    @Override
    public Optional<Conversation> getConversationById(UUID conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId).orElseThrow(
                () -> new RuntimeException("Conversation not found"));
        return Optional.of(conversation);
    }

    @Override
    public List<Conversation> getUserConversations(UUID userId) {
        User user = userService.findById(userId).orElseThrow(
                () -> new RuntimeException("User not found"));

        return conversationRepository.getUserConversations(user);
    }

    @Override
    public void deleteConversation(UUID conversationId) {
        conversationRepository.deleteById(conversationId);
    }
}
