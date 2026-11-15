-- Alineación del núcleo físico al modelo APF2_SmartSys.
-- Se conservan tablas y columnas adicionales del proyecto como extensiones,
-- pero las tablas y columnas del APF2 quedan presentes y pobladas.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

/* ============================================================
   1. Renombres del núcleo APF2
   ============================================================ */

ALTER TABLE usuario RENAME COLUMN id TO id_usuario,
    RENAME COLUMN email TO correo,
    RENAME COLUMN password_hash TO clave_hash,
    RENAME COLUMN activo TO estado;

ALTER TABLE producto RENAME COLUMN id TO id_producto,
    RENAME COLUMN activo TO estado;

ALTER TABLE inventario RENAME COLUMN id TO id_inventario,
    RENAME COLUMN producto_id TO id_producto,
    RENAME COLUMN stock_fisico TO stock_actual;

ALTER TABLE movimiento_inventario RENAME COLUMN id TO id_movimiento,
    RENAME COLUMN tipo TO tipo_movimiento,
    RENAME COLUMN saldo_resultante TO saldo,
    RENAME COLUMN fecha TO fecha_movimiento;

ALTER TABLE solicitud_material RENAME COLUMN id TO id_solicitud,
    RENAME COLUMN solicitante_id TO id_usuario,
    RENAME COLUMN justificacion TO observacion;

ALTER TABLE detalle_solicitud RENAME COLUMN id TO id_detalle_solicitud,
    RENAME COLUMN solicitud_id TO id_solicitud,
    RENAME COLUMN producto_id TO id_producto;

ALTER TABLE despacho RENAME COLUMN id TO id_despacho,
    RENAME COLUMN fecha TO fecha_despacho;

ALTER TABLE solicitud_reposicion RENAME COLUMN id TO id_reposicion,
    RENAME COLUMN solicitante_id TO id_solicitante,
    RENAME COLUMN aprobador_id TO id_aprobador;

/* ============================================================
   2. Columnas APF2 en tablas existentes
   ============================================================ */

ALTER TABLE usuario
    ADD COLUMN id_rol INT NULL AFTER id_usuario,
    ADD COLUMN dni VARCHAR(8) NULL AFTER apellidos;

ALTER TABLE producto ADD COLUMN tipo VARCHAR(30) NULL AFTER unidad_medida;

ALTER TABLE inventario
    ADD COLUMN ubicacion VARCHAR(100) NULL AFTER stock_minimo,
    ADD COLUMN estado TINYINT(1) NOT NULL DEFAULT 1 AFTER ubicacion,
    ADD COLUMN fecha_actualizacion DATETIME(6) NULL AFTER estado;

UPDATE inventario SET fecha_actualizacion = COALESCE(updated_at, created_at, NOW(6));

ALTER TABLE movimiento_inventario ADD COLUMN id_inventario BIGINT NULL AFTER id_movimiento;

ALTER TABLE solicitud_material
    ADD COLUMN id_orden BIGINT NULL AFTER id_solicitud,
    ADD COLUMN nro_ticket VARCHAR(20) NULL AFTER id_usuario;

ALTER TABLE despacho
    ADD COLUMN id_salida BIGINT NULL AFTER id_despacho,
    ADD COLUMN transportista VARCHAR(100) NULL,
    ADD COLUMN placa_vehiculo VARCHAR(100) NULL,
    ADD COLUMN punto_destino VARCHAR(150) NULL,
    ADD COLUMN boleta_ruta VARCHAR(30) NULL,
    ADD COLUMN incidencia VARCHAR(200) NULL;

ALTER TABLE solicitud_reposicion
    ADD COLUMN id_alerta BIGINT NULL AFTER id_reposicion,
    ADD COLUMN id_producto BIGINT NULL AFTER id_alerta,
    ADD COLUMN cantidad_solicitada DECIMAL(14,3) NULL AFTER fecha_solicitud;

/* ============================================================
   3. Catálogo de roles y tablas APF2 faltantes
   ============================================================ */

CREATE TABLE IF NOT EXISTS rol (
    id_rol INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    descripcion VARCHAR(100) NULL,
    PRIMARY KEY (id_rol),
    UNIQUE KEY uk_rol_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO rol (id_rol, nombre, descripcion) VALUES
    (1, 'ADMINISTRADOR', 'Administrador del sistema'),
    (2, 'GERENTE_GENERAL', 'Gerente general'),
    (3, 'JEFE_LOGISTICA', 'Jefe de logística'),
    (4, 'ENCARGADO_ALMACEN', 'Encargado de almacén'),
    (5, 'PERSONAL_OPERATIVO', 'Personal operativo'),
    (6, 'PERSONAL_LOGISTICA', 'Personal de logística'),
    (7, 'RESPONSABLE_DISTRIBUCION', 'Responsable de distribución'),
    (8, 'TRANSPORTISTA', 'Transportista')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

CREATE TABLE IF NOT EXISTS proveedor (
    id_proveedor BIGINT NOT NULL AUTO_INCREMENT,
    ruc VARCHAR(11) NOT NULL,
    razon_social VARCHAR(120) NOT NULL,
    direccion VARCHAR(150) NULL,
    telefono VARCHAR(20) NULL,
    correo VARCHAR(100) NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id_proveedor),
    UNIQUE KEY uk_proveedor_ruc (ruc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orden_servicio (
    id_orden BIGINT NOT NULL AUTO_INCREMENT,
    cliente_nombre VARCHAR(120) NOT NULL,
    cliente_ruc CHAR(11) NOT NULL,
    direccion_servicio VARCHAR(150) NULL,
    tipo_servicio VARCHAR(60) NULL,
    fecha_servicio DATE NOT NULL,
    estado VARCHAR(30) NOT NULL,
    PRIMARY KEY (id_orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reporte_inventario (
    id_reporte BIGINT NOT NULL AUTO_INCREMENT,
    id_usuario BIGINT NOT NULL,
    tipo_reporte VARCHAR(30) NOT NULL,
    fecha_desde DATE NULL,
    fecha_hasta DATE NULL,
    formato VARCHAR(15) NULL,
    fecha_generacion DATE NOT NULL,
    PRIMARY KEY (id_reporte),
    KEY fk_reporte_usuario (id_usuario),
    CONSTRAINT fk_reporte_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ingreso_almacen (
    id_ingreso BIGINT NOT NULL AUTO_INCREMENT,
    id_usuario BIGINT NOT NULL,
    id_proveedor BIGINT NULL,
    nro_guia_remision VARCHAR(30) NULL,
    fecha_ingreso DATE NOT NULL,
    observacion VARCHAR(255) NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id_ingreso),
    KEY fk_ingreso_usuario (id_usuario),
    KEY fk_ingreso_proveedor (id_proveedor),
    CONSTRAINT fk_ingreso_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario),
    CONSTRAINT fk_ingreso_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedor (id_proveedor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detalle_ingreso (
    id_detalle_ingreso BIGINT NOT NULL AUTO_INCREMENT,
    id_ingreso BIGINT NOT NULL,
    id_producto BIGINT NOT NULL,
    cantidad DECIMAL(14,3) NOT NULL,
    lote VARCHAR(30) NULL,
    fecha_vencimiento DATE NULL,
    PRIMARY KEY (id_detalle_ingreso),
    KEY fk_detalle_ingreso (id_ingreso),
    KEY fk_detalle_ingreso_producto (id_producto),
    CONSTRAINT fk_detalle_ingreso FOREIGN KEY (id_ingreso) REFERENCES ingreso_almacen (id_ingreso),
    CONSTRAINT fk_detalle_ingreso_producto FOREIGN KEY (id_producto) REFERENCES producto (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salida_almacen (
    id_salida BIGINT NOT NULL AUTO_INCREMENT,
    id_solicitud BIGINT NULL,
    id_usuario BIGINT NOT NULL,
    nro_guia_interna VARCHAR(20) NULL,
    fecha_salida DATE NOT NULL,
    tipo_entrega VARCHAR(30) NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id_salida),
    KEY fk_salida_solicitud (id_solicitud),
    KEY fk_salida_usuario (id_usuario),
    CONSTRAINT fk_salida_solicitud FOREIGN KEY (id_solicitud) REFERENCES solicitud_material (id_solicitud),
    CONSTRAINT fk_salida_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detalle_salida (
    id_detalle_salida BIGINT NOT NULL AUTO_INCREMENT,
    id_salida BIGINT NOT NULL,
    id_producto BIGINT NOT NULL,
    cantidad_entregada DECIMAL(14,3) NOT NULL,
    PRIMARY KEY (id_detalle_salida),
    KEY fk_detalle_salida (id_salida),
    KEY fk_detalle_salida_producto (id_producto),
    CONSTRAINT fk_detalle_salida FOREIGN KEY (id_salida) REFERENCES salida_almacen (id_salida),
    CONSTRAINT fk_detalle_salida_producto FOREIGN KEY (id_producto) REFERENCES producto (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alerta_stock (
    id_alerta BIGINT NOT NULL AUTO_INCREMENT,
    id_inventario BIGINT NOT NULL,
    fecha_alerta DATE NOT NULL,
    stock_actual DECIMAL(14,3) NOT NULL,
    umbral_minimo DECIMAL(14,3) NOT NULL,
    estado TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id_alerta),
    KEY fk_alerta_inventario (id_inventario),
    CONSTRAINT fk_alerta_inventario FOREIGN KEY (id_inventario) REFERENCES inventario (id_inventario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   4. Relaciones y datos del núcleo APF2
   ============================================================ */

UPDATE usuario u
JOIN rol r ON r.nombre = u.rol
SET u.id_rol = r.id_rol
WHERE u.id_rol IS NULL;

UPDATE usuario SET id_rol = 5 WHERE id_rol IS NULL;
ALTER TABLE usuario
    ADD UNIQUE KEY uk_usuario_dni (dni),
    ADD KEY fk_usuario_rol (id_rol),
    ADD CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES rol (id_rol);

UPDATE movimiento_inventario mi
JOIN inventario i ON i.id_producto = mi.producto_id
SET mi.id_inventario = i.id_inventario
WHERE mi.id_inventario IS NULL;

ALTER TABLE movimiento_inventario
    ADD KEY fk_movimiento_inventario (id_inventario),
    ADD CONSTRAINT fk_movimiento_inventario FOREIGN KEY (id_inventario) REFERENCES inventario (id_inventario);

INSERT INTO orden_servicio (id_orden, cliente_nombre, cliente_ruc, direccion_servicio,
                            tipo_servicio, fecha_servicio, estado)
SELECT sm.id_solicitud,
       COALESCE(e.razon_social, 'CLIENTE SIN NOMBRE'),
       COALESCE(e.ruc, '00000000000'),
       p.direccion,
       'SUMINISTRO',
       COALESCE(DATE(sm.fecha_solicitud), CURDATE()),
       'ACTIVO'
FROM solicitud_material sm
LEFT JOIN entidad_publica e ON e.id = sm.entidad_id
LEFT JOIN punto_entrega p ON p.id = sm.punto_entrega_id;

UPDATE solicitud_material SET id_orden = id_solicitud, nro_ticket = codigo;
ALTER TABLE solicitud_material
    ADD KEY fk_solicitud_orden (id_orden),
    ADD CONSTRAINT fk_solicitud_orden FOREIGN KEY (id_orden) REFERENCES orden_servicio (id_orden);

UPDATE despacho d
LEFT JOIN usuario t ON t.id_usuario = d.transportista_id
LEFT JOIN vehiculo v ON v.id = d.vehiculo_id
LEFT JOIN punto_entrega p ON p.id = d.punto_entrega_id
SET d.transportista = CONCAT_WS(' ', t.nombres, t.apellidos),
    d.placa_vehiculo = v.placa,
    d.punto_destino = p.nombre,
    d.boleta_ruta = COALESCE(d.numero_hoja_ruta, d.numero_guia);

INSERT INTO salida_almacen (id_salida, id_solicitud, id_usuario, nro_guia_interna,
                            fecha_salida, tipo_entrega, estado)
SELECT d.id_despacho, d.solicitud_id, d.responsable_id, d.numero_salida,
       DATE(d.fecha_despacho), 'DESPACHO', 1
FROM despacho d
WHERE d.responsable_id IS NOT NULL;

INSERT INTO detalle_salida (id_salida, id_producto, cantidad_entregada)
SELECT dd.despacho_id, dd.producto_id, dd.cantidad_despachada
FROM detalle_despacho dd;

UPDATE despacho SET id_salida = id_despacho WHERE id_salida IS NULL;
ALTER TABLE despacho
    ADD KEY fk_despacho_salida (id_salida),
    ADD CONSTRAINT fk_despacho_salida FOREIGN KEY (id_salida) REFERENCES salida_almacen (id_salida);

INSERT INTO alerta_stock (id_inventario, fecha_alerta, stock_actual, umbral_minimo, estado)
SELECT i.id_inventario, CURDATE(), i.stock_actual, i.stock_minimo, 1
FROM inventario i
WHERE i.stock_actual < i.stock_minimo;

UPDATE solicitud_reposicion sr
SET sr.id_producto = (
        SELECT dr.producto_id FROM detalle_reposicion dr
        WHERE dr.reposicion_id = sr.id_reposicion ORDER BY dr.id LIMIT 1
    ),
    sr.cantidad_solicitada = (
        SELECT SUM(dr.cantidad) FROM detalle_reposicion dr
        WHERE dr.reposicion_id = sr.id_reposicion
    );

UPDATE solicitud_reposicion sr
JOIN inventario i ON i.id_producto = sr.id_producto
JOIN alerta_stock a ON a.id_inventario = i.id_inventario
SET sr.id_alerta = a.id_alerta
WHERE sr.id_alerta IS NULL;

ALTER TABLE solicitud_reposicion
    ADD KEY fk_reposicion_alerta (id_alerta),
    ADD KEY fk_reposicion_producto (id_producto),
    ADD CONSTRAINT fk_reposicion_alerta FOREIGN KEY (id_alerta) REFERENCES alerta_stock (id_alerta),
    ADD CONSTRAINT fk_reposicion_producto FOREIGN KEY (id_producto) REFERENCES producto (id_producto);

INSERT INTO ingreso_almacen (id_ingreso, id_usuario, id_proveedor, nro_guia_remision,
                             fecha_ingreso, observacion, estado)
SELECT mi.id_movimiento, mi.usuario_id, NULL, mi.referencia,
       DATE(mi.fecha_movimiento), mi.observaciones, 1
FROM movimiento_inventario mi
WHERE mi.tipo_movimiento = 'INGRESO' AND mi.usuario_id IS NOT NULL;

INSERT INTO detalle_ingreso (id_ingreso, id_producto, cantidad)
SELECT mi.id_movimiento, mi.producto_id, mi.cantidad
FROM movimiento_inventario mi
WHERE mi.tipo_movimiento = 'INGRESO' AND mi.usuario_id IS NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;
