package com.higienesalud.smartsys.config;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ConfiguracionOpenApi {

    @Bean
    public OpenAPI smartSysOpenApi() {
        String scheme = "bearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("SmartSys API")
                        .version("1.0.0")
                        .description("Sistema Integral de Gestion de Servicios Operativos y Control Logístico - Higiene y Salud S.A.C.")
                        .contact(new Contact().name("Higiene y Salud S.A.C.").email("soporte@higienesalud.local")))
                .addSecurityItem(new SecurityRequirement().addList(scheme))
                .components(new Components().addSecuritySchemes(scheme,
                        new SecurityScheme()
                                .name(scheme)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
