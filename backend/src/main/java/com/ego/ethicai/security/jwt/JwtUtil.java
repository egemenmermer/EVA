package com.ego.ethicai.security.jwt;

import com.ego.ethicai.security.CustomUserDetails;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Base64;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtil {

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
            throw new RuntimeException("Failed to parse JWT token: " + e.getMessage());
        }
    }

    private Boolean isTokenExpired(String token) {
        try {
            final Date expiration = getExpirationDateFromToken(token);
            return expiration.before(currentDate());
        } catch (Exception e) {
            return true;
        }
    }

    private Date currentDate() {
        return new Date(System.currentTimeMillis());
    }

    public String generateToken(CustomUserDetails userDetails) {
        try {
            return Jwts.builder()
                    .setSubject(userDetails.getEmail())
                    .claim("userId", userDetails.getId().toString())
                    .setIssuedAt(currentDate())
                    .setExpiration(new Date(System.currentTimeMillis() + TOKEN_VALIDITY))
                    .signWith(SIGNATURE_ALGORITHM, getSigningKey())
                    .compact();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate JWT token: " + e.getMessage());
        }
    }

    public Boolean validateToken(String token, CustomUserDetails userDetails) {
        try {
            if (token == null || userDetails == null) {
                return false;
            }
            
            final String email = getEmailFromToken(token);
            return (email != null && 
                    email.equals(userDetails.getEmail()) && 
                    !isTokenExpired(token));
        } catch (Exception e) {
            return false;
        }
    }

    public String extractEmail(String token) {
        return getEmailFromToken(token);
    }

    public String getUserIdFromToken(String token) {
        try {
            return getClaimFromToken(token, claims -> claims.get("userId", String.class));
        } catch (Exception e) {
            throw new RuntimeException("Invalid token: " + e.getMessage());
        }
    }
}
