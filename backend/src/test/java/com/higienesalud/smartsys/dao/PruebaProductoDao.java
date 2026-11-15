package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.interfaces.ProductoDao;
import com.higienesalud.smartsys.model.Producto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifica el CRUD completo del DAO concreto contra una base real de prueba
 * (H2 en modo MySQL). En producción el mismo DAO apunta a MySQL 8.4 mediante
 * el DataSource HikariCP configurado por Spring Boot.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PruebaProductoDao {

    @Autowired
    private ProductoDao productoDao;

    @Test
    void ejecutaCrearLeerActualizarEliminarSobreProducto() {
        Producto nuevo = Producto.builder()
                .codigo("DAO-TEST-001")
                .nombre("Producto de prueba DAO")
                .descripcion("Registro creado por ProductoDaoImpl")
                .categoria("Pruebas")
                .unidadMedida("UNIDAD")
                .marca("SmartSys")
                .requiereLote(true)
                .requiereVencimiento(false)
                .activo(true)
                .build();

        Producto creado = productoDao.crear(nuevo);

        assertThat(creado.getId()).isNotNull();
        assertThat(creado.getCreatedAt()).isNotNull();
        assertThat(productoDao.leer(creado.getId())).isPresent();
        assertThat(productoDao.buscarPorCodigo("dao-test-001")).isPresent();
        assertThat(productoDao.listar())
                .extracting(Producto::getCodigo)
                .contains("DAO-TEST-001");

        creado.setNombre("Producto actualizado por DAO");
        creado.setCategoria("Pruebas actualizadas");
        productoDao.actualizar(creado);

        Producto actualizado = productoDao.leer(creado.getId()).orElseThrow();
        assertThat(actualizado.getNombre()).isEqualTo("Producto actualizado por DAO");
        assertThat(actualizado.getCategoria()).isEqualTo("Pruebas actualizadas");
        assertThat(actualizado.getUpdatedAt()).isNotNull();

        productoDao.eliminar(actualizado);
        assertThat(productoDao.leer(creado.getId())).isEmpty();
    }
}
