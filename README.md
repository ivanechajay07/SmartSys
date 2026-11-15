# SmartSys

Sistema Integral de Gestión de Servicios Operativos y Control Logístico para **Higiene y Salud S.A.C.**

SmartSys cubre el ciclo logístico completo: solicitudes de material, reposiciones, programación contractual derivada del TDR, despachos con reservas de stock, entregas totales o parciales, recepción en punto de entrega, cumplimiento contractual, notificaciones, reportes y auditoría.

> **Estado:** release candidata para piloto controlado y aceptación funcional. **No debe declararse producción** hasta cerrar los pendientes P1 del informe(TLS, rate limiting, backups, validación Testcontainers y migración a Spring 7).

---

## 1. Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Backend | Java 21, Spring Boot 3.5.16, Spring Security 6, Spring Data JPA / Hibernate 6, Flyway, Springdoc OpenAPI |
| Seguridad | JWT HMAC, refresh tokens opacos rotativos con hash SHA-256, BCrypt (factor 12), bloqueo por intentos fallidos |
| Base de datos | MySQL 8.4 LTS, phpMyAdmin 5.2 |
| Frontend | React 18, TypeScript 5.9, Vite 8, Tailwind CSS 3, React Router 7, Axios, Zustand, React Hook Form, Zod, Recharts, Source Sans 3 (fuente local) |
| Tiempo real | STOMP sobre WebSocket (`/ws`, tópico `/topic/notifications`) |
| Pruebas | JUnit 5, Mockito, MockMvc, Spring Security Test, Testcontainers; Vitest 5, React Testing Library, Playwright |
| Despliegue | Docker Compose, Nginx, healthchecks, volumen persistente MySQL |

## 2. Alcance funcional

- Autenticación, autorización por roles y auditoría de operaciones de escritura.
- Administración de usuarios y roles: alta, edición, activación/desactivación, restablecimiento de contraseña, foto de perfil, presencia en tiempo real, protección del último administrador y **matriz de permisos por rol y módulo** (ver, crear, editar, eliminar).
- Auditoría enriquecida: usuario, actividad legible, módulo, dispositivo, equipo/modelo, navegador, sistema operativo e IP de la sesión.
- Datos maestros: entidades públicas, puntos de entrega, productos, inventario, contratos, TDR, items de TDR, flota, proveedores y roles.
- Inventario central con stock físico, reservado, disponible, mínimo, ingresos, ajustes y mermas.
- Trazabilidad: órdenes de servicio, ingresos y salidas de almacén con búsqueda, detalle de lotes y enlace al despacho de origen.
- Solicitudes de material con flujo borrador → revisión → aprobación/rechazo y reserva automática.
- Reposiciones internas con aprobación y rechazo.
- Programación de abastecimiento por frecuencia de TDR, con previsualización, confirmación, reprogramación, cancelación y **calendario mensual interactivo** con arrastre para reprogramar.
- Despachos: preparación, asignación de transporte, salida, llegada, entrega total/parcial, cancelación e incidencias.
- Recepción en punto de entrega con conformidad, cantidades rechazadas y evidencia.
- Hoja de ruta corporativa con firmas de despacho, transportista y recepción persistentes, datos fiscales de la empresa y exportación a PDF A4 con las firmas incluidas.
- Cumplimiento de TDR, puntualidad y cláusulas contractuales (solo alerta de revisión manual, sin penalidad automática).
- Base de datos MySQL alineada al modelo físico: 17 tablas núcleo (`rol`, `usuario`, `proveedor`, `producto`, `inventario`, `movimiento_inventario`, `ingreso_almacen`, `detalle_ingreso`, `orden_servicio`, `solicitud_material`, `detalle_solicitud`, `salida_almacen`, `detalle_salida`, `despacho`, `alerta_stock`, `solicitud_reposicion`, `reporte_inventario`) más extensiones funcionales del sistema.
- Notificaciones persistentes y en tiempo real; centro de actividad en la barra superior con notificaciones, alertas de stock y asignaciones.
- Reportes JSON/CSV/XLSX/PDF (12 reportes) con diseño corporativo: Excel con filtros, paneles congelados, hoja de resumen y totales; PDF paginado con cabecera y pie de página; CSV con metadatos y totales. Cada exportación se registra en `reporte_inventario` y se muestra en el historial de la página de reportes.
- Perfil de usuario completo: datos personales, avatar, seguridad, fortaleza de contraseña y preferencias de tema.
- Recuperación de contraseña desde el login y preload dinámico de acceso con pasos de carga.\n- Interfaz móvil para transportista con asignaciones filtradas, GPS del navegador en los hitos, registro de entrega, incidencias y evidencia fotográfica/PDF adjunta.
- Modales renovados con animaciones, foco accesible y alertas flotantes para altas, actualizaciones, cancelaciones y exportaciones.\n- Heroes con variante clara y oscura sincronizada con el tema en panel y todos los módulos.
- Paginación tipo pills en las tablas de todos los módulos operativos y administrativos.

## 3. Inicio rápido con Docker

Requisitos: Docker Engine 24+ con Docker Compose v2. No requiere Java ni Node instalados.

```bash
# 1. Configurar variables de entorno
cp .env.example .env
# Edite .env y defina MYSQL_ROOT_PASSWORD, MYSQL_PASSWORD, JWT_SECRET y SEED_PASSWORD

# 2. Construir y levantar
docker compose up -d --build

# 3. Verificar estado
docker compose ps
```

| Servicio | URL por defecto |
| --- | --- |
| Frontend | <http://localhost:8082> |
| API / Swagger | <http://localhost:8080/swagger-ui.html> |
| Health | <http://localhost:8080/actuator/health> |
| phpMyAdmin | <http://localhost:8081> (según `PHPMYADMIN_PORT`) |
| MySQL | `localhost:3306` |

Los puertos son configurables en `.env` (`FRONTEND_PORT`, `API_PORT`, `PHPMYADMIN_PORT`, `MYSQL_PORT`).

### Usuarios de demostración

Solo existen si `SEED_DEMO=true`. Contraseña inicial: valor de `SEED_PASSWORD` (por defecto `Admin123!`, **debe cambiarse**).

| Correo | Rol |
| --- | --- |
| `admin@smartsys.local` | Administrador |
| `logistica@smartsys.local` | Jefe de logística |
| `almacen@smartsys.local` | Encargado de almacén |
| `transporte@smartsys.local` | Transportista |
| `operativo@smartsys.local` | Personal operativo |
| `gerente@smartsys.local` | Gerente general |


## 4. Desarrollo local

### Backend

Requisitos: JDK 21, Maven 3.9+, MySQL 8.

```bash
cd backend
mvn spring-boot:run
```

Variables mínimas: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `FLYWAY_ENABLED=true`, `DDL_AUTO=validate`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite publica en `http://localhost:5173` y redirige `/api` y `/ws` a `VITE_PROXY_TARGET` (por defecto `http://localhost:8080`).

## 5. Pruebas

```bash
# Backend (H2 + MockMvc + Mockito)
cd backend && mvn test

# Frontend unitarias (Vitest + React Testing Library)
cd frontend && npm test

# E2E (Playwright; requiere backend y frontend activos)
cd frontend && npm run e2e

# E2E contra la pila Docker
E2E_BASE_URL=http://localhost:8082 npm run e2e
```

Resultados de la última ejecución: **46 pruebas backend (45 OK, 1 omitida)**, **17 pruebas frontend**, **20 pruebas E2E**, **0 vulnerabilidades npm**. Ver [Calidad y pendientes](docs/CALIDAD_Y_PENDIENTES.md).

## 6. Estructura del repositorio

```text
SmartSys/
├── backend/                 API Spring Boot en capas (controller/service/dao/model), Flyway y pruebas
├── frontend/                SPA React + TypeScript, pruebas y E2E
├── docker-compose.yml       MySQL + phpMyAdmin + backend + frontend
├── .env.example             Plantilla de configuración
└── README.md
```


## 7. Seguridad en una página

- API stateless con Bearer JWT; refresh tokens opacos rotativos almacenados como hash SHA-256.
- Contraseñas con BCrypt factor 12; bloqueo temporal tras 5 intentos fallidos.
- Autorización declarativa por rol con `@PreAuthorize` y rutas protegidas en el frontend.
- CORS restringido por lista explícita; CSRF deshabilitado solo porque no se usan cookies de sesión.
- Consultas parametrizadas vía JPA; sin SQL concatenado.
- Frontend React escapa contenido por defecto; no se usa `dangerouslySetInnerHTML`.
- Nginx agrega CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy` y `Permissions-Policy`.
- Dependencias: `npm audit` y la imagen frontend en 0 vulnerabilidades; el backend conserva 2 CVE críticas de Spring WebMVC en funcionalidades no utilizadas (XSLT/SSE), documentadas como bloqueador P1.


## 8. Limitaciones conocidas

- Testcontainers no puede conectarse al Docker Desktop de este entorno; la prueba MySQL real se omite automáticamente (`disabledWithoutDocker`). El esquema se validó manualmente contra MySQL 8 con Flyway + `ddl-auto=validate`.
- La administración de usuarios se realiza desde la interfaz **Usuarios y roles** según los permisos asignados al rol.
- Las evidencias se registran como URL; no hay almacenamiento ni carga binaria de archivos.
- No se incluye terminación TLS; debe desplegarse detrás de un proxy HTTPS.
- No hay rate limiting de aplicación ni MFA.
- Spring WebMVC 6.2.19 conserva 2 CVE críticas en XSLT/SSE (no usados); la corrección requiere Spring Boot 4.
- La imagen de phpMyAdmin contiene bibliotecas vulnerables; no debe desplegarse en producción y solo se publica en `127.0.0.1`.
- El repositorio no está inicializado en Git.

## 9. Contacto

Higiene y Salud S.A.C. — Equipo de Logística y Sistemas.
