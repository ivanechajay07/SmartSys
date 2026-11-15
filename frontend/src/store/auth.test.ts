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
    useAuth.getState().setSession('access-token', 'refresh-token', session);

    expect(useAuth.getState().token).toBe('access-token');
    expect(useAuth.getState().refreshToken).toBe('refresh-token');
    expect(useAuth.getState().user?.email).toBe(session.email);
    expect(useAuth.getState().hasRole('ADMINISTRADOR')).toBe(true);
    expect(useAuth.getState().hasRole('TRANSPORTISTA')).toBe(false);

    useAuth.getState().logout();
    expect(useAuth.getState().token).toBeNull();
    expect(useAuth.getState().user).toBeNull();
  });

  it('rotates access and refresh tokens without changing the user', () => {
    useAuth.getState().setSession('old-access', 'old-refresh', session);
    useAuth.getState().setTokens('new-access', 'new-refresh');

    expect(useAuth.getState().token).toBe('new-access');
    expect(useAuth.getState().refreshToken).toBe('new-refresh');
    expect(useAuth.getState().user?.id).toBe(1);
  });
});
