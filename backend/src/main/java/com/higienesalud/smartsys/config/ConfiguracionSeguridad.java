package com.higienesalud.smartsys.config;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.session.NullAuthenticatedSessionStrategy;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class ConfiguracionSeguridad {

    private final FiltroAutenticacionJwt FiltroAutenticacionJwt;
    private final FiltroLimiteTasa filtroLimiteTasa;
    private final CorsConfigurationSource corsConfigurationSource;
    private final CookieCsrfTokenRepository csrfTokenRepository;

    public ConfiguracionSeguridad(FiltroAutenticacionJwt FiltroAutenticacionJwt,
                                  FiltroLimiteTasa filtroLimiteTasa,
                                  CorsConfigurationSource corsConfigurationSource,
                                  CookieCsrfTokenRepository csrfTokenRepository) {
        this.FiltroAutenticacionJwt = FiltroAutenticacionJwt;
        this.filtroLimiteTasa = filtroLimiteTasa;
        this.corsConfigurationSource = corsConfigurationSource;
        this.csrfTokenRepository = csrfTokenRepository;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // El refresh token vive en una cookie HttpOnly; las operaciones
                // que mutan estado requieren el token CSRF de la cookie XSRF-TOKEN.
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        // En una API stateless el JWT no debe invalidar el
                        // token CSRF en cada request autenticado.
                        .sessionAuthenticationStrategy((authentication, request, response) -> { })
                        .ignoringRequestMatchers(
                                "/api/v1/auth/login",
                                "/api/v1/auth/mfa/verify",
                                "/api/v1/auth/forgot-password",
                                "/ws/**"))
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(s -> s
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                        // JWT se autentica en cada request; no debe borrar el
                        // token CSRF como si fuera una autenticación de sesión.
                        .sessionAuthenticationStrategy(new NullAuthenticatedSessionStrategy()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh",
                                "/api/v1/auth/logout",
                                "/api/v1/auth/csrf",
                                "/api/v1/auth/mfa/verify",
                                "/api/v1/auth/forgot-password",
                                "/actuator/health", "/actuator/health/**",
                                "/ws/**").permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMINISTRADOR")
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
                        .hasRole("ADMINISTRADOR")
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated())
                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(opts -> {})
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000)))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, e) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\":\"No autenticado\"}");
                        })
                        .accessDeniedHandler((request, response, e) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\":\"No autorizado\"}");
                        }))
                .addFilterBefore(filtroLimiteTasa, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(FiltroAutenticacionJwt, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins:http://localhost:5173}") String allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setExposedHeaders(List.of("Content-Disposition"));
        // Las credenciales solo son necesarias si se migra a cookies; con Bearer puede quedar en false.
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
