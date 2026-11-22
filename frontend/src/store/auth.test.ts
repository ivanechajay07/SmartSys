import { describe, expect, it } from 'vitest';
import { useAuth } from '@/store/auth';

const session = {
  id: 1,
  email: 'admin@smartsys.local',
  nombre: 'Admin SmartSys',
  rol: 'ADMINISTRADOR' as const,
};

describe('auth store', () => {
  it('stores and clears the session', () => {
    useAuth.getState().setSession('access-token', session);

    expect(useAuth.getState().token).toBe('access-token');
    expect(useAuth.getState().user?.email).toBe(session.email);
    expect(useAuth.getState().hasRole('ADMINISTRADOR')).toBe(true);
    expect(useAuth.getState().hasRole('TRANSPORTISTA')).toBe(false);

    useAuth.getState().logout();
    expect(useAuth.getState().token).toBeNull();
    expect(useAuth.getState().user).toBeNull();
  });

  it('rotates the access token without changing the user', () => {
    useAuth.getState().setSession('old-access', session);
    useAuth.getState().setToken('new-access');

    expect(useAuth.getState().token).toBe('new-access');
    expect(useAuth.getState().user?.id).toBe(1);
  });
});
