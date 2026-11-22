package com.higienesalud.smartsys.exception;

import java.time.LocalDateTime;

/**
 * Error de credenciales con información útil para mostrar intentos restantes
 * y el tiempo de desbloqueo temporal en el login.
 */
public class ExcepcionCredenciales extends ExcepcionNegocio {

    private final Integer intentosFallidos;
    private final Integer intentosRestantes;
    private final boolean bloqueado;
    private final LocalDateTime bloqueadoHasta;
    private final Long segundosParaDesbloqueo;

    private ExcepcionCredenciales(String message, Integer intentosFallidos,
                                  Integer intentosRestantes, boolean bloqueado,
                                  LocalDateTime bloqueadoHasta, Long segundosParaDesbloqueo) {
        super(message);
        this.intentosFallidos = intentosFallidos;
        this.intentosRestantes = intentosRestantes;
        this.bloqueado = bloqueado;
        this.bloqueadoHasta = bloqueadoHasta;
        this.segundosParaDesbloqueo = segundosParaDesbloqueo;
    }

    public static ExcepcionCredenciales generica() {
        return new ExcepcionCredenciales("Credenciales invalidas", null, null,
                false, null, null);
    }

    public static ExcepcionCredenciales intento(int intentosFallidos, int intentosRestantes) {
        return new ExcepcionCredenciales("Credenciales invalidas", intentosFallidos,
                intentosRestantes, false, null, 0L);
    }

    public static ExcepcionCredenciales bloqueada(int intentosFallidos,
                                                   LocalDateTime bloqueadoHasta,
                                                   long segundosParaDesbloqueo) {
        return new ExcepcionCredenciales("Credenciales invalidas", intentosFallidos,
                0, true, bloqueadoHasta, segundosParaDesbloqueo);
    }

    public Integer getIntentosFallidos() {
        return intentosFallidos;
    }

    public Integer getIntentosRestantes() {
        return intentosRestantes;
    }

    public boolean isBloqueado() {
        return bloqueado;
    }

    public LocalDateTime getBloqueadoHasta() {
        return bloqueadoHasta;
    }

    public Long getSegundosParaDesbloqueo() {
        return segundosParaDesbloqueo;
    }
}
