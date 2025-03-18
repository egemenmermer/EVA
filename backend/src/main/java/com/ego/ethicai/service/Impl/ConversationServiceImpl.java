package com.ego.ethicai.service.Impl;

import com.ego.ethicai.dto.ConversationResponseDTO;
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
    public ConversationResponseDTO startConversation(UUID userId, ManagerTypes managerType) {
        User user = userService.findById(userId).orElseThrow(
                () -> new RuntimeException("User not found"));

        if (managerType == null) {
            throw new RuntimeException("Manager type is required");
        }

        Conversation conversation = new Conversation();
        conversation.setUser(user);
        conversation.setManagerType(managerType);
        conversation.setCreatedAt(LocalDateTime.now());

        Conversation savedConversation = conversationRepository.save(conversation);

        return new ConversationResponseDTO(
                savedConversation.getId(),
                savedConversation.getUser().getId(),
                savedConversation.getManagerType(),
                savedConversation.getCreatedAt()
        );
    }

    @Override
    public Optional<ConversationResponseDTO> getConversationById(UUID conversationId) {
        return conversationRepository.findById(conversationId).map(conversation -> {
            return new ConversationResponseDTO(
                    conversation.getId(),
                    conversation.getUser().getId(),
                    conversation.getManagerType(),
                    conversation.getCreatedAt()
            );
        });
    }

    @Override
    public Optional<Conversation> getConversationEntityById(UUID conversationId) {
        return conversationRepository.findById(conversationId);
    }

    @Override
    public List<ConversationResponseDTO> getUserConversations(UUID userId) {
        User user = userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Conversation> conversations = conversationRepository.getUserConversations(user);

        return conversations.stream()
                .map(conversation -> new ConversationResponseDTO(
                        conversation.getId(),
                        conversation.getUser().getId(),
                        conversation.getManagerType(),
                        conversation.getCreatedAt()
                ))
                .toList();
    }

    @Override
    public void deleteConversation(UUID conversationId) {
        conversationRepository.deleteById(conversationId);
    }
}
