package com.ego.ethicai.controller;


import com.ego.ethicai.dto.UserDTO;
import com.ego.ethicai.dto.UserResponseDTO;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.AuthService;
import com.ego.ethicai.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getUserById(@CurrentUser CustomUserDetails currentUser){
        try {
            User user = userService.getUserByEmail(currentUser.getEmail());
            return ResponseEntity.ok(new UserDTO(user.getId(), user.getEmail(), user.getFullName()));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<UserResponseDTO> getUserProfile(@CurrentUser CustomUserDetails currentUser){
        try {
            UserResponseDTO userProfile = userService.getUser(currentUser.getId());
            return ResponseEntity.ok(userProfile);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserDetailsById(@PathVariable UUID id){
            User user = userService.findById(id).orElseThrow(
                    () -> new RuntimeException("User not found"));
            return ResponseEntity.ok(new UserDTO(user.getId(), user.getEmail(), user.getFullName()));
    }

    @PutMapping("/update")
    public ResponseEntity<UserResponseDTO> updateUser(@CurrentUser CustomUserDetails currentUser, @RequestBody UserDTO userDTO){
        if (!currentUser.getId().equals(userDTO.getId())) {
            throw new RuntimeException("You can only update your own profile.");
        }
        UserResponseDTO updatedUser = userService.updateUser(userDTO.getId(), userDTO.getFullName());
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/delete")
    public ResponseEntity<String> deleteUser(@CurrentUser CustomUserDetails currentUser) {
        userService.deleteUser(currentUser.getId());
        return ResponseEntity.ok("User account deleted successfully.");
    }

    // Survey completion endpoints
    @PostMapping("/mark-pre-survey-completed")
    public ResponseEntity<String> markPreSurveyCompleted(@CurrentUser CustomUserDetails currentUser) {
        userService.markPreSurveyCompleted(currentUser.getId());
        return ResponseEntity.ok("Pre-survey marked as completed");
    }

    @PostMapping("/mark-post-survey-completed")
    public ResponseEntity<String> markPostSurveyCompleted(@CurrentUser CustomUserDetails currentUser) {
        userService.markPostSurveyCompleted(currentUser.getId());
        return ResponseEntity.ok("Post-survey marked as completed");
    }

    // Scenario completion endpoints
    @PostMapping("/mark-accessibility-scenarios-completed")
    public ResponseEntity<String> markAccessibilityScenariosCompleted(@CurrentUser CustomUserDetails currentUser) {
        userService.markAccessibilityScenariosCompleted(currentUser.getId());
        return ResponseEntity.ok("Accessibility scenarios marked as completed");
    }

    @PostMapping("/mark-privacy-scenarios-completed")
    public ResponseEntity<String> markPrivacyScenariosCompleted(@CurrentUser CustomUserDetails currentUser) {
        userService.markPrivacyScenariosCompleted(currentUser.getId());
        return ResponseEntity.ok("Privacy scenarios marked as completed");
    }

}
