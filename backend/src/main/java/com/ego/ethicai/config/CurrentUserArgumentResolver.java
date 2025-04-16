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
        // Check if the parameter is annotated with @CurrentUser and is of type CustomUserDetails
        return parameter.hasParameterAnnotation(CurrentUser.class) &&
               parameter.getParameterType().isAssignableFrom(CustomUserDetails.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter,
                                  ModelAndViewContainer mavContainer,
                                  org.springframework.web.context.request.NativeWebRequest webRequest,
                                  org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {

        logger.debug("Attempting to resolve @CurrentUser for parameter: {}", parameter.getParameterName());

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        CurrentUser currentUserAnnotation = parameter.getParameterAnnotation(CurrentUser.class);
        // Determine if a non-null user is explicitly required by the annotation
        boolean isRequired = currentUserAnnotation != null && currentUserAnnotation.required();

        logger.debug("Parameter type expected: {}", parameter.getParameterType().getName());
        logger.debug("Annotation requires non-null user: {}", isRequired);

        // Check if there is a valid, authenticated, non-anonymous user
        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() != null &&
            !"anonymousUser".equals(authentication.getPrincipal().toString())) {
            
            Object principal = authentication.getPrincipal();
            logger.debug("Authentication found. Principal type: {}", principal.getClass().getName());

            // Check if the principal is the expected type
            if (parameter.getParameterType().isAssignableFrom(principal.getClass())) {
                // Cast should be safe due to isAssignableFrom check
                CustomUserDetails userDetails = (CustomUserDetails) principal;
                logger.debug("Principal is CustomUserDetails. Returning user details for email: {} with ID: {}", 
                             userDetails.getEmail(), userDetails.getId());
                return userDetails; // Success case: Return the resolved user details
            } else {
                // Principal is not the expected type (e.g., String, different UserDetails implementation)
                logger.warn("Principal type mismatch. Expected: {}, Actual: {}", 
                           parameter.getParameterType().getName(), principal.getClass().getName());
                if (isRequired) {
                    logger.error("Error: Principal type mismatch, but user is required.");
                    // Throw an exception because the required user could not be resolved correctly
                    throw new ClassCastException("Authentication principal is not of expected type " + parameter.getParameterType().getName());
                } else {
                    logger.info("Principal type mismatch, but user is not required. Returning null.");
                    return null; // Not required, principal wrong type, return null
                }
            }
        } else {
            // No valid authentication found or user is anonymous
            String principalInfo = (authentication != null && authentication.getPrincipal() != null) ? 
                                 authentication.getPrincipal().toString() : "null";
            logger.warn("No valid authentication found (Authentication: {}, isAuthenticated: {}, Principal: {})",
                    authentication,
                    authentication != null ? authentication.isAuthenticated() : "N/A",
                    principalInfo);
                    
            if (isRequired) {
                logger.error("Error: No authenticated user found, but user is required.");
                // Throw an exception because the required user is missing
                throw new IllegalStateException("No authenticated user found for required @CurrentUser parameter");
            } else {
                logger.info("No authenticated user found, and user is not required. Returning null.");
                return null; // Not required, no authentication, return null
            }
        }
    }
}