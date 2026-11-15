import { useApiQuery } from '@/lib/hooks';
import { api } from '@/lib/api';
import type {
  Contrato,
  EntidadPublica,
  Producto,
  PuntoEntrega,
  UserOption,
  Vehiculo,
} from '@/types';

export function useMasterCatalogs() {
  const entities = useApiQuery<EntidadPublica[]>(() => api.get('/entities').then((r) => r.data));
  const products = useApiQuery<Producto[]>(() => api.get('/products').then((r) => r.data));
  const contracts = useApiQuery<Contrato[]>(() => api.get('/contracts').then((r) => r.data));
  const vehicles = useApiQuery<Vehiculo[]>(() => api.get('/vehicles').then((r) => r.data));
  return { entities, products, contracts, vehicles };
}

export async function fetchPoints(entityId: number): Promise<PuntoEntrega[]> {
  const { data } = await api.get<PuntoEntrega[]>(`/entities/${entityId}/points`);
  return data;
}

export async function fetchUsers(rol?: string): Promise<UserOption[]> {
  const { data } = await api.get<UserOption[]>('/users/options', { params: rol ? { rol } : undefined });
  return data;
}
