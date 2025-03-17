package com.ego.ethicai.controller;

import com.ego.ethicai.dto.ConversationRequestDTO;
import com.ego.ethicai.dto.ConversationResponseDTO;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.ConversationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/conversation")
public class ConversationController {

    @Autowired
    private ConversationService conversationService;

    @RequestMapping("/start")
    public ResponseEntity<ConversationResponseDTO> createConversation(
            @CurrentUser CustomUserDetails currentUser,
            @RequestBody ConversationRequestDTO conversationRequestDTO) {
        ConversationResponseDTO response = conversationService.startConversation(currentUser.getId(), conversationRequestDTO.getManagerType());
        return ResponseEntity.ok(response);
    }

    @RequestMapping("/{id}")
    public ResponseEntity<ConversationResponseDTO> getConversationById(@PathVariable UUID id) {
        ConversationResponseDTO response = conversationService.getConversationById(id);
        return ResponseEntity.ok(response);
    }
}
