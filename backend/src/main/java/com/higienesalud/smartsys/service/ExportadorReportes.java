package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.model.DatosReporte;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.common.usermodel.HyperlinkType;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Exportador corporativo de reportes.
 *
 * <p>Los tres formatos comparten identidad visual (Higiene y Salud S.A.C.),
 * metadatos del periodo y un resumen de registros. Excel agrega panel de resumen,
 * filtros, paneles congelados y estilos de tabla; PDF agrega portada, tabla paginada
 * con cabecera repetida y pie de página; CSV mantiene una cabecera corporativa legible.</p>
 */
@Component
public class ExportadorReportes {

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final String COMPANY = "Higiene y Salud S.A.C.";
    private static final String SYSTEM = "Sistema de gestión logística";

    private static final Color NAVY = new Color(11, 22, 40);
    private static final Color TEAL = new Color(4, 118, 100);
    private static final Color TEAL_SOFT = new Color(236, 253, 248);
    private static final Color INK = new Color(15, 23, 42);
    private static final Color MUTED = new Color(100, 116, 139);
    private static final Color LINE = new Color(226, 232, 240);
    private static final Color BAND = new Color(248, 250, 252);
    private static final Color WHITE = Color.WHITE;

    /* ------------------------------------------------------------------ CSV */

    public byte[] csv(DatosReporte data) {
        return csv(data, null, null);
    }

    public byte[] csv(DatosReporte data, LocalDate desde, LocalDate hasta) {
        StringBuilder sb = new StringBuilder("\uFEFF");

        appendCsvLine(sb, COMPANY);
        appendCsvLine(sb, "Reporte", data.titulo());
        appendCsvLine(sb, "Periodo", period(desde, hasta));
        appendCsvLine(sb, "Registros", String.valueOf(data.rows().size()));
        appendCsvLine(sb, "Generado", LocalDateTime.now().format(STAMP));
        appendCsvLine(sb, "Sistema", SYSTEM);
        sb.append("\r\n");

        appendCsvLine(sb, data.headers().toArray(String[]::new));
        for (List<String> row : data.rows()) {
            appendCsvLine(sb, row.toArray(String[]::new));
        }

        sb.append("\r\n");
        appendCsvLine(sb, "Total de registros", String.valueOf(data.rows().size()));
        appendCsvLine(sb, "Documento generado automáticamente. Uso interno.");
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /* ----------------------------------------------------------------- Excel */

    public byte[] xlsx(DatosReporte data) {
        return xlsx(data, null, null);
    }

    public byte[] xlsx(DatosReporte data, LocalDate desde, LocalDate hasta) {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            int cols = Math.max(1, data.headers().size());
            int lastCol = cols - 1;

            XSSFColor navy = new XSSFColor(NAVY, null);
            XSSFColor teal = new XSSFColor(TEAL, null);
            XSSFColor tealSoft = new XSSFColor(TEAL_SOFT, null);
            XSSFColor line = new XSSFColor(LINE, null);
            XSSFColor band = new XSSFColor(BAND, null);

            XSSFCellStyle bannerStyle = workbook.createCellStyle();
            bannerStyle.setFillForegroundColor(navy);
            bannerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            bannerStyle.setAlignment(HorizontalAlignment.CENTER);
            bannerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            XSSFFont bannerFont = workbook.createFont();
            bannerFont.setBold(true);
            bannerFont.setFontHeightInPoints((short) 18);
            bannerFont.setColor(new XSSFColor(WHITE, null));
            bannerStyle.setFont(bannerFont);

            XSSFCellStyle subBannerStyle = workbook.createCellStyle();
            subBannerStyle.setFillForegroundColor(navy);
            subBannerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            subBannerStyle.setAlignment(HorizontalAlignment.CENTER);
            subBannerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            XSSFFont subBannerFont = workbook.createFont();
            subBannerFont.setFontHeightInPoints((short) 9);
            subBannerFont.setColor(new XSSFColor(new Color(203, 213, 225), null));
            subBannerStyle.setFont(subBannerFont);

            XSSFCellStyle reportStyle = workbook.createCellStyle();
            reportStyle.setFillForegroundColor(tealSoft);
            reportStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            reportStyle.setAlignment(HorizontalAlignment.LEFT);
            reportStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            reportStyle.setIndention((short) 1);
            XSSFFont reportFont = workbook.createFont();
            reportFont.setBold(true);
            reportFont.setFontHeightInPoints((short) 13);
            reportFont.setColor(teal);
            reportStyle.setFont(reportFont);

            XSSFCellStyle metaStyle = workbook.createCellStyle();
            metaStyle.setAlignment(HorizontalAlignment.LEFT);
            metaStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            metaStyle.setIndention((short) 1);
            XSSFFont metaFont = workbook.createFont();
            metaFont.setFontHeightInPoints((short) 9);
            metaFont.setColor(new XSSFColor(MUTED, null));
            metaStyle.setFont(metaFont);

            XSSFCellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(teal);
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setWrapText(true);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            headerStyle.setTopBorderColor(line);
            headerStyle.setBottomBorderColor(line);
            headerStyle.setLeftBorderColor(line);
            headerStyle.setRightBorderColor(line);
            XSSFFont headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 9);
            headerFont.setColor(new XSSFColor(WHITE, null));
            headerStyle.setFont(headerFont);

            XSSFCellStyle dataLeft = dataStyle(workbook, null, line, HorizontalAlignment.LEFT);
            XSSFCellStyle dataLeftBand = dataStyle(workbook, band, line, HorizontalAlignment.LEFT);
            XSSFCellStyle dataRight = dataStyle(workbook, null, line, HorizontalAlignment.RIGHT);
            XSSFCellStyle dataRightBand = dataStyle(workbook, band, line, HorizontalAlignment.RIGHT);

            XSSFCellStyle totalStyle = workbook.createCellStyle();
            totalStyle.setFillForegroundColor(tealSoft);
            totalStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            totalStyle.setBorderTop(BorderStyle.DOUBLE);
            totalStyle.setTopBorderColor(teal);
            totalStyle.setBorderBottom(BorderStyle.THIN);
            totalStyle.setBottomBorderColor(line);
            totalStyle.setAlignment(HorizontalAlignment.LEFT);
            totalStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            totalStyle.setIndention((short) 1);
            XSSFFont totalFont = workbook.createFont();
            totalFont.setBold(true);
            totalFont.setFontHeightInPoints((short) 9);
            totalFont.setColor(teal);
            totalStyle.setFont(totalFont);

            XSSFSheet sheet = workbook.createSheet(sheetName(data.titulo()));
            sheet.setDisplayGridlines(false);
            sheet.setDefaultRowHeightInPoints(18f);
            sheet.setZoom(90);

            Row title = sheet.createRow(0);
            title.setHeightInPoints(38);
            cell(title, 0, COMPANY, bannerStyle);
            merge(sheet, 0, 0, 0, lastCol);

            Row subtitle = sheet.createRow(1);
            subtitle.setHeightInPoints(20);
            cell(subtitle, 0, SYSTEM, subBannerStyle);
            merge(sheet, 1, 1, 0, lastCol);

            Row reportTitle = sheet.createRow(2);
            reportTitle.setHeightInPoints(28);
            cell(reportTitle, 0, data.titulo(), reportStyle);
            merge(sheet, 2, 2, 0, lastCol);

            Row meta = sheet.createRow(3);
            meta.setHeightInPoints(20);
            cell(meta, 0,
                    "Periodo: " + period(desde, hasta)
                            + "    ·    Registros: " + data.rows().size()
                            + "    ·    Generado: " + LocalDateTime.now().format(STAMP),
                    metaStyle);
            merge(sheet, 3, 3, 0, lastCol);

            Row actions = sheet.createRow(4);
            actions.setHeightInPoints(18);
            XSSFCellStyle linkStyle = workbook.createCellStyle();
            linkStyle.setAlignment(HorizontalAlignment.LEFT);
            linkStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            linkStyle.setIndention((short) 1);
            XSSFFont linkFont = workbook.createFont();
            linkFont.setUnderline(XSSFFont.U_SINGLE);
            linkFont.setBold(true);
            linkFont.setFontHeightInPoints((short) 9);
            linkFont.setColor(teal);
            linkStyle.setFont(linkFont);
            Cell summaryLink = actions.createCell(0);
            summaryLink.setCellValue("Ver resumen ejecutivo");
            summaryLink.setCellStyle(linkStyle);
            Hyperlink link = workbook.getCreationHelper().createHyperlink(HyperlinkType.DOCUMENT);
            link.setAddress("'Resumen'!A1");
            summaryLink.setHyperlink(link);
            merge(sheet, 4, 4, 0, lastCol);

            int headerRowIndex = 5;
            Row header = sheet.createRow(headerRowIndex);
            header.setHeightInPoints(28);
            for (int c = 0; c < cols; c++) {
                cell(header, c, c < data.headers().size() ? data.headers().get(c) : "", headerStyle);
            }

            int rowIndex = headerRowIndex + 1;
            int bandIndex = 0;
            for (List<String> values : data.rows()) {
                Row row = sheet.createRow(rowIndex++);
                row.setHeightInPoints(19);
                boolean banded = bandIndex++ % 2 == 1;
                for (int c = 0; c < cols; c++) {
                    String value = c < values.size() ? values.get(c) : null;
                    Cell cell = row.createCell(c);
                    boolean numeric = isNumeric(value);
                    if (numeric) {
                        cell.setCellValue(Double.parseDouble(value));
                    } else {
                        cell.setCellValue(value == null ? "" : value);
                    }
                    cell.setCellStyle(numeric
                            ? (banded ? dataRightBand : dataRight)
                            : (banded ? dataLeftBand : dataLeft));
                }
            }

            int lastDataRow = Math.max(headerRowIndex, rowIndex - 1);
            Row total = sheet.createRow(rowIndex);
            total.setHeightInPoints(22);
            cell(total, 0, "Total de registros: " + data.rows().size(), totalStyle);
            for (int c = 1; c < cols; c++) {
                cell(total, c, "", totalStyle);
            }

            sheet.createFreezePane(0, headerRowIndex + 1);
            sheet.setAutoFilter(new CellRangeAddress(headerRowIndex, lastDataRow, 0, lastCol));
            sheet.setRepeatingRows(CellRangeAddress.valueOf((headerRowIndex + 1) + ":" + (headerRowIndex + 1)));

            for (int c = 0; c < cols; c++) {
                int width = columnWidth(data, c);
                sheet.setColumnWidth(c, width * 256);
            }

            sheet.getPrintSetup().setLandscape(cols > 6);
            sheet.getPrintSetup().setFitWidth((short) 1);
            sheet.getPrintSetup().setFitHeight((short) 0);
            sheet.setFitToPage(true);
            sheet.setAutobreaks(true);
            sheet.getFooter().setLeft(COMPANY);
            sheet.getFooter().setCenter(SYSTEM);
            sheet.getFooter().setRight("Página &P de &N");

            summarySheet(workbook, data, desde, hasta, navy, teal, tealSoft, line);

            workbook.setActiveSheet(0);
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo generar el Excel", ex);
        }
    }

    private XSSFCellStyle dataStyle(XSSFWorkbook workbook, XSSFColor fill, XSSFColor line,
                                    HorizontalAlignment alignment) {
        XSSFCellStyle style = workbook.createCellStyle();
        if (fill != null) {
            style.setFillForegroundColor(fill);
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        style.setAlignment(alignment);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(false);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(line);
        style.setBottomBorderColor(line);
        style.setLeftBorderColor(line);
        style.setRightBorderColor(line);
        XSSFFont font = workbook.createFont();
        font.setFontHeightInPoints((short) 9);
        font.setColor(new XSSFColor(INK, null));
        style.setFont(font);
        return style;
    }

    private void summarySheet(XSSFWorkbook workbook, DatosReporte data, LocalDate desde, LocalDate hasta,
                              XSSFColor navy, XSSFColor teal, XSSFColor tealSoft, XSSFColor line) {
        XSSFSheet sheet = workbook.createSheet("Resumen");
        sheet.setDisplayGridlines(false);

        XSSFCellStyle banner = workbook.createCellStyle();
        banner.setFillForegroundColor(navy);
        banner.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        banner.setAlignment(HorizontalAlignment.LEFT);
        banner.setVerticalAlignment(VerticalAlignment.CENTER);
        banner.setIndention((short) 1);
        XSSFFont bannerFont = workbook.createFont();
        bannerFont.setBold(true);
        bannerFont.setFontHeightInPoints((short) 16);
        bannerFont.setColor(new XSSFColor(WHITE, null));
        banner.setFont(bannerFont);

        XSSFCellStyle label = workbook.createCellStyle();
        label.setFillForegroundColor(tealSoft);
        label.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        label.setBorderBottom(BorderStyle.THIN);
        label.setBottomBorderColor(line);
        label.setAlignment(HorizontalAlignment.LEFT);
        label.setVerticalAlignment(VerticalAlignment.CENTER);
        label.setIndention((short) 1);
        XSSFFont labelFont = workbook.createFont();
        labelFont.setBold(true);
        labelFont.setFontHeightInPoints((short) 9);
        labelFont.setColor(teal);
        label.setFont(labelFont);

        XSSFCellStyle value = workbook.createCellStyle();
        value.setBorderBottom(BorderStyle.THIN);
        value.setBottomBorderColor(line);
        value.setAlignment(HorizontalAlignment.LEFT);
        value.setVerticalAlignment(VerticalAlignment.CENTER);
        value.setIndention((short) 1);
        XSSFFont valueFont = workbook.createFont();
        valueFont.setFontHeightInPoints((short) 10);
        valueFont.setColor(new XSSFColor(INK, null));
        value.setFont(valueFont);

        Row title = sheet.createRow(1);
        title.setHeightInPoints(34);
        cell(title, 0, "Resumen del reporte", banner);
        cell(title, 1, "", banner);
        cell(title, 2, "", banner);
        cell(title, 3, "", banner);
        merge(sheet, 1, 1, 0, 3);

        XSSFCellStyle kpi = workbook.createCellStyle();
        kpi.setFillForegroundColor(tealSoft);
        kpi.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        kpi.setBorderTop(BorderStyle.THIN);
        kpi.setBorderBottom(BorderStyle.THIN);
        kpi.setBorderLeft(BorderStyle.THIN);
        kpi.setBorderRight(BorderStyle.THIN);
        kpi.setTopBorderColor(line);
        kpi.setBottomBorderColor(line);
        kpi.setLeftBorderColor(line);
        kpi.setRightBorderColor(line);
        kpi.setAlignment(HorizontalAlignment.CENTER);
        kpi.setVerticalAlignment(VerticalAlignment.CENTER);
        kpi.setWrapText(true);
        XSSFFont kpiFont = workbook.createFont();
        kpiFont.setBold(true);
        kpiFont.setFontHeightInPoints((short) 9);
        kpiFont.setColor(teal);
        kpi.setFont(kpiFont);

        Row kpiRow = sheet.createRow(2);
        kpiRow.setHeightInPoints(42);
        cell(kpiRow, 0, "REGISTROS\n" + data.rows().size(), kpi);
        cell(kpiRow, 1, "COLUMNAS\n" + data.headers().size(), kpi);
        cell(kpiRow, 2, "PERIODO\n" + period(desde, hasta), kpi);

        XSSFCellStyle backStyle = workbook.createCellStyle();
        backStyle.setAlignment(HorizontalAlignment.CENTER);
        backStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        XSSFFont backFont = workbook.createFont();
        backFont.setBold(true);
        backFont.setUnderline(XSSFFont.U_SINGLE);
        backFont.setFontHeightInPoints((short) 9);
        backFont.setColor(teal);
        backStyle.setFont(backFont);
        Cell back = kpiRow.createCell(3);
        back.setCellValue("Ver detalle");
        back.setCellStyle(backStyle);
        Hyperlink backLink = workbook.getCreationHelper().createHyperlink(HyperlinkType.DOCUMENT);
        backLink.setAddress("'" + sheetName(data.titulo()).replace("'", "''") + "'!A1");
        back.setHyperlink(backLink);

        String[][] rows = {
                {"Reporte", data.titulo()},
                {"Periodo", period(desde, hasta)},
                {"Registros", String.valueOf(data.rows().size())},
                {"Columnas", String.valueOf(data.headers().size())},
                {"Generado", LocalDateTime.now().format(STAMP)},
                {"Formato", "Excel (.xlsx)"},
                {"Entidad", COMPANY},
                {"Sistema", SYSTEM},
        };

        int index = 3;
        for (String[] item : rows) {
            Row row = sheet.createRow(index++);
            row.setHeightInPoints(22);
            cell(row, 0, item[0], label);
            cell(row, 1, item[1], value);
        }

        sheet.setColumnWidth(0, 22 * 256);
        sheet.setColumnWidth(1, 24 * 256);
        sheet.setColumnWidth(2, 28 * 256);
        sheet.setColumnWidth(3, 18 * 256);
        sheet.createFreezePane(0, 3);

        Row note = sheet.createRow(13);
        note.setHeightInPoints(18);
        cell(note, 0, "Documento generado automáticamente · Uso interno", value);
    }

    private int columnWidth(DatosReporte data, int column) {
        int max = data.headers().size() > column ? data.headers().get(column).length() : 0;
        for (List<String> row : data.rows()) {
            if (row.size() > column && row.get(column) != null) {
                max = Math.max(max, row.get(column).length());
            }
        }
        return Math.max(12, Math.min(46, max + 4));
    }

    private void merge(XSSFSheet sheet, int firstRow, int lastRow, int firstCol, int lastCol) {
        if (lastCol > firstCol) {
            sheet.addMergedRegion(new CellRangeAddress(firstRow, lastRow, firstCol, lastCol));
        }
    }

    private void cell(Row row, int column, String value, CellStyle style) {
        Cell cell = row.createCell(column);
        cell.setCellValue(value == null ? "" : value);
        cell.setCellStyle(style);
    }

    /* -------------------------------------------------------------------- PDF */

    public byte[] pdf(DatosReporte data) {
        return pdf(data, null, null);
    }

    public byte[] pdf(DatosReporte data, LocalDate desde, LocalDate hasta) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            int cols = Math.max(1, data.headers().size());
            Rectangle size = cols > 6 ? PageSize.A4.rotate() : PageSize.A4;
            Document document = new Document(size, 28, 28, 46, 46);

            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new CorporatePageEvent(data.titulo()));
            document.addTitle(data.titulo());
            document.addAuthor(COMPANY);
            document.addSubject("Reporte corporativo");
            document.addCreator(SYSTEM);

            document.open();

            Font brandFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 17, WHITE);
            Font brandSubFont = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(203, 213, 225));
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, TEAL);
            Font metaFont = FontFactory.getFont(FontFactory.HELVETICA, 8, MUTED);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, WHITE);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, INK);
            Font chipLabelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.5f, MUTED);
            Font chipValueFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, INK);

            PdfPTable banner = new PdfPTable(new float[]{2.3f, 1f});
            banner.setWidthPercentage(100);
            PdfPCell brandCell = new PdfPCell();
            brandCell.setBackgroundColor(NAVY);
            brandCell.setBorder(Rectangle.NO_BORDER);
            brandCell.setPadding(12);
            Phrase brand = new Phrase();
            brand.add(new com.lowagie.text.Chunk(COMPANY + "\n", brandFont));
            brand.add(new com.lowagie.text.Chunk(SYSTEM, brandSubFont));
            brandCell.addElement(brand);
            banner.addCell(brandCell);

            PdfPCell stampCell = new PdfPCell();
            stampCell.setBackgroundColor(NAVY);
            stampCell.setBorder(Rectangle.NO_BORDER);
            stampCell.setPadding(12);
            Paragraph stamp = new Paragraph("REPORTE CORPORATIVO",
                    FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, WHITE));
            stamp.setAlignment(Element.ALIGN_RIGHT);
            Paragraph stampDate = new Paragraph(LocalDateTime.now().format(STAMP), brandSubFont);
            stampDate.setAlignment(Element.ALIGN_RIGHT);
            stampCell.addElement(stamp);
            stampCell.addElement(stampDate);
            banner.addCell(stampCell);
            document.add(banner);

            PdfPTable accent = new PdfPTable(1);
            accent.setWidthPercentage(100);
            PdfPCell accentCell = new PdfPCell();
            accentCell.setBackgroundColor(TEAL);
            accentCell.setBorder(Rectangle.NO_BORDER);
            accentCell.setFixedHeight(4f);
            accent.addCell(accentCell);
            document.add(accent);

            Paragraph title = new Paragraph(data.titulo(), titleFont);
            title.setSpacingBefore(12);
            title.setSpacingAfter(2);
            document.add(title);

            Paragraph meta = new Paragraph(
                    "Periodo: " + period(desde, hasta) + "   ·   Registros: " + data.rows().size()
                            + "   ·   Generado: " + LocalDateTime.now().format(STAMP),
                    metaFont);
            meta.setSpacingAfter(8);
            document.add(meta);

            PdfPTable chips = new PdfPTable(3);
            chips.setWidthPercentage(100);
            chips.setSpacingAfter(10);
            chips.setWidths(new float[]{1f, 1f, 1f});
            chips.addCell(chip("REGISTROS", String.valueOf(data.rows().size()), chipLabelFont, chipValueFont));
            chips.addCell(chip("COLUMNAS", String.valueOf(data.headers().size()), chipLabelFont, chipValueFont));
            chips.addCell(chip("PERIODO", period(desde, hasta), chipLabelFont, chipValueFont));
            document.add(chips);

            PdfPTable table = new PdfPTable(cols);
            table.setWidthPercentage(100);
            table.setHeaderRows(1);
            table.setSplitRows(true);
            table.setWidths(widths(data, cols));

            for (String header : data.headers()) {
                PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
                cell.setBackgroundColor(TEAL);
                cell.setBorderColor(TEAL);
                cell.setPadding(6);
                cell.setHorizontalAlignment(Element.ALIGN_LEFT);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                table.addCell(cell);
            }

            int index = 0;
            for (List<String> row : data.rows()) {
                boolean banded = index++ % 2 == 1;
                for (int c = 0; c < cols; c++) {
                    String value = c < row.size() ? row.get(c) : "";
                    PdfPCell cell = new PdfPCell(new Phrase(value == null ? "" : value, bodyFont));
                    cell.setBorderColor(LINE);
                    cell.setBorderWidth(0.5f);
                    cell.setBackgroundColor(banded ? BAND : WHITE);
                    cell.setPadding(5);
                    cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    cell.setHorizontalAlignment(isNumeric(value) ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
                    table.addCell(cell);
                }
            }

            if (data.rows().isEmpty()) {
                PdfPCell empty = new PdfPCell(new Phrase("Sin datos para el periodo seleccionado",
                        FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, MUTED)));
                empty.setColspan(cols);
                empty.setPadding(14);
                empty.setBorderColor(LINE);
                empty.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(empty);
            } else {
                PdfPCell totalCell = new PdfPCell(new Phrase("Total de registros: " + data.rows().size(),
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, WHITE)));
                totalCell.setColspan(cols);
                totalCell.setBackgroundColor(TEAL);
                totalCell.setBorder(Rectangle.NO_BORDER);
                totalCell.setPadding(6);
                totalCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                table.addCell(totalCell);
            }

            document.add(table);

            Paragraph note = new Paragraph(
                    "Documento generado automáticamente. Uso interno. "
                            + "La información refleja los registros disponibles al momento de la exportación.",
                    FontFactory.getFont(FontFactory.HELVETICA, 6.5f, MUTED));
            note.setSpacingBefore(10);
            document.add(note);

            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo generar el PDF", ex);
        }
    }

    private PdfPCell chip(String label, String value, Font labelFont, Font valueFont) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(BAND);
        cell.setBorderColor(LINE);
        cell.setBorderWidth(0.5f);
        cell.setPadding(7);
        Phrase phrase = new Phrase();
        phrase.add(new com.lowagie.text.Chunk(label + "\n", labelFont));
        phrase.add(new com.lowagie.text.Chunk(value, valueFont));
        cell.addElement(phrase);
        return cell;
    }

    private float[] widths(DatosReporte data, int cols) {
        float[] weights = new float[cols];
        float total = 0f;
        for (int c = 0; c < cols; c++) {
            int length = data.headers().size() > c ? data.headers().get(c).length() : 8;
            int max = length;
            for (List<String> row : data.rows()) {
                if (row.size() > c && row.get(c) != null) {
                    max = Math.max(max, row.get(c).length());
                }
            }
            weights[c] = Math.max(7, Math.min(34, max));
            total += weights[c];
        }
        for (int c = 0; c < cols; c++) {
            weights[c] = Math.max(5f, (weights[c] / total) * 100f);
        }
        return weights;
    }

    /* ------------------------------------------------------------- utilidades */

    private String period(LocalDate desde, LocalDate hasta) {
        if (desde == null && hasta == null) {
            return "Histórico completo";
        }
        return (desde == null ? "Inicio" : desde.toString())
                + " a " + (hasta == null ? "Hoy" : hasta.toString());
    }

    private boolean isNumeric(String value) {
        if (value == null) {
            return false;
        }
        String trimmed = value.trim();
        return !trimmed.isEmpty()
                && trimmed.length() <= 9
                && trimmed.matches("-?\\d+(\\.\\d+)?");
    }

    private void appendCsvLine(StringBuilder sb, String... values) {
        for (int i = 0; i < values.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(escape(values[i]));
        }
        sb.append("\r\n");
    }

    private String escape(String value) {
        String safe = value == null ? "" : value;

        // Mitiga inyección de fórmulas al abrir el CSV en hojas de cálculo.
        if (!safe.isEmpty()) {
            char first = safe.charAt(0);
            if ((first == '=' || first == '+' || first == '-' || first == '@' || first == '\t')
                    && !safe.matches("-?\\d+(\\.\\d+)?")) {
                safe = "'" + safe;
            }
        }

        if (safe.contains(",") || safe.contains("\"") || safe.contains("\n") || safe.contains("\r")) {
            return "\"" + safe.replace("\"", "\"\"") + "\"";
        }
        return safe;
    }

    private String sheetName(String name) {
        String clean = name == null ? "Reporte" : name.replaceAll("[\\\\/?*\\[\\]:]", " ");
        return clean.length() > 31 ? clean.substring(0, 31) : clean;
    }

    /**
     * Pie corporativo en cada página del PDF. Se dibuja dentro del margen inferior
     * para no interferir con la tabla de datos.
     */
    private static final class CorporatePageEvent extends PdfPageEventHelper {
        private final String reportTitle;

        private CorporatePageEvent(String reportTitle) {
            this.reportTitle = reportTitle;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContent();
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 6.5f, MUTED);

            canvas.setColorStroke(LINE);
            canvas.setLineWidth(0.6f);
            canvas.moveTo(document.leftMargin(), document.bottomMargin() - 6);
            canvas.lineTo(document.right(), document.bottomMargin() - 6);
            canvas.stroke();

            ColumnText.showTextAligned(canvas, Element.ALIGN_LEFT,
                    new Phrase(COMPANY, footerFont),
                    document.leftMargin(), document.bottomMargin() - 16, 0);
            ColumnText.showTextAligned(canvas, Element.ALIGN_RIGHT,
                    new Phrase("Página " + writer.getPageNumber() + " · " + reportTitle, footerFont),
                    document.right(), document.bottomMargin() - 16, 0);
        }
    }
}

