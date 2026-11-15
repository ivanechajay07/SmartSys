-- Enriquecimiento de auditoría: usuario, acción legible, módulo y datos del dispositivo/sesión.
ALTER TABLE auditoria
    ADD COLUMN usuario_nombre VARCHAR(160) NULL AFTER rol,
    ADD COLUMN modulo VARCHAR(40) NULL AFTER accion,
    ADD COLUMN ip VARCHAR(45) NULL AFTER detalle,
    ADD COLUMN dispositivo VARCHAR(30) NULL AFTER ip,
    ADD COLUMN equipo VARCHAR(120) NULL AFTER dispositivo,
    ADD COLUMN navegador VARCHAR(80) NULL AFTER equipo,
    ADD COLUMN sistema_operativo VARCHAR(80) NULL AFTER navegador;
