package com.ego.ethicai.controller;

import com.ego.ethicai.dto.ConversationRequestDTO;
import com.ego.ethicai.dto.ConversationResponseDTO;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.ConversationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/conversation")
public class ConversationController {

    @Autowired
    private ConversationService conversationService;

    @PostMapping("/start")
    public ResponseEntity<ConversationResponseDTO> createConversation(
            @CurrentUser CustomUserDetails currentUser,
            @RequestBody ConversationRequestDTO conversationRequestDTO) {
        ConversationResponseDTO response = conversationService.startConversation(currentUser.getId(), conversationRequestDTO.getManagerType());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConversationResponseDTO> getConversationById(@PathVariable UUID id) {
        ConversationResponseDTO response = conversationService.getConversationById(id).orElseThrow(() -> new RuntimeException("Conversation not found"));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<List<ConversationResponseDTO>> getConversationsByUserId(@PathVariable UUID id) {
        List<ConversationResponseDTO> response = conversationService.getUserConversations(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable UUID id) {
        conversationService.deleteConversation(id);
        return ResponseEntity.ok().build();
    }
}
