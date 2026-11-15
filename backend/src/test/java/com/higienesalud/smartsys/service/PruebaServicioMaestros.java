package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.dao.ProveedorDao;
import com.higienesalud.smartsys.dao.RolSistemaDao;
import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import com.higienesalud.smartsys.model.Proveedor;
import com.higienesalud.smartsys.model.RolSistema;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PruebaServicioMaestros {

    @Mock private ProveedorDao proveedorDao;
    @Mock private RolSistemaDao rolSistemaDao;

    @InjectMocks private ServicioMaestros service;

    @Test
    void registraProveedorActivoPorDefecto() {
        when(proveedorDao.findByRuc("20512345678")).thenReturn(Optional.empty());
        when(proveedorDao.save(any(Proveedor.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Proveedor proveedor = service.createProvider(new ServicioMaestros.ProviderRequest(
                " 20512345678 ", "  Proveedor Demo  ", "Av. Uno 123", "999888777", "demo@proveedor.pe", null));

        assertThat(proveedor.getRuc()).isEqualTo("20512345678");
        assertThat(proveedor.getRazonSocial()).isEqualTo("Proveedor Demo");
        assertThat(proveedor.isEstado()).isTrue();

        ArgumentCaptor<Proveedor> captor = ArgumentCaptor.forClass(Proveedor.class);
        verify(proveedorDao).save(captor.capture());
        assertThat(captor.getValue().getCorreo()).isEqualTo("demo@proveedor.pe");
    }

    @Test
    void rechazaRucDuplicado() {
        when(proveedorDao.findByRuc("20512345678"))
                .thenReturn(Optional.of(Proveedor.builder().ruc("20512345678").build()));

        assertThatThrownBy(() -> service.createProvider(new ServicioMaestros.ProviderRequest(
                "20512345678", "Duplicado", null, null, null, true)))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessageContaining("RUC");
    }

    @Test
    void listaRolesDelCatalogo() {
        List<RolSistema> roles = List.of(
                RolSistema.builder().id(1).nombre("ADMINISTRADOR").descripcion("Administrador").build(),
                RolSistema.builder().id(2).nombre("GERENTE_GENERAL").descripcion("Gerente").build());
        when(rolSistemaDao.findAllByOrderByIdAsc()).thenReturn(roles);

        assertThat(service.roles()).hasSize(2);
        assertThat(service.roles().get(0).getNombre()).isEqualTo("ADMINISTRADOR");
    }
}
