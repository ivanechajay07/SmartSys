package com.higienesalud.smartsys.exception;

import com.higienesalud.smartsys.model.*;

public class ExcepcionNegocio extends RuntimeException {
    public ExcepcionNegocio(String message) {
        super(message);
    }
}
