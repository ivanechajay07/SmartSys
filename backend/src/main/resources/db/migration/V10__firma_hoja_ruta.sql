CREATE TABLE firma_hoja_ruta (
    id_firma BIGINT NOT NULL AUTO_INCREMENT,
    id_despacho BIGINT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    nombre VARCHAR(160) NULL,
    dni VARCHAR(20) NULL,
    cargo VARCHAR(120) NULL,
    fecha_firma DATETIME(6) NOT NULL,
    imagen LONGTEXT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id_firma),
    UNIQUE KEY uk_firma_despacho_tipo (id_despacho, tipo),
    CONSTRAINT fk_firma_despacho FOREIGN KEY (id_despacho) REFERENCES despacho (id_despacho)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
