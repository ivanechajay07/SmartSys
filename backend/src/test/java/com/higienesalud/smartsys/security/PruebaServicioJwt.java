package com.higienesalud.smartsys.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PruebaServicioJwt {

    @Test
    void rechazaSecretosDebilesOValoresDeEjemplo() {
        assertThatThrownBy(() -> new ServicioJwt("corto", 30))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new ServicioJwt(
                "SmartSysChangeThisSecretKeyForProduction2026AtLeast32Bytes", 30))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new ServicioJwt(
                "CAMBIE_ESTE_SECRETO_DE_AL_MENOS_32_CARACTERES", 30))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void aceptaSecretoFuerteYExpiracionValida() {
        assertThatCode(() -> new ServicioJwt(
                "un-secreto-de-prueba-con-mas-de-32-caracteres-2026", 30))
                .doesNotThrowAnyException();
    }

    @Test
    void rechazaExpiracionFueraDeRango() {
        assertThatThrownBy(() -> new ServicioJwt(
                "un-secreto-de-prueba-con-mas-de-32-caracteres-2026", 1))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new ServicioJwt(
                "un-secreto-de-prueba-con-mas-de-32-caracteres-2026", 999))
                .isInstanceOf(IllegalStateException.class);
    }
}
