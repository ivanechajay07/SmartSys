package com.higienesalud.smartsys.integration;

import com.higienesalud.smartsys.dao.*;
import com.higienesalud.smartsys.interfaces.ProductoDao;
import com.higienesalud.smartsys.service.*;
import com.higienesalud.smartsys.security.*;
import com.higienesalud.smartsys.exception.*;
import com.higienesalud.smartsys.controller.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.higienesalud.smartsys.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PruebaFlujoIntegracionSolicitud {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private EntidadPublicaDao entidadDao;
    @Autowired private PuntoEntregaDao puntoDao;
    @Autowired private ProductoDao productoDao;
    @Autowired private InventarioDao inventarioDao;

    private EntidadPublica entidad;
    private PuntoEntrega punto;
    private Producto producto;

    @BeforeEach
    void setUp() {
        entidad = entidadDao.save(EntidadPublica.builder()
                .ruc("20131257750").razonSocial("ESSALUD").build());
        punto = puntoDao.save(PuntoEntrega.builder()
                .entidad(entidad).nombre("Hospital Rebagliati").build());
        producto = productoDao.crear(Producto.builder()
                .codigo("TEST-001").nombre("Jabon de prueba").unidadMedida("BOTELLA").build());
        inventarioDao.save(Inventario.builder()
                .producto(producto).stockFisico(new BigDecimal("100"))
                .stockReservado(BigDecimal.ZERO).stockMinimo(new BigDecimal("5")).build());
    }

    @Test
    void requestIsSubmittedAndApprovedReservingStock() throws Exception {
        Map<String, Object> body = Map.of(
                "entidadId", entidad.getId(),
                "puntoEntregaId", punto.getId(),
                "justificacion", "Reposición para hospitalizacion",
                "items", java.util.List.of(Map.of("productoId", producto.getId(), "cantidad", 10))
        );
        String created = mockMvc.perform(post("/api/v1/requests")
                        .with(user("operativo@smartsys.local").roles("PERSONAL_OPERATIVO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(created);
        long id = node.get("id").asLong();

        mockMvc.perform(post("/api/v1/requests/" + id + "/submit")
                        .with(user("operativo@smartsys.local").roles("PERSONAL_OPERATIVO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("EN_REVISION"));

        mockMvc.perform(post("/api/v1/requests/" + id + "/approve")
                        .with(user("logistica@smartsys.local").roles("JEFE_LOGISTICA")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("PENDIENTE_DESPACHO"))
                .andExpect(jsonPath("$.detalles[0].cantidadAprobada").value(10));

        Inventario inventario = inventarioDao.findByProductoId(producto.getId()).orElseThrow();
        assertThat(inventario.getStockReservado()).isEqualByComparingTo("10");
        assertThat(inventario.getStockDisponible()).isEqualByComparingTo("90");
    }

    @Test
    void requesterCannotApproveOwnRequest() throws Exception {
        Map<String, Object> body = Map.of(
                "entidadId", entidad.getId(),
                "puntoEntregaId", punto.getId(),
                "justificacion", "Autoprueba",
                "items", java.util.List.of(Map.of("productoId", producto.getId(), "cantidad", 5))
        );
        String created = mockMvc.perform(post("/api/v1/requests")
                        .with(user("logistica@smartsys.local").roles("JEFE_LOGISTICA"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        long id = objectMapper.readTree(created).get("id").asLong();

        mockMvc.perform(post("/api/v1/requests/" + id + "/approve")
                        .with(user("logistica@smartsys.local").roles("JEFE_LOGISTICA")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        "El solicitante no puede aprobar su propia solicitud"));
    }
}
