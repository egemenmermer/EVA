package com.ego.ethicai.controller;

import com.ego.ethicai.config.PasswordEncoder;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/debug")
public class DebugController {

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping("/check-password")
    public ResponseEntity<?> checkPassword(
            @RequestParam String email,
            @RequestParam String password) {
        
        Optional<User> userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "found", false,
                "message", "User not found"
            ));
        }
        
        User user = userOpt.get();
        boolean matches = passwordEncoder.passwordEncoderBean().matches(password, user.getPasswordHash());
        
        return ResponseEntity.ok(Map.of(
            "found", true,
            "passwordMatches", matches,
            "storedHash", user.getPasswordHash(),
            "providedPassword", password,
            "providedEmail", email
        ));
    }
    
    @GetMapping("/encode-password")
    public ResponseEntity<?> encodePassword(@RequestParam String password) {
        String encoded = passwordEncoder.passwordEncoderBean().encode(password);
        return ResponseEntity.ok(Map.of(
            "password", password,
            "encoded", encoded
        ));
    }
} 