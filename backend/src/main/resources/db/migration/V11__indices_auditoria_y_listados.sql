-- Índices para consultas de auditoría, notificaciones, trazabilidad y
-- listados ordenados por fecha. Complementan las claves foráneas existentes.
CREATE INDEX idx_auditoria_fecha ON auditoria (fecha);
CREATE INDEX idx_auditoria_usuario_fecha ON auditoria (usuario_email, fecha);
CREATE INDEX idx_auditoria_modulo_fecha ON auditoria (modulo, fecha);

CREATE INDEX idx_movimiento_fecha ON movimiento_inventario (fecha_movimiento);
CREATE INDEX idx_solicitud_estado_fecha ON solicitud_material (estado, fecha_solicitud);
CREATE INDEX idx_despacho_estado_fecha ON despacho (estado, fecha_despacho);
CREATE INDEX idx_notificacion_usuario_leida_fecha ON notificacion (usuario_id, leida, fecha);
CREATE INDEX idx_refresh_token_expira ON refresh_token (expira_en);
