package com.higienesalud.smartsys.audit;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extrae IP, tipo de dispositivo, modelo/equipo, navegador y sistema operativo
 * a partir de la petición HTTP. No usa librerías externas.
 */
public final class DetectorDispositivo {

    public record Info(String ip, String dispositivo, String equipo,
                       String navegador, String sistemaOperativo) {}

    private DetectorDispositivo() {
    }

    public static Info detectar(HttpServletRequest request) {
        if (request == null) {
            return new Info(null, null, null, null, null);
        }
        String userAgent = request.getHeader("User-Agent");
        String ua = userAgent == null ? "" : userAgent;
        String lower = ua.toLowerCase(Locale.ROOT);
        String dispositivo = dispositivo(lower);
        String so = sistemaOperativo(lower);
        String navegador = navegador(ua, lower);
        String equipo = equipo(ua, dispositivo, so);
        return new Info(ip(request), dispositivo, equipo, navegador, so);
    }

    private static String ip(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String real = request.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) {
            return real.trim();
        }
        String remote = request.getRemoteAddr();
        return "0:0:0:0:0:0:0:1".equals(remote) ? "127.0.0.1" : remote;
    }

    private static String dispositivo(String lower) {
        if (lower.contains("ipad") || lower.contains("tablet")) {
            return "Tablet";
        }
        if (lower.contains("mobile") || lower.contains("android")
                || lower.contains("iphone") || lower.contains("ipod")) {
            return "Móvil";
        }
        return "Escritorio";
    }

    private static String equipo(String ua, String dispositivo, String so) {
        if ("Móvil".equals(dispositivo) || "Tablet".equals(dispositivo)) {
            if (ua.contains("iPhone")) return "iPhone";
            if (ua.contains("iPad")) return "iPad";
            Matcher android = Pattern.compile("Android\\s+[\\d.]+;\\s*([^;)]+)",
                    Pattern.CASE_INSENSITIVE).matcher(ua);
            if (android.find()) {
                String modelo = android.group(1)
                        .replace("Build", "")
                        .replace("wv", "")
                        .trim();
                if (!modelo.isBlank()) {
                    return modelo;
                }
            }
            return "Tablet".equals(dispositivo) ? "Tablet" : "Celular";
        }
        if (so.startsWith("Windows")) return "Equipo de cómputo Windows";
        if (so.startsWith("macOS")) return "Mac";
        if (so.startsWith("Linux")) return "Equipo Linux";
        return "Equipo de cómputo";
    }

    private static String navegador(String ua, String lower) {
        String version = version(ua, "(?:Edg|Chrome|Firefox|OPR|Version)/([\\d.]+)");
        if (lower.contains("edg/")) return "Microsoft Edge" + suffix(version);
        if (lower.contains("opr/") || lower.contains("opera")) return "Opera" + suffix(version);
        if (lower.contains("chrome/") || lower.contains("crios/")) return "Chrome" + suffix(version);
        if (lower.contains("firefox/")) return "Firefox" + suffix(version);
        if (lower.contains("safari/") && lower.contains("version/")) return "Safari" + suffix(version);
        return "Navegador";
    }

    private static String sistemaOperativo(String lower) {
        if (lower.contains("windows nt 10.0")) return "Windows 10/11";
        if (lower.contains("windows nt 6.3")) return "Windows 8.1";
        if (lower.contains("windows nt 6.2")) return "Windows 8";
        if (lower.contains("windows nt 6.1")) return "Windows 7";
        if (lower.contains("windows")) return "Windows";
        Matcher android = Pattern.compile("Android\\s+([\\d.]+)", Pattern.CASE_INSENSITIVE)
                .matcher(lower);
        if (android.find()) return "Android " + android.group(1);
        Matcher ios = Pattern.compile("iphone os ([\\d_]+)").matcher(lower);
        if (ios.find()) return "iOS " + ios.group(1).replace('_', '.');
        Matcher mac = Pattern.compile("mac os x ([\\d_]+)").matcher(lower);
        if (mac.find()) return "macOS " + mac.group(1).replace('_', '.');
        if (lower.contains("linux")) return "Linux";
        return "Sistema desconocido";
    }

    private static String version(String ua, String expression) {
        Matcher matcher = Pattern.compile(expression, Pattern.CASE_INSENSITIVE).matcher(ua);
        return matcher.find() ? matcher.group(1) : "";
    }

    private static String suffix(String version) {
        return version == null || version.isBlank() ? "" : " " + version;
    }
}
