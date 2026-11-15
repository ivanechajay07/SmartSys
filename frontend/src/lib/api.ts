import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuth, type SessionUser } from '@/store/auth';
import type { AuthResponse } from '@/types';

export const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

/** Cliente sin interceptores para login/refresh (evita bucles de 401). */
const rawApi = axios.create({ baseURL: API_BASE, timeout: 30_000 });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = useAuth.getState().refreshToken;
  if (!refreshToken) {
    throw new Error('No hay refresh token');
  }
  const { data } = await rawApi.post<AuthResponse>('/auth/refresh', { refreshToken });
  useAuth.getState().setTokens(data.token, data.refreshToken);
  return data.token;
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

export async function loginRequest(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await rawApi.post<AuthResponse>('/auth/login', payload);
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

export async function logoutRequest(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return;
  try {
    await rawApi.post('/auth/logout', { refreshToken });
  } catch {
    // El cierre de sesion local siempre debe completarse.
  }
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; message?: string; error?: string } | undefined;
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (error.code === 'ECONNABORTED') return 'La operación tardo demasiado. Intente nuevamente.';
    if (!error.response) return 'No se pudo conectar con el servidor.';
    return `Error ${error.response.status}. Intente nuevamente.`;
  }
  if (error instanceof Error) return error.message;
  return 'Ocurrio un error inesperado.';
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
