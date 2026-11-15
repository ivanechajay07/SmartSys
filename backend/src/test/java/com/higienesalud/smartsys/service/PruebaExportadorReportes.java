package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.model.DatosReporte;
import com.lowagie.text.pdf.PdfReader;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PruebaExportadorReportes {

    private final ExportadorReportes exporter = new ExportadorReportes();

    private final DatosReporte data = new DatosReporte(
            "inventario",
            "Inventario actual",
            List.of("Código", "Producto", "Disponible"),
            List.of(
                    List.of("PROD-001", "Jabón líquido", "60"),
                    List.of("PROD-002", "Papel higiénico", "440"),
                    List.of("=2+2", "Formula maliciosa", "0")
            ));

    @Test
    void csvIncludesCorporateMetadataAndEscapesFormulaInjection() {
        byte[] bytes = exporter.csv(data, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 7));
        String csv = new String(bytes, StandardCharsets.UTF_8);

        assertTrue(csv.startsWith("\uFEFF"));
        assertTrue(csv.contains("Higiene y Salud S.A.C."));
        assertTrue(csv.contains("Reporte,Inventario actual"));
        assertTrue(csv.contains("Periodo,2026-11-01 a 2026-11-07"));
        assertTrue(csv.contains("Registros,3"));
        assertTrue(csv.contains("Código,Producto,Disponible"));
        assertTrue(csv.contains("PROD-001,Jabón líquido,60"));
        assertTrue(csv.contains("'=2+2"), "Las fórmulas deben neutralizarse");
        assertTrue(csv.contains("Total de registros,3"));
    }

    @Test
    void xlsxGeneratesStyledSheetWithFiltersAndSummary() throws Exception {
        byte[] bytes = exporter.xlsx(data, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 7));

        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals(2, workbook.getNumberOfSheets());
            assertNotNull(workbook.getSheet("Resumen"));

            XSSFSheet sheet = workbook.getSheetAt(0);
            assertEquals("Higiene y Salud S.A.C.", sheet.getRow(0).getCell(0).getStringCellValue());
            assertEquals("Inventario actual", sheet.getRow(2).getCell(0).getStringCellValue());
            assertTrue(sheet.getRow(3).getCell(0).getStringCellValue().contains("Registros: 3"));
            assertEquals("Código", sheet.getRow(5).getCell(0).getStringCellValue());
            assertNotNull(sheet.getRow(5).getCell(0).getCellStyle());

            assertTrue(sheet.getCTWorksheet().isSetAutoFilter());
            assertEquals("A6:C9", sheet.getCTWorksheet().getAutoFilter().getRef());
            assertNotNull(sheet.getPaneInformation());
            assertTrue(sheet.getPaneInformation().isFreezePane());

            assertEquals(CellType.NUMERIC, sheet.getRow(6).getCell(2).getCellType());
            assertEquals(60d, sheet.getRow(6).getCell(2).getNumericCellValue(), 0.001);
            assertTrue(sheet.getRow(9).getCell(0).getStringCellValue().contains("Total de registros"));

            XSSFSheet summary = workbook.getSheet("Resumen");
            assertEquals("Resumen del reporte", summary.getRow(1).getCell(0).getStringCellValue());
            assertEquals("3", summary.getRow(5).getCell(1).getStringCellValue());
        }
    }

    @Test
    void pdfGeneratesAtLeastOnePageWithCorporateLayout() throws Exception {
        byte[] bytes = exporter.pdf(data, LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 7));

        assertTrue(bytes.length > 800);
        String signature = new String(bytes, 0, 5, StandardCharsets.ISO_8859_1);
        assertEquals("%PDF-", signature);

        PdfReader reader = new PdfReader(bytes);
        try {
            assertTrue(reader.getNumberOfPages() >= 1);
        } finally {
            reader.close();
        }
    }

    @Test
    void emptyReportStillGeneratesAllFormats() {
        DatosReporte empty = new DatosReporte("inventario", "Inventario actual",
                List.of("Código", "Producto"), List.of());

        assertTrue(exporter.csv(empty).length > 0);
        assertTrue(exporter.xlsx(empty).length > 0);
        assertTrue(exporter.pdf(empty).length > 0);
    }
}
