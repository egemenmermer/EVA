package com.ego.ethicai.security.jwt;

import com.ego.ethicai.security.CustomUserDetails;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Base64;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtil {

    private static final Logger logger = LoggerFactory.getLogger(JwtUtil.class);
    private static final long TOKEN_VALIDITY = 1000L * 60 * 60 * 24 * 7; // 7 days
    private static final SignatureAlgorithm SIGNATURE_ALGORITHM = SignatureAlgorithm.HS512;
    
    @Value("${jwt.secret}")
    private String secret;
    
    private Key getSigningKey() {
        try {
            // Decode the Base64 encoded secret
            byte[] decodedKey = Base64.getDecoder().decode(secret);
            // Create a key that's suitable for HS512
            return Keys.hmacShaKeyFor(decodedKey);
        } catch (IllegalArgumentException e) {
            // If the secret is not Base64 encoded, use it directly
            return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        }
    }

    public String getEmailFromToken(String token) {
        try {
            return getClaimFromToken(token, Claims::getSubject);
        } catch (Exception e) {
            logger.error("Failed to extract email from token", e);
            throw new RuntimeException("Invalid token: " + e.getMessage());
        }
    }

    public Date getExpirationDateFromToken(String token) {
        return getClaimFromToken(token, Claims::getExpiration);
    }

    public <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimFromToken(token);
        return claimsResolver.apply(claims);
    }

    public Claims getAllClaimFromToken(String token) {
        try {
            return Jwts.parser()
                    .setSigningKey(getSigningKey())
                    .parseClaimsJws(token)
                    .getBody();
        } catch (Exception e) {
            logger.error("Failed to parse JWT token", e);
            throw new RuntimeException("Failed to parse JWT token: " + e.getMessage());
        }
    }

    private Boolean isTokenExpired(String token) {
        try {
            final Date expiration = getExpirationDateFromToken(token);
            return expiration.before(currentDate());
        } catch (Exception e) {
            logger.error("Failed to check token expiration", e);
            return true;
        }
    }

    private Date currentDate() {
        return new Date(System.currentTimeMillis());
    }

    public String generateToken(CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new IllegalArgumentException("UserDetails cannot be null");
        }
        if (userDetails.getId() == null) {
            throw new IllegalArgumentException("User ID cannot be null");
        }
        if (userDetails.getEmail() == null) {
            throw new IllegalArgumentException("User email cannot be null");
        }

        try {
            String token = Jwts.builder()
                    .setSubject(userDetails.getEmail())
                    .claim("userId", userDetails.getId().toString())
                    .setIssuedAt(currentDate())
                    .setExpiration(new Date(System.currentTimeMillis() + TOKEN_VALIDITY))
                    .signWith(SIGNATURE_ALGORITHM, getSigningKey())
                    .compact();
            
            logger.debug("Generated token for user: {} with ID: {}", userDetails.getEmail(), userDetails.getId());
            return token;
        } catch (Exception e) {
            logger.error("Failed to generate JWT token", e);
            throw new RuntimeException("Failed to generate JWT token: " + e.getMessage());
        }
    }

    public Boolean validateToken(String token, CustomUserDetails userDetails) {
        try {
            if (token == null || userDetails == null) {
                logger.error("Token or UserDetails is null");
                return false;
            }
            
            final String email = getEmailFromToken(token);
            final String userId = getUserIdFromToken(token);
            
            if (email == null || userId == null) {
                logger.error("Email or userId is null in token");
                return false;
            }
            
            if (!email.equals(userDetails.getEmail())) {
                logger.error("Token email does not match UserDetails email");
                return false;
            }
            
            if (!userId.equals(userDetails.getId().toString())) {
                logger.error("Token userId does not match UserDetails id");
                return false;
            }
            
            if (isTokenExpired(token)) {
                logger.error("Token is expired");
                return false;
            }
            
            return true;
        } catch (Exception e) {
            logger.error("Failed to validate token", e);
            return false;
        }
    }

    public String getUserIdFromToken(String token) {
        try {
            String userId = getClaimFromToken(token, claims -> claims.get("userId", String.class));
            if (userId == null || userId.trim().isEmpty()) {
                logger.error("User ID claim is missing or empty in token");
                throw new RuntimeException("Invalid token: User ID not found");
            }
            return userId;
        } catch (Exception e) {
            logger.error("Failed to extract userId from token", e);
            throw new RuntimeException("Invalid token: " + e.getMessage());
        }
    }
}
