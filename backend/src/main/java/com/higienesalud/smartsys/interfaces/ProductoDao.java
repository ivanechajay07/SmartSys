package com.higienesalud.smartsys.interfaces;

import com.higienesalud.smartsys.model.Producto;

import java.util.List;
import java.util.Optional;

/**
 * DAO específico de la tabla producto.
 *
 * <p>Extiende el contrato genérico {@link DataAccessObject} y agrega las
 * consultas propias de la capa de negocio. La implementación concreta es
 * {@code ProductoDaoImpl}.</p>
 */
public interface ProductoDao extends DataAccessObject<Producto, Long> {

    List<Producto> listar();

    Optional<Producto> buscarPorCodigo(String codigo);

    List<Producto> listarActivos();
}
