package com.ego.ethicai.config;

import com.ego.ethicai.security.CurrentUser;
import com.ego.ethicai.security.CustomUserDetails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {
    
    private static final Logger logger = LoggerFactory.getLogger(CurrentUserArgumentResolver.class);
    
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.getParameterAnnotation(CurrentUser.class) != null &&
               parameter.getParameterType().equals(CustomUserDetails.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter,
                                  ModelAndViewContainer mavContainer,
                                  org.springframework.web.context.request.NativeWebRequest webRequest,
                                  org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {

        logger.debug("Resolving argument for parameter: {}", parameter.getParameterName());
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // Check if current user is required
        CurrentUser currentUserAnnotation = parameter.getParameterAnnotation(CurrentUser.class);
        boolean isRequired = currentUserAnnotation != null && currentUserAnnotation.required();
        
        logger.debug("User required: {}, Authentication present: {}", 
                     isRequired, authentication != null && authentication.isAuthenticated());
        
        // If authentication is valid, return the user details
        if (authentication != null && authentication.isAuthenticated() && 
            !"anonymousUser".equals(authentication.getPrincipal())) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails) {
                CustomUserDetails userDetails = (CustomUserDetails) principal;
                logger.debug("Resolved user details for email: {} with ID: {}", userDetails.getEmail(), userDetails.getId());
                return userDetails;
            }
            logger.warn("Principal is not an instance of CustomUserDetails: {}", 
                       principal != null ? principal.getClass().getName() : "null");
            
            // If user is not required, return null instead of throwing exception
            if (!isRequired) {
                logger.info("User not required, returning null for non-CustomUserDetails principal");
                return null;
            }
            
            throw new RuntimeException("Invalid authentication principal type");
        }
        
        // No authenticated user but it's not required
        if (!isRequired) {
            logger.info("No authenticated user found, but not required - returning null");
            return null;
        }
        
        // No authenticated user and it is required
        logger.error("No authenticated user found and user is required");
        throw new RuntimeException("No authenticated user found");
    }
}