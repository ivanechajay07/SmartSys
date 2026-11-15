package com.higienesalud.smartsys;

import com.higienesalud.smartsys.model.*;
import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
class PruebaEsquemaMySql {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("smartsys")
            .withUsername("smartsys")
            .withPassword("smartsys");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.flyway.baseline-on-migrate", () -> "false");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("app.seed.demo", () -> "false");
        registry.add("app.seed.password", () -> "Admin123!");
        registry.add("app.jwt.secret", () -> "SmartSysTestSecretKeyAtLeast32BytesLongForHmac");
    }

    @Autowired private JdbcTemplate jdbcTemplate;

    @Test
    void flywayMigrationCreatesSchemaValidatedByHibernate() {
        Integer migrations = jdbcTemplate.queryForObject(
                "select count(*) from flyway_schema_history where success = 1", Integer.class);
        Integer tables = jdbcTemplate.queryForObject(
                "select count(*) from information_schema.tables where table_schema = 'smartsys'",
                Integer.class);
        assertThat(migrations).isNotNull().isGreaterThanOrEqualTo(1);
        assertThat(tables).isNotNull().isGreaterThanOrEqualTo(27);
    }
}
