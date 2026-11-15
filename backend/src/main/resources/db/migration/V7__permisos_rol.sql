-- Permisos por rol y módulo (ver, crear, editar, eliminar).
CREATE TABLE permiso_rol (
    id_permiso BIGINT NOT NULL AUTO_INCREMENT,
    id_rol INT NOT NULL,
    modulo VARCHAR(40) NOT NULL,
    puede_ver BOOLEAN NOT NULL DEFAULT FALSE,
    puede_crear BOOLEAN NOT NULL DEFAULT FALSE,
    puede_editar BOOLEAN NOT NULL DEFAULT FALSE,
    puede_eliminar BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id_permiso),
    UNIQUE KEY uk_permiso_rol (id_rol, modulo),
    CONSTRAINT fk_permiso_rol_rol FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
