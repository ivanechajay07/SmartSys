package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

public enum EstadoDespacho {
    BORRADOR,
    EN_PREPARACION,
    PREPARADO,
    EN_RUTA,
    ENTREGADO,
    ENTREGADO_PARCIAL,
    CANCELADO
}
