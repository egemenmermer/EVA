package com.ego.ethicai.controller;

import com.ego.ethicai.dto.ManagerTypeQuizRequestDTO;
import com.ego.ethicai.dto.ManagerTypeQuizResponseDTO;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/manager-type-quiz")
public class ManagerTypeQuizController {

    private static final Logger logger = LoggerFactory.getLogger(ManagerTypeQuizController.class);

    @Autowired
    private UserService userService;

    @PostMapping("/submit")
    public ResponseEntity<ManagerTypeQuizResponseDTO> submitQuiz(
            @RequestBody ManagerTypeQuizRequestDTO quizRequest) {
        
        try {
            logger.info("Received manager type quiz submission for user: {}", quizRequest.getUserId());
            
            // Calculate scores for each manager type
            Map<String, Integer> managerTypeScores = new HashMap<>();
            managerTypeScores.put("PUPPETEER", 0);
            managerTypeScores.put("DILUTER", 0);
            managerTypeScores.put("CAMOUFLAGER", 0);
            
            // Sum up scores for each manager type
            for (ManagerTypeQuizRequestDTO.QuizResponse response : quizRequest.getResponses()) {
                String managerType = response.getManagerTypeSignal();
                if (managerTypeScores.containsKey(managerType)) {
                    managerTypeScores.put(managerType, 
                        managerTypeScores.get(managerType) + response.getScore());
                }
            }
            
            // Determine the manager type with the highest score
            String determinedManagerType = "PUPPETEER"; // default
            int highestScore = managerTypeScores.get("PUPPETEER");
            
            for (Map.Entry<String, Integer> entry : managerTypeScores.entrySet()) {
                if (entry.getValue() > highestScore) {
                    highestScore = entry.getValue();
                    determinedManagerType = entry.getKey();
                }
            }
            
            // If all scores are equal or very low, randomly assign
            if (highestScore == 0 || (managerTypeScores.get("PUPPETEER").equals(managerTypeScores.get("DILUTER")) 
                && managerTypeScores.get("DILUTER").equals(managerTypeScores.get("CAMOUFLAGER")))) {
                String[] types = {"PUPPETEER", "DILUTER", "CAMOUFLAGER"};
                determinedManagerType = types[(int) (Math.random() * types.length)];
                logger.info("Scores were equal or too low, randomly assigned: {}", determinedManagerType);
            }
            
            // Update user's manager type preference
            User user = userService.findById(quizRequest.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            user.setManagerTypePreference(determinedManagerType);
            userService.saveUser(user);
            
            logger.info("Updated user {} manager type preference to: {}", 
                user.getEmail(), determinedManagerType);
            
            return ResponseEntity.ok(ManagerTypeQuizResponseDTO.builder()
                .determinedManagerType(determinedManagerType)
                .message("Manager type successfully determined and saved")
                .success(true)
                .build());
                
        } catch (Exception e) {
            logger.error("Error processing manager type quiz: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ManagerTypeQuizResponseDTO.builder()
                .determinedManagerType(null)
                .message("Error processing quiz: " + e.getMessage())
                .success(false)
                .build());
        }
    }
} 