-- Cierre de restricciones del núcleo APF2.
-- Todas las columnas fueron pobladas por V4 y por los servicios de la aplicación.

ALTER TABLE usuario MODIFY id_rol INT NOT NULL;
ALTER TABLE movimiento_inventario MODIFY id_inventario BIGINT NOT NULL;
ALTER TABLE solicitud_material
    MODIFY id_orden BIGINT NOT NULL,
    MODIFY nro_ticket VARCHAR(20) NOT NULL;
ALTER TABLE solicitud_reposicion
    MODIFY id_producto BIGINT NOT NULL,
    MODIFY cantidad_solicitada DECIMAL(14,3) NOT NULL;
ALTER TABLE despacho MODIFY id_salida BIGINT NOT NULL;
