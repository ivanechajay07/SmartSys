package com.higienesalud.smartsys.dao;

import com.higienesalud.smartsys.exception.ExcepcionNoEncontrada;
import com.higienesalud.smartsys.interfaces.ProductoDao;
import com.higienesalud.smartsys.model.Producto;
import com.higienesalud.smartsys.utils.FuentesDatos;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Implementación concreta del patrón DAO para la tabla producto.
 *
 * <p>No hereda de JpaRepository ni usa Spring Data. Ejecuta JDBC directamente
 * sobre la conexión que entrega {@link FuentesDatos} (HikariCP) y mapea cada
 * fila del ResultSet a un objeto {@link Producto}.</p>
 */
@Component
public class ProductoDaoImpl implements ProductoDao {

    private static final String COLUMNAS = """
            id_producto, codigo, nombre, descripcion, categoria,
            unidad_medida, marca, requiere_lote, requiere_vencimiento,
            estado, created_at, updated_at
            """;

    private final FuentesDatos fuenteDatos;

    public ProductoDaoImpl(FuentesDatos fuenteDatos) {
        this.fuenteDatos = fuenteDatos;
    }

    @Override
    public Producto crear(Producto producto) {
        String sql = """
                INSERT INTO producto
                    (codigo, nombre, descripcion, categoria, unidad_medida, marca,
                     requiere_lote, requiere_vencimiento, estado, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        Connection conexion = fuenteDatos.obtenerConexion();
        try (PreparedStatement ps = conexion.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            LocalDateTime ahora = LocalDateTime.now();
            ps.setString(1, producto.getCodigo());
            ps.setString(2, producto.getNombre());
            ps.setString(3, producto.getDescripcion());
            ps.setString(4, producto.getCategoria());
            ps.setString(5, producto.getUnidadMedida());
            ps.setString(6, producto.getMarca());
            ps.setBoolean(7, producto.isRequiereLote());
            ps.setBoolean(8, producto.isRequiereVencimiento());
            ps.setBoolean(9, producto.isActivo());
            ps.setTimestamp(10, Timestamp.valueOf(ahora));
            ps.setTimestamp(11, Timestamp.valueOf(ahora));
            ps.executeUpdate();

            try (ResultSet claves = ps.getGeneratedKeys()) {
                if (claves.next()) {
                    producto.setId(claves.getLong(1));
                }
            }
            producto.setCreatedAt(ahora);
            producto.setUpdatedAt(ahora);
            return producto;
        } catch (SQLException e) {
            throw new IllegalStateException("Error al crear el producto", e);
        } finally {
            fuenteDatos.liberarConexion(conexion);
        }
    }

    @Override
    public Optional<Producto> leer(Long id) {
        String sql = "SELECT " + COLUMNAS + " FROM producto WHERE id_producto = ?";

        Connection conexion = fuenteDatos.obtenerConexion();
        try (PreparedStatement ps = conexion.prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(mapear(rs)) : Optional.empty();
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Error al leer el producto", e);
        } finally {
            fuenteDatos.liberarConexion(conexion);
        }
    }

    @Override
    public Producto actualizar(Producto producto) {
        String sql = """
                UPDATE producto
                SET codigo = ?, nombre = ?, descripcion = ?, categoria = ?,
                    unidad_medida = ?, marca = ?, requiere_lote = ?,
                    requiere_vencimiento = ?, estado = ?, updated_at = ?
                WHERE id_producto = ?
                """;

        Connection conexion = fuenteDatos.obtenerConexion();
        try (PreparedStatement ps = conexion.prepareStatement(sql)) {
            LocalDateTime ahora = LocalDateTime.now();
            ps.setString(1, producto.getCodigo());
            ps.setString(2, producto.getNombre());
            ps.setString(3, producto.getDescripcion());
            ps.setString(4, producto.getCategoria());
            ps.setString(5, producto.getUnidadMedida());
            ps.setString(6, producto.getMarca());
            ps.setBoolean(7, producto.isRequiereLote());
            ps.setBoolean(8, producto.isRequiereVencimiento());
            ps.setBoolean(9, producto.isActivo());
            ps.setTimestamp(10, Timestamp.valueOf(ahora));
            ps.setLong(11, producto.getId());

            if (ps.executeUpdate() == 0) {
                throw new ExcepcionNoEncontrada("Producto no encontrado");
            }
            producto.setUpdatedAt(ahora);
            return producto;
        } catch (SQLException e) {
            throw new IllegalStateException("Error al actualizar el producto", e);
        } finally {
            fuenteDatos.liberarConexion(conexion);
        }
    }

    @Override
    public void eliminar(Producto producto) {
        String sql = "DELETE FROM producto WHERE id_producto = ?";

        Connection conexion = fuenteDatos.obtenerConexion();
        try (PreparedStatement ps = conexion.prepareStatement(sql)) {
            ps.setLong(1, producto.getId());
            if (ps.executeUpdate() == 0) {
                throw new ExcepcionNoEncontrada("Producto no encontrado");
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Error al eliminar el producto", e);
        } finally {
            fuenteDatos.liberarConexion(conexion);
        }
    }

    @Override
    public List<Producto> listar() {
        String sql = "SELECT " + COLUMNAS + " FROM producto ORDER BY nombre";

        Connection conexion = fuenteDatos.obtenerConexion();
        try (PreparedStatement ps = conexion.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            List<Producto> productos = new ArrayList<>();
            while (rs.next()) {
                productos.add(mapear(rs));
            }
            return productos;
        } catch (SQLException e) {
            throw new IllegalStateException("Error al listar los productos", e);
        } finally {
            fuenteDatos.liberarConexion(conexion);
        }
    }

    @Override
    public Optional<Producto> buscarPorCodigo(String codigo) {
        String sql = "SELECT " + COLUMNAS + " FROM producto WHERE LOWER(codigo) = LOWER(?)";

        Connection conexion = fuenteDatos.obtenerConexion();
        try (PreparedStatement ps = conexion.prepareStatement(sql)) {
            ps.setString(1, codigo);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? Optional.of(mapear(rs)) : Optional.empty();
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Error al buscar el producto por código", e);
        } finally {
            fuenteDatos.liberarConexion(conexion);
        }
    }

    @Override
    public List<Producto> listarActivos() {
        String sql = "SELECT " + COLUMNAS + " FROM producto WHERE estado = TRUE ORDER BY nombre";

        Connection conexion = fuenteDatos.obtenerConexion();
        try (PreparedStatement ps = conexion.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            List<Producto> productos = new ArrayList<>();
            while (rs.next()) {
                productos.add(mapear(rs));
            }
            return productos;
        } catch (SQLException e) {
            throw new IllegalStateException("Error al listar los productos activos", e);
        } finally {
            fuenteDatos.liberarConexion(conexion);
        }
    }

    private Producto mapear(ResultSet rs) throws SQLException {
        Producto producto = new Producto();
        producto.setId(rs.getLong("id_producto"));
        producto.setCodigo(rs.getString("codigo"));
        producto.setNombre(rs.getString("nombre"));
        producto.setDescripcion(rs.getString("descripcion"));
        producto.setCategoria(rs.getString("categoria"));
        producto.setUnidadMedida(rs.getString("unidad_medida"));
        producto.setMarca(rs.getString("marca"));
        producto.setRequiereLote(rs.getBoolean("requiere_lote"));
        producto.setRequiereVencimiento(rs.getBoolean("requiere_vencimiento"));
        producto.setActivo(rs.getBoolean("estado"));

        Timestamp creado = rs.getTimestamp("created_at");
        if (creado != null) {
            producto.setCreatedAt(creado.toLocalDateTime());
        }
        Timestamp actualizado = rs.getTimestamp("updated_at");
        if (actualizado != null) {
            producto.setUpdatedAt(actualizado.toLocalDateTime());
        }
        return producto;
    }
}
