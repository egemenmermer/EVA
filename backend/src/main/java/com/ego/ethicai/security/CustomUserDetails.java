package com.ego.ethicai.security;

import com.ego.ethicai.entity.User;
import com.ego.ethicai.enums.AccountTypes;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Data
public class CustomUserDetails implements UserDetails {

    private String email;
    private UUID id;
    private String password;
    private Collection<? extends GrantedAuthority> authorities;
    private AccountTypes role;

    public CustomUserDetails(String email, String password, Collection<? extends GrantedAuthority> authorities) {
        this.email = email;
        this.password = password;
        this.authorities = authorities;
    }

    public CustomUserDetails() {
    }

    public CustomUserDetails(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public CustomUserDetails(User user) {
        this.email = user.getEmail();
        this.id = user.getId();
        this.password = user.getPasswordHash();
        this.role = user.getRole();
        
        List<GrantedAuthority> authorities = new ArrayList<>();
        
        // Add basic user role
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        
        // Add admin role if applicable - make sure it's uppercase for consistency
        if (user.getRole() != null && user.getRole() == AccountTypes.ADMIN) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }
        
        this.authorities = authorities;
    }


    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
