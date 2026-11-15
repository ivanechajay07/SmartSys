package com.higienesalud.smartsys.config;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.security.ServicioJwt;
import com.higienesalud.smartsys.security.ServicioDetallesUsuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
public class ConfiguracionWebSocket implements WebSocketMessageBrokerConfigurer {

    private final ServicioJwt ServicioJwt;
    private final ServicioDetallesUsuario userDetailsService;
    private final String allowedOrigins;

    public ConfiguracionWebSocket(ServicioJwt ServicioJwt, ServicioDetallesUsuario userDetailsService,
                           @Value("${app.cors.allowed-origins:http://localhost:5173}") String allowedOrigins) {
        this.ServicioJwt = ServicioJwt;
        this.userDetailsService = userDetailsService;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(allowedOrigins.split(","))
                .withSockJS();
        registry.addEndpoint("/ws")
                .setAllowedOrigins(allowedOrigins.split(","));
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    List<String> headers = accessor.getNativeHeader("Authorization");
                    String header = headers == null || headers.isEmpty() ? null : headers.get(0);
                    if (header == null || !header.startsWith("Bearer ")) {
                        throw new IllegalArgumentException("WebSocket sin token");
                    }
                    String token = header.substring(7);
                    if (!ServicioJwt.valid(token)) {
                        throw new IllegalArgumentException("WebSocket token inválido");
                    }
                    UserDetails user = userDetailsService.loadUserByUsername(ServicioJwt.subject(token));
                    if (!user.isEnabled() || !user.isAccountNonLocked()) {
                        throw new IllegalArgumentException("WebSocket usuario inactivo o bloqueado");
                    }
                    accessor.setUser(new UsernamePasswordAuthenticationToken(
                            user, null, user.getAuthorities()));
                }
                return message;
            }
        });
    }
}
