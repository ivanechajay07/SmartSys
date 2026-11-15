package com.higienesalud.smartsys.interfaces;

import java.util.Optional;

/**
 * Contrato genérico del patrón Data Access Object (DAO).
 *
 * <p>Define las cuatro operaciones CRUD que todo DAO concreto debe implementar.
 * No es un repositorio de Spring Data: aquí no hay proxies generados por el
 * framework, la implementación es una clase Java explícita.</p>
 *
 * @param <E> entidad o modelo que representa la tabla
 * @param <K> tipo de la clave primaria
 */
public interface DataAccessObject<E, K> {

    E crear(E entidad);

    Optional<E> leer(K id);

    E actualizar(E entidad);

    void eliminar(E entidad);
}
