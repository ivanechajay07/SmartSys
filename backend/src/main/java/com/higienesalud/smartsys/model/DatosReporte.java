package com.higienesalud.smartsys.model;

import com.higienesalud.smartsys.exception.*;

import java.util.List;

public record DatosReporte(String key, String titulo, List<String> headers, List<List<String>> rows) {
}
