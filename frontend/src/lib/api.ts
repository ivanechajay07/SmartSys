import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuth, type SessionUser } from '@/store/auth';
import type { AuthResponse, LoginResponse, MfaChallenge } from '@/types';
import { isMfaChallenge } from '@/types';

export const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const cookieOptions = {
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  withXSRFToken: true,
};

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  ...cookieOptions,
});

/** Cliente sin interceptores para login, CSRF y refresh (evita bucles de 401). */
const rawApi = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  ...cookieOptions,
});

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

export async function ensureCsrfToken(): Promise<void> {
  await rawApi.get('/auth/csrf', {
    params: { t: Date.now() },
    headers: { 'Cache-Control': 'no-cache' },
  });
}

async function refreshAccessToken(): Promise<string> {
  const { data } = await rawApi.post<AuthResponse>('/auth/refresh');
  useAuth.getState().setSession(data.token, toSessionUser(data));
  return data.token;
}

export async function bootstrapSession(): Promise<boolean> {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('smartsys-auth');
  }
  try {
    await ensureCsrfToken();
    await refreshAccessToken();
    return true;
  } catch {
    useAuth.getState().logout();
    return false;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newToken = await refreshPromise;
        refreshPromise = null;
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${newToken}` };
        return api(original);
      } catch (refreshError) {
        refreshPromise = null;
        useAuth.getState().logout();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.assign('/login?expired=1');
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export interface LoginPayload {
  email: string;
  password: string;
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await rawApi.post<LoginResponse>('/auth/login', payload);
  await ensureCsrfToken().catch(() => undefined);
  return data;
}

export async function verifyMfaRequest(mfaToken: string, code: string): Promise<AuthResponse> {
  await ensureCsrfToken();
  const { data } = await rawApi.post<AuthResponse>('/auth/mfa/verify', { mfaToken, code });
  return data;
}

export function toSessionUser(auth: AuthResponse): SessionUser {
  return {
    id: auth.id,
    email: auth.email,
    nombre: auth.nombre,
    rol: auth.rol,
    telefono: auth.telefono,
    avatarUrl: auth.avatarUrl,
  };
}

export async function logoutRequest(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // El cierre de sesión local siempre debe completarse.
  }
}

export interface LoginAttemptInfo {
  intentosFallidos?: number;
  intentosRestantes?: number;
  bloqueado?: boolean;
  bloqueadoHasta?: string;
  segundosParaDesbloqueo?: number;
}

export function loginAttemptInfo(error: unknown): LoginAttemptInfo | null {
  if (!axios.isAxiosError(error)) return null;
  const data = error.response?.data as Record<string, unknown> | undefined;
  if (!data) return null;
  const hasAttemptData =
    typeof data.intentosRestantes === 'number' ||
    typeof data.segundosParaDesbloqueo === 'number' ||
    data.bloqueado === true;
  if (!hasAttemptData) return null;
  return {
    intentosFallidos: typeof data.intentosFallidos === 'number' ? data.intentosFallidos : undefined,
    intentosRestantes: typeof data.intentosRestantes === 'number' ? data.intentosRestantes : undefined,
    bloqueado: data.bloqueado === true,
    bloqueadoHasta: typeof data.bloqueadoHasta === 'string' ? data.bloqueadoHasta : undefined,
    segundosParaDesbloqueo: typeof data.segundosParaDesbloqueo === 'number'
      ? data.segundosParaDesbloqueo
      : undefined,
  };
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; message?: string; error?: string } | undefined;
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (error.code === 'ECONNABORTED') return 'La operación tardó demasiado. Intente nuevamente.';
    if (!error.response) return 'No se pudo conectar con el servidor.';
    return `Error ${error.response.status}. Intente nuevamente.`;
  }
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

export async function downloadReport(
  key: string,
  format: 'csv' | 'xlsx' | 'pdf',
  desde?: string,
  hasta?: string,
): Promise<void> {
  const response = await api.get(`/reports/${key}`, {
    params: { format, desde, hasta },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `smartsys-${key}-${new Date().toISOString().slice(0, 10)}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export type { MfaChallenge };
export { isMfaChallenge };
