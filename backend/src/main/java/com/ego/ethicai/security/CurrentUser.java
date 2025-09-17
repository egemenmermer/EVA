package com.ego.ethicai.security;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.lang.annotation.*;

@Target({ElementType.PARAMETER, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@AuthenticationPrincipal
public @interface CurrentUser {
    /**
     * Whether a non-null user is required in the annotated parameter.
     * If true, null values will result in a 401 Unauthorized response.
     * If false, null values are allowed (for endpoints that support anonymous access).
     * @return true if user is required, false otherwise
     */
    boolean required() default true;
}

