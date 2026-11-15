-- Backfill legible de auditoría histórica (acciones y módulos).
UPDATE auditoria a
JOIN usuario u ON u.correo = a.usuario_email
SET a.usuario_nombre = CONCAT(u.nombres, ' ', u.apellidos)
WHERE a.usuario_nombre IS NULL AND a.usuario_email IS NOT NULL;

UPDATE auditoria
SET modulo = CASE
    WHEN recurso LIKE '%/auth/%' THEN 'SESIÓN'
    WHEN recurso LIKE '%/requests%' THEN 'SOLICITUDES'
    WHEN recurso LIKE '%/replenishments%' THEN 'REPOSICIONES'
    WHEN recurso LIKE '%/schedules%' THEN 'PROGRAMACIÓN'
    WHEN recurso LIKE '%/dispatches%' OR recurso LIKE '%/mobile%' THEN 'DESPACHOS'
    WHEN recurso LIKE '%/receptions%' THEN 'RECEPCIONES'
    WHEN recurso LIKE '%/inventory%' THEN 'INVENTARIO'
    WHEN recurso LIKE '%/users%' OR recurso LIKE '%/roles%' THEN 'USUARIOS'
    WHEN recurso LIKE '%/notifications%' THEN 'NOTIFICACIONES'
    WHEN recurso LIKE '%/products%' OR recurso LIKE '%/entities%'
         OR recurso LIKE '%/contracts%' OR recurso LIKE '%/tdrs%'
         OR recurso LIKE '%/providers%' OR recurso LIKE '%/vehicles%' THEN 'DATOS MAESTROS'
    ELSE 'SISTEMA'
END
WHERE modulo IS NULL;

UPDATE auditoria
SET accion = CASE
    WHEN recurso LIKE '%/auth/login' AND exito = 1 THEN 'Inició sesión'
    WHEN recurso LIKE '%/auth/login' AND exito = 0 THEN 'Intentó iniciar sesión'
    WHEN recurso LIKE '%/auth/logout' THEN 'Cerró sesión'
    WHEN recurso LIKE '%/auth/refresh' THEN 'Renovó sesión'
    WHEN recurso LIKE '%/auth/forgot-password' THEN 'Solicitó recuperación de contraseña'
    WHEN recurso LIKE '%/auth/change-password' THEN 'Cambió su contraseña'
    WHEN recurso LIKE '%/auth/profile' THEN 'Actualizó su perfil'
    WHEN recurso LIKE '%/auth/avatar' THEN 'Actualizó su foto de perfil'
    WHEN recurso LIKE '%/roles/%/permissions' THEN 'Actualizó permisos del rol'
    WHEN recurso LIKE '%/users%' AND metodo = 'POST' THEN 'Registró usuario'
    WHEN recurso LIKE '%/users%' AND metodo = 'PUT' THEN 'Editó usuario'
    WHEN recurso LIKE '%/users%/%/status' THEN 'Cambió estado de usuario'
    WHEN recurso LIKE '%/users%/%/reset-password' THEN 'Restableció contraseña'
    WHEN recurso LIKE '%/users%/%/avatar' THEN 'Actualizó foto de usuario'
    WHEN recurso LIKE '%/dispatches/%/prepare' THEN 'Preparó despacho'
    WHEN recurso LIKE '%/dispatches/%/assign' THEN 'Asignó transporte'
    WHEN recurso LIKE '%/dispatches/%/transport-receipt' THEN 'Confirmó carga'
    WHEN recurso LIKE '%/dispatches/%/depart' THEN 'Inició ruta'
    WHEN recurso LIKE '%/dispatches/%/arrive' THEN 'Registró llegada'
    WHEN recurso LIKE '%/dispatches/%/deliver' THEN 'Registró entrega'
    WHEN recurso LIKE '%/dispatches/%/cancel' THEN 'Canceló despacho'
    WHEN recurso LIKE '%/dispatches%/%evidence%' THEN 'Adjuntó evidencia'
    WHEN recurso LIKE '%/dispatches%/%incidents%' THEN 'Registró incidencia'
    WHEN recurso LIKE '%/dispatches%' AND metodo = 'POST' THEN 'Registró despacho'
    WHEN recurso LIKE '%/receptions%' THEN 'Registró recepción'
    WHEN recurso LIKE '%/inventory/entries' THEN 'Registró ingreso'
    WHEN recurso LIKE '%/inventory/adjustments' THEN 'Registró ajuste'
    WHEN recurso LIKE '%/requests/%/approve' THEN 'Aprobó solicitud'
    WHEN recurso LIKE '%/requests/%/reject' THEN 'Rechazó solicitud'
    WHEN recurso LIKE '%/requests/%/submit' THEN 'Envió solicitud'
    WHEN recurso LIKE '%/requests%' THEN 'Registró solicitud'
    WHEN recurso LIKE '%/replenishments/%/approve' THEN 'Aprobó reposición'
    WHEN recurso LIKE '%/replenishments/%/reject' THEN 'Rechazó reposición'
    WHEN recurso LIKE '%/replenishments%/%submit' THEN 'Envió reposición'
    WHEN recurso LIKE '%/replenishments%' THEN 'Registró reposición'
    WHEN recurso LIKE '%/schedules/%/confirm' THEN 'Confirmó programación'
    WHEN recurso LIKE '%/schedules/%/reschedule' THEN 'Reprogramó entrega'
    WHEN recurso LIKE '%/schedules/%/cancel' THEN 'Canceló programación'
    WHEN recurso LIKE '%/schedules%' THEN 'Registró programación'
    WHEN recurso LIKE '%/products%' THEN 'Registró producto'
    WHEN recurso LIKE '%/entities%/%points%' THEN 'Registró punto de entrega'
    WHEN recurso LIKE '%/entities%' THEN 'Registró entidad'
    WHEN recurso LIKE '%/contracts%/%tdrs%' THEN 'Registró TDR'
    WHEN recurso LIKE '%/contracts%/%clauses%' THEN 'Registró cláusula'
    WHEN recurso LIKE '%/contracts%' THEN 'Registró contrato'
    WHEN recurso LIKE '%/tdrs%/%items%' THEN 'Registró item de TDR'
    WHEN recurso LIKE '%/providers%' THEN 'Registró proveedor'
    WHEN recurso LIKE '%/vehicles%' THEN 'Registró vehículo'
    ELSE accion
END
WHERE accion LIKE 'Controlador%' OR accion LIKE '%Controller%';
