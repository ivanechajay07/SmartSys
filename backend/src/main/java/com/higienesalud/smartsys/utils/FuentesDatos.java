package com.higienesalud.smartsys.utils;

import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Encapsula el acceso a la fuente de datos.
 *
 * <p>Spring Boot configura un pool HikariCP y lo expone como {@link DataSource}.
 * Esta clase centraliza la obtención y liberación de conexiones para que los
 * DAO concretos no dependan directamente del pool.</p>
 *
 * <p>Se usa {@link DataSourceUtils} para que la conexión participe en la
 * transacción de Spring cuando el DAO es invocado desde un servicio
 * transaccional.</p>
 */
@Component
public class FuentesDatos {

    private final DataSource dataSource;

    public FuentesDatos(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public Connection obtenerConexion() {
        return DataSourceUtils.getConnection(dataSource);
    }

    public void liberarConexion(Connection conexion) {
        DataSourceUtils.releaseConnection(conexion, dataSource);
    }
}
