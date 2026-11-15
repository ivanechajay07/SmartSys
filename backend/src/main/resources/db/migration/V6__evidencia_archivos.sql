-- Soporte de archivos adjuntos en evidencias (foto/PDF) sin depender del sistema de archivos.
ALTER TABLE evidencia
    ADD COLUMN contenido MEDIUMTEXT NULL,
    ADD COLUMN tipo_mime VARCHAR(80) NULL;
