package com.ego.ethicai.config;

import com.ego.ethicai.entity.User;
import com.ego.ethicai.exception.UserNotFoundException;
import com.ego.ethicai.security.CustomUserDetails;
import com.ego.ethicai.security.jwt.JwtUtil;
import com.ego.ethicai.service.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        DefaultOAuth2User oauthUser = (DefaultOAuth2User) authentication.getPrincipal();
        String email = oauthUser.getAttribute("email");
        User user = userService.findByEmail(email).orElseThrow(
                () -> new UserNotFoundException("User not found for this email: " + email));

        String token = jwtUtil.generateToken(new CustomUserDetails(user));

        response.sendRedirect("http://localhost:3000/oauth/success?token=" + token);
    }
}
