import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AccionPermiso, PermisoModulo, Rol } from '@/types';

export interface SessionUser {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  telefono?: string;
  avatarUrl?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  permisos: Record<string, PermisoModulo> | null;
  setSession: (token: string, refreshToken: string, user: SessionUser) => void;
  setTokens: (token: string, refreshToken: string) => void;
  setPermisos: (items: PermisoModulo[]) => void;
  updateUser: (patch: Partial<SessionUser>) => void;
  logout: () => void;
  hasRole: (...roles: Rol[]) => boolean;
  can: (modulo: string, accion: AccionPermiso) => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      permisos: null,
      setSession: (token, refreshToken, user) => set({ token, refreshToken, user, permisos: null }),
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      setPermisos: (items) => set({
        permisos: Object.fromEntries(items.map((item) => [item.modulo, item])),
      }),
      updateUser: (patch) =>
        set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
      logout: () => set({ token: null, refreshToken: null, user: null, permisos: null }),
      hasRole: (...roles) => {
        const role = get().user?.rol;
        return role != null && roles.includes(role);
      },
      can: (modulo, accion) => {
        const permiso = get().permisos?.[modulo];
        if (!permiso) return false;
        return accion === 'ver' ? permiso.ver
          : accion === 'crear' ? permiso.crear
          : accion === 'editar' ? permiso.editar
          : permiso.eliminar;
      },
    }),
    { name: 'smartsys-auth' },
  ),
);

export const ROLE_LABELS: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE_GENERAL: 'Gerente general',
  JEFE_LOGISTICA: 'Jefe de logística',
  ENCARGADO_ALMACEN: 'Encargado de almacén',
  PERSONAL_OPERATIVO: 'Personal operativo',
  PERSONAL_LOGISTICA: 'Personal de logística',
  RESPONSABLE_DISTRIBUCION: 'Responsable de distribucion',
  TRANSPORTISTA: 'Transportista',
};
