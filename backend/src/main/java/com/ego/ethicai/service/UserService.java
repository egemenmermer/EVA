package com.ego.ethicai.service;

import com.ego.ethicai.dto.UserDTO;
import com.ego.ethicai.dto.UserResponseDTO;
import com.ego.ethicai.entity.ActivationToken;
import com.ego.ethicai.entity.User;
import com.ego.ethicai.security.CustomUserDetails;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
public interface UserService {

    UserResponseDTO getUser(UUID id);
    User getUserByEmail(String email);
    User createUser(User user);
    User saveUser(User user);
    UserResponseDTO updateUser(UUID userId, String fullName);
    CustomUserDetails getUserDetailsByEmail(String email);
    Optional<User> findByEmail(String email);
    Set<User> findAllById(List<UUID> userIds);
    User processOAuthPostLogin(String email, String name, String provider);
    Optional<User> findById(UUID id);
    void deleteUser(UUID id);
    
    // Survey completion methods
    User markConsentFormCompleted(UUID userId);
    User markPreSurveyCompleted(UUID userId);
    User markPostSurveyCompleted(UUID userId);
    
    // Scenario completion methods
    User markAccessibilityScenariosCompleted(UUID userId);
    User markPrivacyScenariosCompleted(UUID userId);
    UserResponseDTO resetScenarioCompletions(UUID userId);
}
