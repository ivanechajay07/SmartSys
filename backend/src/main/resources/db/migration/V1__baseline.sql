-- SmartSys baseline schema
-- Generado para MySQL 8.0. Contiene las 27 tablas del modelo.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;

/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `auditoria`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `accion` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detalle` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `exito` bit(1) NOT NULL,
  `fecha` datetime(6) NOT NULL,
  `metodo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recurso` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario_email` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `clausula_contractual`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clausula_contractual` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `accion_sugerida` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activa` bit(1) NOT NULL,
  `codigo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `umbral_porcentaje` decimal(5,2) DEFAULT NULL,
  `contrato_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKccojy7swgg42n6ldlivjs7ojl` (`contrato_id`),
  CONSTRAINT `FKccojy7swgg42n6ldlivjs7ojl` FOREIGN KEY (`contrato_id`) REFERENCES `contrato` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `contrato`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contrato` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `archivo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `numero` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `objeto` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `responsable_interno` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entidad_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contrato_codigo` (`codigo`),
  KEY `FK8qop035w5pr4aney7x50qcij8` (`entidad_id`),
  CONSTRAINT `FK8qop035w5pr4aney7x50qcij8` FOREIGN KEY (`entidad_id`) REFERENCES `entidad_publica` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `despacho`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `despacho` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `codigo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('BORRADOR','CANCELADO','ENTREGADO','ENTREGADO_PARCIAL','EN_PREPARACION','EN_RUTA','PREPARADO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` date NOT NULL,
  `fecha_hora_asignacion` datetime(6) DEFAULT NULL,
  `fecha_hora_llegada` datetime(6) DEFAULT NULL,
  `fecha_hora_salida` datetime(6) DEFAULT NULL,
  `numero_guia` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_hoja_ruta` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_salida` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `acompanante_id` bigint DEFAULT NULL,
  `contrato_id` bigint NOT NULL,
  `entidad_id` bigint NOT NULL,
  `programacion_id` bigint NOT NULL,
  `punto_entrega_id` bigint NOT NULL,
  `responsable_id` bigint NOT NULL,
  `solicitud_id` bigint DEFAULT NULL,
  `tdr_id` bigint NOT NULL,
  `transportista_id` bigint DEFAULT NULL,
  `vehiculo_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_despacho_codigo` (`codigo`),
  KEY `FKoeqrdcpu3w49628og1jucpihl` (`acompanante_id`),
  KEY `FKbx3i3bob6x2n0kipel5o5jln5` (`contrato_id`),
  KEY `FK8noj88tanimwh6v0xws0uell8` (`entidad_id`),
  KEY `FKd01703m03ylc0ugs8p956lkab` (`programacion_id`),
  KEY `FK8h2kxg92h860m1xs4n1p8fgmk` (`punto_entrega_id`),
  KEY `FK8w9qlhakruokmiip7jgmtqhmv` (`responsable_id`),
  KEY `FKf07vmvn2rw8dcolovkc9gk6fo` (`solicitud_id`),
  KEY `FK107278y37a63410byrclxrhry` (`tdr_id`),
  KEY `FKrflms120f376789uqxtn776wy` (`transportista_id`),
  KEY `FK772e1e07lhxxkost4u9pmnedo` (`vehiculo_id`),
  CONSTRAINT `FK107278y37a63410byrclxrhry` FOREIGN KEY (`tdr_id`) REFERENCES `tdr` (`id`),
  CONSTRAINT `FK772e1e07lhxxkost4u9pmnedo` FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculo` (`id`),
  CONSTRAINT `FK8h2kxg92h860m1xs4n1p8fgmk` FOREIGN KEY (`punto_entrega_id`) REFERENCES `punto_entrega` (`id`),
  CONSTRAINT `FK8noj88tanimwh6v0xws0uell8` FOREIGN KEY (`entidad_id`) REFERENCES `entidad_publica` (`id`),
  CONSTRAINT `FK8w9qlhakruokmiip7jgmtqhmv` FOREIGN KEY (`responsable_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `FKbx3i3bob6x2n0kipel5o5jln5` FOREIGN KEY (`contrato_id`) REFERENCES `contrato` (`id`),
  CONSTRAINT `FKd01703m03ylc0ugs8p956lkab` FOREIGN KEY (`programacion_id`) REFERENCES `programacion_abastecimiento` (`id`),
  CONSTRAINT `FKf07vmvn2rw8dcolovkc9gk6fo` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitud_material` (`id`),
  CONSTRAINT `FKoeqrdcpu3w49628og1jucpihl` FOREIGN KEY (`acompanante_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `FKrflms120f376789uqxtn776wy` FOREIGN KEY (`transportista_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `detalle_despacho`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_despacho` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `cantidad_comprometida` decimal(14,3) NOT NULL,
  `cantidad_despachada` decimal(14,3) NOT NULL,
  `cantidad_preparada` decimal(14,3) NOT NULL,
  `reserva_id` bigint DEFAULT NULL,
  `solicitud_detalle_id` bigint DEFAULT NULL,
  `despacho_id` bigint NOT NULL,
  `producto_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK8ia3hhommpfl3ejp09hmdb76f` (`despacho_id`),
  KEY `FK2ch1foicuvqj652y8mj3xl1cn` (`producto_id`),
  CONSTRAINT `FK2ch1foicuvqj652y8mj3xl1cn` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`),
  CONSTRAINT `FK8ia3hhommpfl3ejp09hmdb76f` FOREIGN KEY (`despacho_id`) REFERENCES `despacho` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `detalle_recepcion`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_recepcion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `cantidad_rechazada` decimal(14,3) NOT NULL,
  `cantidad_recibida` decimal(14,3) NOT NULL,
  `observaciones` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `producto_id` bigint NOT NULL,
  `recepcion_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKpbo2fytgxanjojfb1a1afjylj` (`producto_id`),
  KEY `FKctepq828mi09b0bbufxb7nmai` (`recepcion_id`),
  CONSTRAINT `FKctepq828mi09b0bbufxb7nmai` FOREIGN KEY (`recepcion_id`) REFERENCES `recepcion` (`id`),
  CONSTRAINT `FKpbo2fytgxanjojfb1a1afjylj` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `detalle_reposicion`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_reposicion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `cantidad` decimal(14,3) NOT NULL,
  `observacion` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `producto_id` bigint NOT NULL,
  `reposicion_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK71a98bncw8jdgaqsndgbt9os9` (`producto_id`),
  KEY `FKitwbjoajafoyvgnobe7fbe1yl` (`reposicion_id`),
  CONSTRAINT `FK71a98bncw8jdgaqsndgbt9os9` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`),
  CONSTRAINT `FKitwbjoajafoyvgnobe7fbe1yl` FOREIGN KEY (`reposicion_id`) REFERENCES `solicitud_reposicion` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `detalle_solicitud`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_solicitud` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `cantidad_aprobada` decimal(14,3) NOT NULL,
  `cantidad_despachada` decimal(14,3) NOT NULL,
  `cantidad_solicitada` decimal(14,3) NOT NULL,
  `reserva_id` bigint DEFAULT NULL,
  `producto_id` bigint NOT NULL,
  `solicitud_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKmupsvp3vag4kwxltv4i2renih` (`producto_id`),
  KEY `FK8dve8yjcqf1iiil9u4g0mdg5x` (`solicitud_id`),
  CONSTRAINT `FK8dve8yjcqf1iiil9u4g0mdg5x` FOREIGN KEY (`solicitud_id`) REFERENCES `solicitud_material` (`id`),
  CONSTRAINT `FKmupsvp3vag4kwxltv4i2renih` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `entidad_publica`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entidad_publica` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `activo` bit(1) NOT NULL,
  `correo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `departamento` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `distrito` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provincia` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `razon_social` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `responsable` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ruc` varchar(11) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_entidad_ruc` (`ruc`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `evento_seguimiento`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evento_seguimiento` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `evidencia_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_hora` datetime(6) NOT NULL,
  `latitud` decimal(10,6) DEFAULT NULL,
  `longitud` decimal(10,6) DEFAULT NULL,
  `observaciones` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `despacho_id` bigint NOT NULL,
  `usuario_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKl44mcw00nphtegqb5njawesy9` (`despacho_id`),
  KEY `FK4vu1p5lm8883wvo310yx9ikiw` (`usuario_id`),
  CONSTRAINT `FK4vu1p5lm8883wvo310yx9ikiw` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `FKl44mcw00nphtegqb5njawesy9` FOREIGN KEY (`despacho_id`) REFERENCES `despacho` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `evidencia`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evidencia` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `fecha` datetime(6) NOT NULL,
  `nombre_archivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observaciones` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recepcion_id` bigint DEFAULT NULL,
  `tipo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `despacho_id` bigint NOT NULL,
  `usuario_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK7qg2q2fmn8nc5dlgwl9n4uqoa` (`despacho_id`),
  KEY `FKgkvxtme1r0har23ub8v560h0x` (`usuario_id`),
  CONSTRAINT `FK7qg2q2fmn8nc5dlgwl9n4uqoa` FOREIGN KEY (`despacho_id`) REFERENCES `despacho` (`id`),
  CONSTRAINT `FKgkvxtme1r0har23ub8v560h0x` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `incidencia_despacho`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidencia_despacho` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `descripcion` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime(6) NOT NULL,
  `tipo` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `despacho_id` bigint NOT NULL,
  `usuario_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKb2e4847m0yia8g1qqnk1jnren` (`despacho_id`),
  KEY `FKd00d0tdsa1nv3fcsiv7o7y894` (`usuario_id`),
  CONSTRAINT `FKb2e4847m0yia8g1qqnk1jnren` FOREIGN KEY (`despacho_id`) REFERENCES `despacho` (`id`),
  CONSTRAINT `FKd00d0tdsa1nv3fcsiv7o7y894` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `inventario`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `stock_fisico` decimal(14,3) NOT NULL,
  `stock_minimo` decimal(14,3) NOT NULL,
  `stock_reservado` decimal(14,3) NOT NULL,
  `version` bigint NOT NULL,
  `producto_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inventario_producto` (`producto_id`),
  CONSTRAINT `FK2jpmjsxwl42blfea24vda6fs6` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `movimiento_inventario`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimiento_inventario` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `cantidad` decimal(14,3) NOT NULL,
  `fecha` datetime(6) NOT NULL,
  `observaciones` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `saldo_resultante` decimal(14,3) NOT NULL,
  `tipo` enum('AJUSTE_NEGATIVO','AJUSTE_POSITIVO','DEVOLUCION','INGRESO','MERMA','SALIDA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `producto_id` bigint NOT NULL,
  `usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKd6bavqmj4o0mvn82ve46jac9v` (`producto_id`),
  KEY `FKt6p6ejpbblav1phv0lgjpeg4r` (`usuario_id`),
  CONSTRAINT `FKd6bavqmj4o0mvn82ve46jac9v` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`),
  CONSTRAINT `FKt6p6ejpbblav1phv0lgjpeg4r` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `notificacion`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificacion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `fecha` datetime(6) NOT NULL,
  `leida` bit(1) NOT NULL,
  `mensaje` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol_destino` enum('ADMINISTRADOR','ENCARGADO_ALMACEN','GERENTE_GENERAL','JEFE_LOGISTICA','PERSONAL_LOGISTICA','PERSONAL_OPERATIVO','RESPONSABLE_DISTRIBUCION','TRANSPORTISTA') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK5hnclv9lmmc1w4335x04warbm` (`usuario_id`),
  CONSTRAINT `FK5hnclv9lmmc1w4335x04warbm` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `producto`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `producto` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `activo` bit(1) NOT NULL,
  `categoria` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `codigo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marca` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requiere_lote` bit(1) NOT NULL,
  `requiere_vencimiento` bit(1) NOT NULL,
  `unidad_medida` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_producto_codigo` (`codigo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `programacion_abastecimiento`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `programacion_abastecimiento` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `cantidad_comprometida` decimal(14,3) NOT NULL,
  `cantidad_entregada` decimal(14,3) NOT NULL,
  `cantidad_programada` decimal(14,3) NOT NULL,
  `estado` enum('CANCELADA','CUMPLIDA','EN_EJECUCION','PARCIAL','PROGRAMADA','REPROGRAMADA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_limite` date DEFAULT NULL,
  `fecha_programada` date NOT NULL,
  `motivo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `saldo_pendiente` decimal(14,3) NOT NULL,
  `version` bigint NOT NULL,
  `contrato_id` bigint NOT NULL,
  `entidad_id` bigint NOT NULL,
  `producto_id` bigint NOT NULL,
  `punto_entrega_id` bigint NOT NULL,
  `tdr_item_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKo2smfkbho1crgvy85bbt3pdxa` (`contrato_id`),
  KEY `FK41rbyu9lgsoko7b0vcnsl2gmq` (`entidad_id`),
  KEY `FKl1255jaegdhv03er8od4hlm87` (`producto_id`),
  KEY `FK16jx77wnxviv8u8kgd4b4mglf` (`punto_entrega_id`),
  KEY `FK6qy1l5sq6ve0fxbt9nrfrawrl` (`tdr_item_id`),
  CONSTRAINT `FK16jx77wnxviv8u8kgd4b4mglf` FOREIGN KEY (`punto_entrega_id`) REFERENCES `punto_entrega` (`id`),
  CONSTRAINT `FK41rbyu9lgsoko7b0vcnsl2gmq` FOREIGN KEY (`entidad_id`) REFERENCES `entidad_publica` (`id`),
  CONSTRAINT `FK6qy1l5sq6ve0fxbt9nrfrawrl` FOREIGN KEY (`tdr_item_id`) REFERENCES `tdr_item` (`id`),
  CONSTRAINT `FKl1255jaegdhv03er8od4hlm87` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`),
  CONSTRAINT `FKo2smfkbho1crgvy85bbt3pdxa` FOREIGN KEY (`contrato_id`) REFERENCES `contrato` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `punto_entrega`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `punto_entrega` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `activo` bit(1) NOT NULL,
  `direccion` varchar(250) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `distrito` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `responsable` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entidad_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKphyknvdn3jr4v2k8h4m8r6fea` (`entidad_id`),
  CONSTRAINT `FKphyknvdn3jr4v2k8h4m8r6fea` FOREIGN KEY (`entidad_id`) REFERENCES `entidad_publica` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `recepcion`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recepcion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `conforme` bit(1) NOT NULL,
  `documento_identidad` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_hora` datetime(6) NOT NULL,
  `observaciones` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recibido_por` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `despacho_id` bigint NOT NULL,
  `usuario_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK2bi70k4b9j017dixkvaxodln7` (`despacho_id`),
  KEY `FKne072nocm6i4utw7c4pw5g8w9` (`usuario_id`),
  CONSTRAINT `FK2bi70k4b9j017dixkvaxodln7` FOREIGN KEY (`despacho_id`) REFERENCES `despacho` (`id`),
  CONSTRAINT `FKne072nocm6i4utw7c4pw5g8w9` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `refresh_token`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_token` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `expira_en` datetime(6) NOT NULL,
  `reemplazado_por` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `revocado` bit(1) NOT NULL,
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refresh_token_hash` (`token_hash`),
  KEY `FKpr5fysa08n2o6i1rxjumfl89q` (`usuario_id`),
  CONSTRAINT `FKpr5fysa08n2o6i1rxjumfl89q` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `reserva_stock`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reserva_stock` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `cantidad` decimal(14,3) NOT NULL,
  `estado` enum('ACTIVA','CONSUMIDA','LIBERADA','VENCIDA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_expiracion` datetime(6) DEFAULT NULL,
  `origen_id` bigint DEFAULT NULL,
  `origen_tipo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `inventario_id` bigint NOT NULL,
  `producto_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK8vbbk5ridt2jimlpb7t8fd0p` (`inventario_id`),
  KEY `FKb3b4d5uo1qfm6wdsnxdr8oa04` (`producto_id`),
  CONSTRAINT `FK8vbbk5ridt2jimlpb7t8fd0p` FOREIGN KEY (`inventario_id`) REFERENCES `inventario` (`id`),
  CONSTRAINT `FKb3b4d5uo1qfm6wdsnxdr8oa04` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `solicitud_material`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitud_material` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `codigo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('APROBADA','DESPACHADA','EN_REVISION','PARCIALMENTE_ATENDIDA','PENDIENTE','PENDIENTE_DESPACHO','RECHAZADA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_aprobacion` datetime(6) DEFAULT NULL,
  `fecha_solicitud` datetime(6) NOT NULL,
  `justificacion` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `motivo_rechazo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aprobado_por` bigint DEFAULT NULL,
  `entidad_id` bigint NOT NULL,
  `punto_entrega_id` bigint NOT NULL,
  `solicitante_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_solicitud_codigo` (`codigo`),
  KEY `FK1nvmkq5947a9j8e3jh34cw1rn` (`aprobado_por`),
  KEY `FKchpd2h93sp92ro1d8v8n1xckd` (`entidad_id`),
  KEY `FK3o3eb38eudsdyxxq7ikwvn2me` (`punto_entrega_id`),
  KEY `FK4rumh92whi74iry1gl4vemfdt` (`solicitante_id`),
  CONSTRAINT `FK1nvmkq5947a9j8e3jh34cw1rn` FOREIGN KEY (`aprobado_por`) REFERENCES `usuario` (`id`),
  CONSTRAINT `FK3o3eb38eudsdyxxq7ikwvn2me` FOREIGN KEY (`punto_entrega_id`) REFERENCES `punto_entrega` (`id`),
  CONSTRAINT `FK4rumh92whi74iry1gl4vemfdt` FOREIGN KEY (`solicitante_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `FKchpd2h93sp92ro1d8v8n1xckd` FOREIGN KEY (`entidad_id`) REFERENCES `entidad_publica` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `solicitud_reposicion`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitud_reposicion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `codigo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('ANULADA','APROBADA','BORRADOR','EN_COMPRA','PENDIENTE_APROBACION','RECHAZADA','RECIBIDA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_resolucion` datetime(6) DEFAULT NULL,
  `fecha_solicitud` datetime(6) NOT NULL,
  `justificacion` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `monto_estimado` decimal(14,2) DEFAULT NULL,
  `motivo_rechazo` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `proveedor_sugerido` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia_presupuesto` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aprobador_id` bigint DEFAULT NULL,
  `solicitante_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reposicion_codigo` (`codigo`),
  KEY `FKd26n8x746kx4x2cefo38hsoki` (`aprobador_id`),
  KEY `FKdom8rrehqtplrsflciplto88a` (`solicitante_id`),
  CONSTRAINT `FKd26n8x746kx4x2cefo38hsoki` FOREIGN KEY (`aprobador_id`) REFERENCES `usuario` (`id`),
  CONSTRAINT `FKdom8rrehqtplrsflciplto88a` FOREIGN KEY (`solicitante_id`) REFERENCES `usuario` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `tdr`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tdr` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `archivo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_vigencia` date DEFAULT NULL,
  `version` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrato_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKd5x2dexk63fem8f57xlyw9rsl` (`contrato_id`),
  CONSTRAINT `FKd5x2dexk63fem8f57xlyw9rsl` FOREIGN KEY (`contrato_id`) REFERENCES `contrato` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `tdr_item`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tdr_item` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `cantidad_por_entrega` decimal(14,3) NOT NULL,
  `cantidad_total` decimal(14,3) NOT NULL,
  `dias_personalizado` int DEFAULT NULL,
  `fecha_limite` date DEFAULT NULL,
  `fecha_programada` date DEFAULT NULL,
  `frecuencia` enum('ANUAL','BIMESTRAL','MENSUAL','PERSONALIZADA','QUINCENAL','SEMANAL','SEMESTRAL','TRIMESTRAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `observaciones` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unidad` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `producto_id` bigint NOT NULL,
  `tdr_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK5hjr0dip67wew74jvx8nbvybk` (`producto_id`),
  KEY `FKpy2w7x8l7hwbmn7p44dpgfkqw` (`tdr_id`),
  CONSTRAINT `FK5hjr0dip67wew74jvx8nbvybk` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id`),
  CONSTRAINT `FKpy2w7x8l7hwbmn7p44dpgfkqw` FOREIGN KEY (`tdr_id`) REFERENCES `tdr` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `usuario`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `activo` bit(1) NOT NULL,
  `apellidos` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bloqueado_hasta` datetime(6) DEFAULT NULL,
  `email` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `intentos_fallidos` int NOT NULL,
  `nombres` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` enum('ADMINISTRADOR','ENCARGADO_ALMACEN','GERENTE_GENERAL','JEFE_LOGISTICA','PERSONAL_LOGISTICA','PERSONAL_OPERATIVO','RESPONSABLE_DISTRIBUCION','TRANSPORTISTA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ultimo_acceso` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usuario_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `vehiculo`;

/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehiculo` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `estado` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `marca` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `placa` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_vehiculo_placa` (`placa`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;


/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


SET FOREIGN_KEY_CHECKS = 1;
