package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.exception.ExcepcionNegocio;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PruebaAvatarPresencia {

    @Test
    void avatarAcceptsDataUrlAndRemoteHttps() {
        String dataUrl = "data:image/png;base64," + "A".repeat(32);
        assertThat(ValidadorAvatar.normalize(dataUrl)).isEqualTo(dataUrl);
        assertThat(ValidadorAvatar.normalize("https://cdn.example.com/a.png"))
                .isEqualTo("https://cdn.example.com/a.png");
    }

    @Test
    void avatarRejectsScriptsAndOversizedPayloads() {
        assertThatThrownBy(() -> ValidadorAvatar.normalize("javascript:alert(1)"))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessageContaining("Formato de imagen");
        assertThatThrownBy(() -> ValidadorAvatar.normalize("http://cdn.example.com/a.png"))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessageContaining("Formato de imagen");
        assertThatThrownBy(() -> ValidadorAvatar.normalize("data:image/png;base64," + "A".repeat(400_000)))
                .isInstanceOf(ExcepcionNegocio.class)
                .hasMessageContaining("tamaño");
    }

    @Test
    void avatarCanBeRemovedWithNullValue() {
        assertThat(ValidadorAvatar.normalize(null)).isNull();
        assertThat(ValidadorAvatar.normalize("   ")).isNull();
    }

    @Test
    void presenceMarksUserOnlineAfterTouch() {
        ServicioPresencia service = new ServicioPresencia();
        service.touch(7L);

        ServicioPresencia.Presence snapshot = service.snapshot(7L);
        assertThat(snapshot.enLinea()).isTrue();
        assertThat(snapshot.usuarioId()).isEqualTo(7L);
        assertThat(snapshot.ultimaActividad()).isNotNull();
    }

    @Test
    void presenceReportsOfflineForUnknownUser() {
        ServicioPresencia service = new ServicioPresencia();
        ServicioPresencia.Presence snapshot = service.snapshot(99L);
        assertThat(snapshot.enLinea()).isFalse();
        assertThat(snapshot.ultimaActividad()).isNull();
    }
}
