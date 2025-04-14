package com.ego.ethicai.security.jwt;

import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.IOException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class JwtRequestFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtRequestFilter.class);

    @Autowired
    private JwtUtil jwtTokenUtil;

    @Autowired
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // Skip token validation for preflight requests
            if (request.getMethod().equals("OPTIONS")) {
                filterChain.doFilter(request, response);
                return;
            }

            String requestTokenHeader = request.getHeader("Authorization");
            String email = null;
            String jwtToken = null;
            CustomUserDetails userDetails = null;

            // Extract JWT Token
            if (requestTokenHeader != null && requestTokenHeader.startsWith("Bearer ")) {
                jwtToken = requestTokenHeader.substring(7);
                try {
                    email = jwtTokenUtil.getEmailFromToken(jwtToken);
                    logger.debug("Processing token for user: {}", email);
                } catch (IllegalArgumentException e) {
                    logger.error("Unable to get JWT Token", e);
                    sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Unable to get JWT Token");
                    return;
                } catch (ExpiredJwtException e) {
                    logger.error("JWT Token has expired", e);
                    sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "JWT token expired");
                    return;
                }
            } else if (requestTokenHeader != null) {
                logger.warn("JWT Token does not begin with Bearer String");
                sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid token format");
                return;
            }

            // Validate and set authentication
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    // Get user details
                    userDetails = userService.getUserDetailsByEmail(email);
                    if (userDetails == null) {
                        logger.error("User not found for email: {}", email);
                        sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "User not found");
                        return;
                    }

                    // Extract and validate user ID from token
                    String userId = jwtTokenUtil.getUserIdFromToken(jwtToken);
                    if (userId == null || userId.trim().isEmpty()) {
                        logger.error("User ID not found in token for email: {}", email);
                        sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid token: User ID not found");
                        return;
                    }

                    try {
                        UUID parsedUserId = UUID.fromString(userId);
                        // Always set the ID from the token
                        userDetails.setId(parsedUserId);
                        logger.debug("Set user ID from token: {} for email: {}", parsedUserId, email);

                        // Validate token
                        if (jwtTokenUtil.validateToken(jwtToken, userDetails)) {
                            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                            logger.debug("Authentication successful for user: {} with ID: {}", email, userId);
                        } else {
                            logger.error("Token validation failed for user: {}", email);
                            sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Token validation failed");
                            return;
                        }
                    } catch (IllegalArgumentException e) {
                        logger.error("Invalid UUID format in token for user: {}", email, e);
                        sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid token: Invalid user ID format");
                        return;
                    }
                } catch (Exception e) {
                    logger.error("Error processing authentication for user: {}", email, e);
                    sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Authentication processing failed");
                    return;
                }
            }

            filterChain.doFilter(request, response);
        } catch (Exception e) {
            logger.error("Error in JWT filter chain", e);
            sendErrorResponse(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Internal server error");
        }
    }

    private void sendErrorResponse(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        error.put("status", String.valueOf(status));
        error.put("timestamp", new Date().toString());
        error.put("path", ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest().getRequestURI());

        objectMapper.writeValue(response.getWriter(), error);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        logger.debug("Checking if path should be filtered: {}", path);
        
        boolean shouldExclude = path.startsWith("/api/v1/auth/login") || 
               path.startsWith("/api/v1/auth/register") || 
               path.startsWith("/api/v1/auth/oauth2") ||
               path.startsWith("/swagger-ui") ||
               path.startsWith("/v3/api-docs") ||
               path.startsWith("/api-docs") ||
               path.startsWith("/api/v1/practice-score") ||
               path.contains("practice-score") ||
               request.getMethod().equals("OPTIONS");
               
        logger.debug("Path {} should be excluded from filtering: {}", path, shouldExclude);
        return shouldExclude;
    }
}
