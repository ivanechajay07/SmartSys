package com.higienesalud.smartsys.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
public class ConfiguracionCsrf {

    @Bean
    public CookieCsrfTokenRepository csrfTokenRepository(
            @Value("${app.security.refresh-cookie-secure:true}") boolean secure) {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookieCustomizer(cookie -> cookie
                .sameSite("Strict")
                .secure(secure)
                .path("/"));
        return repository;
    }
}
