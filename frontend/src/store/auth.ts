import { create } from 'zustand';
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
  user: SessionUser | null;
  permisos: Record<string, PermisoModulo> | null;
  setSession: (token: string, user: SessionUser) => void;
  setToken: (token: string) => void;
  setPermisos: (items: PermisoModulo[]) => void;
  updateUser: (patch: Partial<SessionUser>) => void;
  logout: () => void;
  hasRole: (...roles: Rol[]) => boolean;
  can: (modulo: string, accion: AccionPermiso) => boolean;
}

export const useAuth = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  permisos: null,
  setSession: (token, user) => set({ token, user, permisos: null }),
  setToken: (token) => set({ token }),
  setPermisos: (items) => set({
    permisos: Object.fromEntries(items.map((item) => [item.modulo, item])),
  }),
  updateUser: (patch) =>
    set((state) => ({ user: state.user ? { ...state.user, ...patch } : state.user })),
  logout: () => set({ token: null, user: null, permisos: null }),
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
}));

export const ROLE_LABELS: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE_GENERAL: 'Gerente general',
  JEFE_LOGISTICA: 'Jefe de logística',
  ENCARGADO_ALMACEN: 'Encargado de almacén',
  PERSONAL_OPERATIVO: 'Personal operativo',
  PERSONAL_LOGISTICA: 'Personal de logística',
  RESPONSABLE_DISTRIBUCION: 'Responsable de distribución',
  TRANSPORTISTA: 'Transportista',
};
