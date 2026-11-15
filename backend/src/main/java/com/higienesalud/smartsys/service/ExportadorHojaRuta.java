package com.higienesalud.smartsys.service;

import com.higienesalud.smartsys.model.Despacho;
import com.higienesalud.smartsys.model.DetalleDespacho;
import com.higienesalud.smartsys.model.FirmaHojaRuta;
import com.higienesalud.smartsys.model.TipoFirmaHojaRuta;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
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
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Component
public class ExportadorHojaRuta {

    private static final String EMPRESA = "Higiene y Salud S.A.C.";
    private static final String RUC = "20608527550";
    private static final String DIRECCION = "Av. Encalada 270, Surco";
    private static final String TELEFONO = "982413494";

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final Color TEAL_DARK = new Color(6, 77, 68);
    private static final Color TEAL = new Color(4, 118, 100);
    private static final Color TEAL_SOFT = new Color(236, 253, 248);
    private static final Color INK = new Color(15, 23, 42);
    private static final Color MUTED = new Color(100, 116, 139);
    private static final Color LINE = new Color(226, 232, 240);
    private static final Color BAND = new Color(248, 250, 252);
    private static final Color WHITE = Color.WHITE;

    private static final Font F_BRAND = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, WHITE);
    private static final Font F_BRAND_SUB = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.4f,
            new Color(167, 243, 221));
    private static final Font F_HEADER_META = FontFactory.getFont(FontFactory.HELVETICA, 6.6f,
            new Color(226, 232, 240));
    private static final Font F_HEADER_RIGHT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10.5f, WHITE);
    private static final Font F_HEADER_ORIGINAL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 5.6f,
            new Color(167, 243, 221));
    private static final Font F_SECTION = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.2f, TEAL);
    private static final Font F_LABEL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.1f, MUTED);
    private static final Font F_VALUE = FontFactory.getFont(FontFactory.HELVETICA, 7.5f, INK);
    private static final Font F_TH = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.4f, WHITE);
    private static final Font F_TD = FontFactory.getFont(FontFactory.HELVETICA, 7f, INK);
    private static final Font F_SMALL = FontFactory.getFont(FontFactory.HELVETICA, 5.8f, MUTED);
    private static final Font F_LEGAL = FontFactory.getFont(FontFactory.HELVETICA, 6.3f, MUTED);
    private static final Font F_SIGN_TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, INK);
    private static final Font F_SIGN_ROLE = FontFactory.getFont(FontFactory.HELVETICA, 5.7f, MUTED);
    private static final Font F_SIGN_LINE = FontFactory.getFont(FontFactory.HELVETICA, 6.2f, INK);
    private static final Font F_FOOTER = FontFactory.getFont(FontFactory.HELVETICA, 6f, MUTED);

    public byte[] generar(Despacho despacho, List<FirmaHojaRuta> firmas) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 32, 32, 30, 42);
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new RoutePageEvent(despacho.getNumeroHojaRuta()));

            document.addTitle("Hoja de ruta " + safe(despacho.getNumeroHojaRuta()));
            document.addAuthor(EMPRESA);
            document.addCreator("Sistema de gestión logística");
            document.open();

            document.add(header(despacho));

            addSection(document, "Datos del despacho");
            document.add(dataTable(new String[][]{
                    {"Despacho", safe(despacho.getCodigo()), "Hoja de ruta", safe(despacho.getNumeroHojaRuta())},
                    {"Contrato", texto(despacho.getContrato() == null ? null : despacho.getContrato().getCodigo()),
                            "TDR", texto(despacho.getTdr() == null ? null : despacho.getTdr().getVersion())},
                    {"Programación", despacho.getProgramacion() == null ? "-"
                            : formatDate(despacho.getProgramacion().getFechaProgramada()),
                            "Estado", despacho.getEstado() == null ? "-" : despacho.getEstado().name()},
                    {"Hora de salida", formatStamp(despacho.getFechaHoraSalida()),
                            "Hora de llegada", formatStamp(despacho.getFechaHoraLlegada())}
            }));

            addSection(document, "Origen y destino");
            String entidad = despacho.getEntidad() == null ? "-" : texto(despacho.getEntidad().getRazonSocial());
            String rucEntidad = despacho.getEntidad() == null ? "-" : texto(despacho.getEntidad().getRuc());
            String punto = despacho.getPuntoEntrega() == null ? "-" : texto(despacho.getPuntoEntrega().getNombre());
            String direccion = despacho.getPuntoEntrega() == null ? "-"
                    : texto(despacho.getPuntoEntrega().getDireccion());
            String distrito = despacho.getPuntoEntrega() == null ? null : despacho.getPuntoEntrega().getDistrito();
            String contacto = despacho.getPuntoEntrega() == null ? "-"
                    : texto(despacho.getPuntoEntrega().getResponsable());
            String telefono = despacho.getPuntoEntrega() == null ? "-"
                    : texto(despacho.getPuntoEntrega().getTelefono());

            document.add(dataTable(new String[][]{
                    {"Origen", "Almacén central", "Entidad de destino", entidad},
                    {"RUC de la entidad", rucEntidad, "Punto de entrega", punto},
                    {"Dirección de entrega", join(" · ", direccion, distrito), "Contacto en destino", contacto},
                    {"Teléfono de contacto", telefono, "Observaciones",
                            texto(despacho.getObservaciones())}
            }));

            addSection(document, "Transporte");
            String transportista = despacho.getTransportista() == null ? "-"
                    : nombre(despacho.getTransportista().getNombres(), despacho.getTransportista().getApellidos());
            String telefonoTransportista = despacho.getTransportista() == null ? "-"
                    : texto(despacho.getTransportista().getTelefono());
            String acompanante = despacho.getAcompanante() == null ? "-"
                    : nombre(despacho.getAcompanante().getNombres(), despacho.getAcompanante().getApellidos());
            String vehiculo = despacho.getVehiculo() == null ? "-"
                    : join(" · ", texto(despacho.getVehiculo().getPlaca()),
                    texto(despacho.getVehiculo().getMarca()), texto(despacho.getVehiculo().getModelo()));
            String tipoVehiculo = despacho.getVehiculo() == null ? "-"
                    : texto(despacho.getVehiculo().getTipo());

            document.add(dataTable(new String[][]{
                    {"Transportista", transportista, "Teléfono", telefonoTransportista},
                    {"Acompañante", acompanista(acompanante), "Vehículo", vehiculo},
                    {"Tipo de vehículo", tipoVehiculo, "Responsable de despacho",
                            despacho.getResponsable() == null ? "-"
                                    : nombre(despacho.getResponsable().getNombres(),
                                    despacho.getResponsable().getApellidos())}
            }));

            addSection(document, "Productos transportados");
            document.add(productos(despacho.getDetalles()));

            document.add(legal());

            document.add(firmas(firmas));

            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo generar la hoja de ruta en PDF", ex);
        }
    }

    private PdfPTable header(Despacho despacho) throws DocumentException {
        PdfPTable table = new PdfPTable(new float[]{3.3f, 1.35f});
        table.setWidthPercentage(100);

        PdfPCell left = new PdfPCell();
        left.setBackgroundColor(TEAL_DARK);
        left.setBorder(Rectangle.NO_BORDER);
        left.setPadding(9);
        left.addElement(new Paragraph(EMPRESA, F_BRAND));
        Paragraph sub = new Paragraph("HOJA DE RUTA · DOCUMENTO DE CONTROL LOGÍSTICO", F_BRAND_SUB);
        sub.setSpacingBefore(1);
        left.addElement(sub);
        Paragraph meta = new Paragraph("RUC " + RUC + "  ·  " + DIRECCION + "  ·  Tel. " + TELEFONO,
                F_HEADER_META);
        meta.setSpacingBefore(4);
        left.addElement(meta);

        PdfPCell right = new PdfPCell();
        right.setBackgroundColor(TEAL_DARK);
        right.setBorder(Rectangle.NO_BORDER);
        right.setPadding(9);
        right.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph original = new Paragraph("ORIGINAL", F_HEADER_ORIGINAL);
        original.setAlignment(Element.ALIGN_RIGHT);
        right.addElement(original);
        Paragraph hr = new Paragraph(texto(despacho.getNumeroHojaRuta()), F_HEADER_RIGHT);
        hr.setAlignment(Element.ALIGN_RIGHT);
        right.addElement(hr);
        Paragraph code = new Paragraph(texto(despacho.getCodigo()), F_HEADER_META);
        code.setAlignment(Element.ALIGN_RIGHT);
        right.addElement(code);
        Paragraph date = new Paragraph("Emisión: " + LocalDateTime.now().format(STAMP), F_HEADER_META);
        date.setAlignment(Element.ALIGN_RIGHT);
        right.addElement(date);
        Paragraph state = new Paragraph("Estado: "
                + (despacho.getEstado() == null ? "-" : despacho.getEstado().name()), F_HEADER_META);
        state.setAlignment(Element.ALIGN_RIGHT);
        right.addElement(state);

        table.addCell(left);
        table.addCell(right);
        return table;
    }

    private void addSection(Document document, String title) throws DocumentException {
        Paragraph paragraph = new Paragraph(title.toUpperCase(), F_SECTION);
        paragraph.setSpacingBefore(9);
        paragraph.setSpacingAfter(3);
        document.add(paragraph);
    }

    private PdfPTable dataTable(String[][] rows) throws DocumentException {
        PdfPTable table = new PdfPTable(new float[]{1f, 2.1f, 1f, 2.1f});
        table.setWidthPercentage(100);
        for (String[] row : rows) {
            table.addCell(labelCell(row[0]));
            table.addCell(valueCell(row[1]));
            table.addCell(labelCell(row[2]));
            table.addCell(valueCell(row[3]));
        }
        return table;
    }

    private PdfPCell labelCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text.toUpperCase(), F_LABEL));
        cell.setBackgroundColor(BAND);
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(LINE);
        cell.setPadding(3.5f);
        return cell;
    }

    private PdfPCell valueCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(texto(text), F_VALUE));
        cell.setBackgroundColor(WHITE);
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(LINE);
        cell.setPadding(3.5f);
        return cell;
    }

    private PdfPTable productos(List<DetalleDespacho> detalles) throws DocumentException {
        PdfPTable table = new PdfPTable(new float[]{1.05f, 3.3f, 0.95f, 0.95f, 0.95f});
        table.setWidthPercentage(100);
        table.setHeaderRows(1);

        table.addCell(headerCell("Código", Element.ALIGN_LEFT));
        table.addCell(headerCell("Producto", Element.ALIGN_LEFT));
        table.addCell(headerCell("Unidad", Element.ALIGN_LEFT));
        table.addCell(headerCell("Cantidad", Element.ALIGN_RIGHT));
        table.addCell(headerCell("Recibido", Element.ALIGN_RIGHT));

        int items = 0;
        double total = 0;
        if (detalles != null) {
            for (DetalleDespacho detalle : detalles) {
                items++;
                double cantidad = detalle.getCantidadDespachada() != null
                        && detalle.getCantidadDespachada().doubleValue() > 0
                        ? detalle.getCantidadDespachada().doubleValue()
                        : detalle.getCantidadComprometida() == null ? 0
                        : detalle.getCantidadComprometida().doubleValue();
                total += cantidad;
                table.addCell(bodyCell(texto(detalle.getProducto().getCodigo()), Element.ALIGN_LEFT));
                table.addCell(bodyCell(texto(detalle.getProducto().getNombre()), Element.ALIGN_LEFT));
                table.addCell(bodyCell(texto(detalle.getProducto().getUnidadMedida()), Element.ALIGN_LEFT));
                table.addCell(bodyCell(formatNumber(cantidad), Element.ALIGN_RIGHT));
                table.addCell(bodyCell("", Element.ALIGN_RIGHT));
            }
        }

        PdfPCell totalCell = new PdfPCell(new Phrase("Total: " + items + (items == 1 ? " ítem" : " ítems"),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 6.8f, INK)));
        totalCell.setColspan(3);
        totalCell.setBackgroundColor(BAND);
        totalCell.setBorder(Rectangle.TOP);
        totalCell.setBorderColor(LINE);
        totalCell.setPadding(4);
        table.addCell(totalCell);

        PdfPCell totalQty = new PdfPCell(new Phrase(formatNumber(total),
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7f, INK)));
        totalQty.setHorizontalAlignment(Element.ALIGN_RIGHT);
        totalQty.setBackgroundColor(BAND);
        totalQty.setBorder(Rectangle.TOP);
        totalQty.setBorderColor(LINE);
        totalQty.setPadding(4);
        table.addCell(totalQty);

        PdfPCell empty = new PdfPCell(new Phrase("", F_SMALL));
        empty.setBackgroundColor(BAND);
        empty.setBorder(Rectangle.TOP);
        empty.setBorderColor(LINE);
        empty.setPadding(4);
        table.addCell(empty);

        return table;
    }

    private PdfPCell headerCell(String text, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text.toUpperCase(), F_TH));
        cell.setBackgroundColor(TEAL);
        cell.setBorderColor(TEAL);
        cell.setPadding(4);
        cell.setHorizontalAlignment(alignment);
        return cell;
    }

    private PdfPCell bodyCell(String text, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, F_TD));
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderColor(LINE);
        cell.setPadding(3.5f);
        cell.setHorizontalAlignment(alignment);
        return cell;
    }

    private PdfPTable legal() throws DocumentException {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        table.setSpacingBefore(7);
        PdfPCell cell = new PdfPCell(new Phrase(
                "Declaro haber recibido los productos descritos en la presente hoja de ruta, en las cantidades "
                        + "y condiciones indicadas. Cualquier faltante, daño o diferencia se registrará en el acto "
                        + "de recepción.", F_LEGAL));
        cell.setBackgroundColor(BAND);
        cell.setBorderColor(LINE);
        cell.setPadding(6);
        table.addCell(cell);
        return table;
    }

    private PdfPTable firmas(List<FirmaHojaRuta> firmas) throws DocumentException {
        Map<TipoFirmaHojaRuta, FirmaHojaRuta> map = new EnumMap<>(TipoFirmaHojaRuta.class);
        if (firmas != null) {
            for (FirmaHojaRuta firma : firmas) {
                map.put(firma.getTipo(), firma);
            }
        }

        PdfPTable table = new PdfPTable(new float[]{1f, 1f, 1f});
        table.setWidthPercentage(100);
        table.setSpacingBefore(9);

        table.addCell(firmaCell("Firma despacho", "Responsable de despacho", map.get(TipoFirmaHojaRuta.DESPACHO)));
        table.addCell(firmaCell("Firma transportista", "Transportista", map.get(TipoFirmaHojaRuta.TRANSPORTISTA)));
        table.addCell(firmaCell("Firma recepción", "Responsable de recepción", map.get(TipoFirmaHojaRuta.RECEPCION)));
        return table;
    }

    private PdfPCell firmaCell(String title, String role, FirmaHojaRuta firma) {
        boolean tieneImagen = firma != null && firma.getImagen() != null
                && !firma.getImagen().isBlank();
        PdfPCell cell = new PdfPCell();
        cell.setBorderColor(LINE);
        cell.setPadding(6);
        cell.setBackgroundColor(tieneImagen ? TEAL_SOFT : WHITE);

        cell.addElement(new Paragraph(title, F_SIGN_TITLE));
        cell.addElement(new Paragraph(role, F_SIGN_ROLE));

        boolean pintada = false;
        if (tieneImagen && firma.getImagen().startsWith("data:image/")) {
            try {
                int comma = firma.getImagen().indexOf(',');
                byte[] bytes = Base64.getDecoder().decode(firma.getImagen().substring(comma + 1));
                Image image = Image.getInstance(bytes);
                image.scaleToFit(140, 44);
                image.setAlignment(Element.ALIGN_CENTER);
                cell.addElement(image);
                pintada = true;
            } catch (Exception ignored) {
                // Si la firma no se puede decodificar, se deja el espacio en blanco.
            }
        }
        if (!pintada) {
            Paragraph blank = new Paragraph(" ", F_SMALL);
            blank.setSpacingAfter(28);
            cell.addElement(blank);
        }

        cell.addElement(new Paragraph("Nombre: " + safe(firma == null ? null : firma.getNombre()), F_SIGN_LINE));
        cell.addElement(new Paragraph("DNI / CE: " + safe(firma == null ? null : firma.getDni()), F_SIGN_LINE));
        cell.addElement(new Paragraph("Cargo: " + safe(firma == null ? null : firma.getCargo()), F_SIGN_LINE));
        cell.addElement(new Paragraph("Fecha: "
                + (!tieneImagen || firma.getFechaFirma() == null ? "-" : firma.getFechaFirma().format(STAMP)),
                F_SIGN_LINE));
        return cell;
    }

    private String formatDate(java.time.LocalDate value) {
        return value == null ? "-" : value.format(DATE);
    }

    private String formatStamp(LocalDateTime value) {
        return value == null ? "-" : value.format(STAMP);
    }

    private String formatNumber(double value) {
        if (value == Math.rint(value)) {
            return String.format("%,.0f", value);
        }
        return String.format("%,.3f", value);
    }

    private String nombre(String nombres, String apellidos) {
        return (texto(nombres) + " " + texto(apellidos)).trim();
    }

    private String acompanista(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private String texto(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }

    private String safe(String value) {
        return value == null ? "-" : value;
    }

    private String join(String separator, String... values) {
        StringBuilder sb = new StringBuilder();
        for (String value : values) {
            if (value == null || value.isBlank() || "-".equals(value)) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append(separator);
            }
            sb.append(value.trim());
        }
        return sb.length() == 0 ? "-" : sb.toString();
    }

    private static final class RoutePageEvent extends PdfPageEventHelper {
        private final String hojaRuta;

        private RoutePageEvent(String hojaRuta) {
            this.hojaRuta = hojaRuta;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte canvas = writer.getDirectContent();
            canvas.setColorStroke(LINE);
            canvas.setLineWidth(0.6f);
            canvas.moveTo(document.leftMargin(), document.bottomMargin() - 7);
            canvas.lineTo(document.right(), document.bottomMargin() - 7);
            canvas.stroke();

            ColumnText.showTextAligned(canvas, Element.ALIGN_LEFT,
                    new Phrase(EMPRESA + " · RUC " + RUC, F_FOOTER),
                    document.leftMargin(), document.bottomMargin() - 17, 0);
            ColumnText.showTextAligned(canvas, Element.ALIGN_RIGHT,
                    new Phrase("Hoja de ruta " + safeValue(hojaRuta) + " · Página " + writer.getPageNumber(),
                            F_FOOTER),
                    document.right(), document.bottomMargin() - 17, 0);
        }

        private static String safeValue(String value) {
            return value == null ? "-" : value;
        }
    }
}
