package com.higienesalud.smartsys.security;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.exception.*;

import com.higienesalud.smartsys.model.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Configuration
public class SembradorDatos {

    @Bean
    CommandLineRunner seedUsers(UsuarioDao Dao, PasswordEncoder encoder,
                                @Value("${app.seed.password:Admin123!}") String defaultPassword,
                                @Value("${app.seed.demo:false}") boolean seedDemo,
                                EntidadPublicaDao entidadDao,
                                PuntoEntregaDao puntoDao,
                                ContratoDao contratoDao,
                                TdrDao tdrDao,
                                TdrItemDao tdrItemDao,
                                ProductoDao productoDao,
                                InventarioDao inventarioDao,
                                VehiculoDao vehiculoDao,
                                ProveedorDao proveedorDao) {
        return args -> {
            if (Dao.count() == 0) {
                String hash = encoder.encode(defaultPassword);
                Dao.saveAll(List.of(
                        Usuario.builder().nombres("Administrador").apellidos("Sistema")
                                .email("admin@smartsys.local").idRol(1).passwordHash(hash)
                                .rol(Rol.ADMINISTRADOR).build(),
                        Usuario.builder().nombres("Jefe").apellidos("Logística")
                                .email("logistica@smartsys.local").idRol(3).passwordHash(hash)
                                .rol(Rol.JEFE_LOGISTICA).build(),
                        Usuario.builder().nombres("Encargado").apellidos("Almacén")
                                .email("almacen@smartsys.local").idRol(4).passwordHash(hash)
                                .rol(Rol.ENCARGADO_ALMACEN).build(),
                        Usuario.builder().nombres("Transportista").apellidos("Uno")
                                .email("transporte@smartsys.local").idRol(8).passwordHash(hash)
                                .rol(Rol.TRANSPORTISTA).build(),
                        Usuario.builder().nombres("Supervisor").apellidos("Operativo")
                                .email("operativo@smartsys.local").idRol(5).passwordHash(hash)
                                .rol(Rol.PERSONAL_OPERATIVO).build(),
                        Usuario.builder().nombres("Gerente").apellidos("General")
                                .email("gerente@smartsys.local").idRol(2).passwordHash(hash)
                                .rol(Rol.GERENTE_GENERAL).build()
                ));
            }

            if (seedDemo && proveedorDao.count() == 0) {
                proveedorDao.saveAll(List.of(
                        Proveedor.builder().ruc("20512345678").razonSocial("Distribuidora Higiene Total S.A.C.")
                                .direccion("Av. Los Almacenes 450").telefono("(01) 555-1200")
                                .correo("ventas@higienetotal.pe").build(),
                        Proveedor.builder().ruc("20487654321").razonSocial("Insumos Médicos del Perú S.A.")
                                .direccion("Jr. Comercio 1280").telefono("(01) 555-3400")
                                .correo("contacto@insumosmedicos.pe").build()
                ));
            }

            if (!seedDemo || entidadDao.count() > 0) {
                return;
            }

            EntidadPublica essalud = entidadDao.save(EntidadPublica.builder()
                    .ruc("20131257750").razonSocial("ESSALUD")
                    .direccion("Av. Arenales 1403").departamento("Lima").provincia("Lima")
                    .distrito("Lince").telefono("(01) 265-6000").responsable("Oficina de Abastecimiento")
                    .build());
            EntidadPublica minsa = entidadDao.save(EntidadPublica.builder()
                    .ruc("20131373237").razonSocial("MINISTERIO DE SALUD")
                    .direccion("Av. Salaverry 801").departamento("Lima").provincia("Lima")
                    .distrito("Jesus Maria").telefono("(01) 315-6600").responsable("Oficina General de Administración")
                    .build());

            PuntoEntrega hospital = puntoDao.save(PuntoEntrega.builder()
                    .entidad(essalud).nombre("Hospital Rebagliati")
                    .direccion("Av. Edgardo Rebagliati 490").distrito("Jesus Maria")
                    .responsable("Jefe de Farmacia").telefono("(01) 265-4900").build());
            PuntoEntrega centro = puntoDao.save(PuntoEntrega.builder()
                    .entidad(minsa).nombre("Centro de Salud San Isidro")
                    .direccion("Calle Las Begonias 345").distrito("San Isidro")
                    .responsable("Jefe de Almacén").telefono("(01) 421-3000").build());

            Contrato contrato = contratoDao.save(Contrato.builder()
                    .numero("CONTRATO-2026-001").codigo("CTR-ESSALUD-2026")
                    .entidad(essalud).objeto("Suministro de insumos de higiene y limpieza")
                    .fechaInicio(LocalDate.now().minusMonths(2)).fechaFin(LocalDate.now().plusMonths(10))
                    .responsableInterno("Jefe de Logística").build());
            Contrato contrato2 = contratoDao.save(Contrato.builder()
                    .numero("CONTRATO-2026-002").codigo("CTR-MINSA-2026")
                    .entidad(minsa).objeto("Suministro de materiales de limpieza hospitalaria")
                    .fechaInicio(LocalDate.now().minusMonths(1)).fechaFin(LocalDate.now().plusMonths(11))
                    .responsableInterno("Jefe de Logística").build());

            Tdr tdr = tdrDao.save(Tdr.builder().contrato(contrato).version("V1")
                    .fechaVigencia(LocalDate.now().minusMonths(1)).build());
            Tdr tdr2 = tdrDao.save(Tdr.builder().contrato(contrato2).version("V1")
                    .fechaVigencia(LocalDate.now().minusMonths(1)).build());

            Producto jabon = productoDao.save(Producto.builder().codigo("PROD-001")
                    .nombre("Jabon liquido antibacterial 1L").categoria("Higiene")
                    .unidadMedida("BOTELLA").marca("Genoma").requiereLote(true).requiereVencimiento(true).build());
            Producto papel = productoDao.save(Producto.builder().codigo("PROD-002")
                    .nombre("Papel higienico institucional 300m").categoria("Higiene")
                    .unidadMedida("ROLLO").marca("Scott").build());
            Producto alcohol = productoDao.save(Producto.builder().codigo("PROD-003")
                    .nombre("Alcohol etilico 70% 1L").categoria("Desinfeccion")
                    .unidadMedida("BOTELLA").marca("Quimica Peru").requiereVencimiento(true).build());
            Producto guantes = productoDao.save(Producto.builder().codigo("PROD-004")
                    .nombre("Guantes nitrilo M (caja x100)").categoria("Proteccion")
                    .unidadMedida("CAJA").marca("Ansell").build());
            Producto detergente = productoDao.save(Producto.builder().codigo("PROD-005")
                    .nombre("Detergente industrial 5kg").categoria("Limpieza")
                    .unidadMedida("BOLSA").marca("Sapolio").build());

            inventarioDao.saveAll(List.of(
                    inventario(jabon, "240", "20", "50"),
                    inventario(papel, "500", "40", "80"),
                    inventario(alcohol, "180", "0", "40"),
                    inventario(guantes, "90", "10", "30"),
                    inventario(detergente, "60", "0", "25")
            ));

            tdrItemDao.save(TdrItem.builder().tdr(tdr).producto(jabon)
                    .cantidadTotal(new BigDecimal("1200")).unidad("BOTELLA").frecuencia(Frecuencia.MENSUAL)
                    .cantidadPorEntrega(new BigDecimal("200")).fechaProgramada(LocalDate.now().withDayOfMonth(5))
                    .fechaLimite(LocalDate.now().plusMonths(6)).build());
            tdrItemDao.save(TdrItem.builder().tdr(tdr).producto(papel)
                    .cantidadTotal(new BigDecimal("2400")).unidad("ROLLO").frecuencia(Frecuencia.QUINCENAL)
                    .cantidadPorEntrega(new BigDecimal("200")).fechaProgramada(LocalDate.now().withDayOfMonth(1))
                    .fechaLimite(LocalDate.now().plusMonths(6)).build());
            tdrItemDao.save(TdrItem.builder().tdr(tdr2).producto(alcohol)
                    .cantidadTotal(new BigDecimal("600")).unidad("BOTELLA").frecuencia(Frecuencia.MENSUAL)
                    .cantidadPorEntrega(new BigDecimal("100")).fechaProgramada(LocalDate.now().withDayOfMonth(10))
                    .fechaLimite(LocalDate.now().plusMonths(6)).build());

            vehiculoDao.saveAll(List.of(
                    Vehiculo.builder().placa("ABC-123").marca("Toyota").modelo("Hilux").tipo("CAMIONETA").build(),
                    Vehiculo.builder().placa("XYZ-987").marca("Hyundai").modelo("H100").tipo("FURGON").build()
            ));
        };
    }

    private Inventario inventario(Producto producto, String fisico, String reservado, String minimo) {
        return Inventario.builder().producto(producto)
                .stockFisico(new BigDecimal(fisico))
                .stockReservado(new BigDecimal(reservado))
                .stockMinimo(new BigDecimal(minimo))
                .build();
    }
}
