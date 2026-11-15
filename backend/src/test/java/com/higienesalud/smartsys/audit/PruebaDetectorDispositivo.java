package com.higienesalud.smartsys.audit;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class PruebaDetectorDispositivo {

    @Test
    void detectaCelularAndroidConIpReenviada() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Forwarded-For", "190.1.2.3, 10.0.0.1");
        request.addHeader("User-Agent",
                "Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) "
                        + "AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 "
                        + "Chrome/120.0.0.0 Mobile Safari/537.36");

        DetectorDispositivo.Info info = DetectorDispositivo.detectar(request);

        assertThat(info.ip()).isEqualTo("190.1.2.3");
        assertThat(info.dispositivo()).isEqualTo("Móvil");
        assertThat(info.equipo()).contains("SM-S911B");
        assertThat(info.navegador()).startsWith("Chrome");
        assertThat(info.sistemaOperativo()).isEqualTo("Android 14");
    }

    @Test
    void detectaEquipoDeComputoConWindowsYEdge() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        + "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0");

        DetectorDispositivo.Info info = DetectorDispositivo.detectar(request);

        assertThat(info.dispositivo()).isEqualTo("Escritorio");
        assertThat(info.equipo()).contains("Windows");
        assertThat(info.navegador()).startsWith("Microsoft Edge");
        assertThat(info.sistemaOperativo()).isEqualTo("Windows 10/11");
        assertThat(info.ip()).isEqualTo("127.0.0.1");
    }
}
