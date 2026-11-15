package com.higienesalud.smartsys.exception;

import com.higienesalud.smartsys.model.*;

public class ExcepcionNoEncontrada extends RuntimeException {
    public ExcepcionNoEncontrada(String message) {
        super(message);
    }
}
