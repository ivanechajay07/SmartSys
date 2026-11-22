import { useEffect, useMemo, useState } from 'react';
import { Check, LayoutGrid, ShieldCheck } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { PermisoModulo, RolSistema } from '@/types';
import { Button, ErrorAlert, Modal, Spinner } from '@/components/ui';
import '@/styles/permissions.css';

const PERMISSION_KEYS = [
  { key: 'ver', label: 'Ver' },
  { key: 'crear', label: 'Crear' },
  { key: 'editar', label: 'Editar' },
  { key: 'eliminar', label: 'Eliminar' },
] as const;

export function PermisosRolModal({
  role,
  onClose,
  onSaved,
}: {
  role: RolSistema | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const setPermisos = useAuth((state) => state.setPermisos);
  const [rows, setRows] = useState<PermisoModulo[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!role) return;
    setLoading(true);
    setError(null);
    api.get<PermisoModulo[]>(`/roles/${role.id}/permissions`)
      .then((response) => setRows(response.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [role]);

  const toggle = (modulo: string, key: 'ver' | 'crear' | 'editar' | 'eliminar') => {
    setRows((current) => current.map((row) => (
      row.modulo === modulo ? { ...row, [key]: !row[key] } : row
    )));
  };

  const activeCount = useMemo(
    () => rows.reduce((total, row) => total + PERMISSION_KEYS.filter(({ key }) => row[key]).length, 0),
    [rows],
  );

  const fullModules = useMemo(
    () => rows.filter((row) => PERMISSION_KEYS.every(({ key }) => row[key])).length,
    [rows],
  );

  const toggleColumn = (key: 'ver' | 'crear' | 'editar' | 'eliminar') => {
    const enabled = rows.length > 0 && rows.every((row) => row[key] || bloqueadoAdmin(row.modulo, key));
    setRows((current) => current.map((row) => (
      bloqueadoAdmin(row.modulo, key) ? row : { ...row, [key]: !enabled }
    )));
  };

  const columnEnabled = (key: 'ver' | 'crear' | 'editar' | 'eliminar') =>
    rows.length > 0 && rows.every((row) => row[key] || bloqueadoAdmin(row.modulo, key));

  const save = async () => {
    if (!role) return;
    setBusy(true);
    setError(null);
    try {
      await api.put(`/roles/${role.id}/permissions`, rows.map((row) => ({
        modulo: row.modulo,
        ver: row.ver,
        crear: row.crear,
        editar: row.editar,
        eliminar: row.eliminar,
      })));
      const mine = await api.get<PermisoModulo[]>('/auth/permissions');
      setPermisos(mine.data);
      onSaved('Permisos del rol actualizados.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const bloqueadoAdmin = (modulo: string, key: string) =>
    role?.nombre === 'ADMINISTRADOR'
    && modulo === 'USUARIOS'
    && (key === 'ver' || key === 'editar');

  return (
    <Modal
      open={Boolean(role)}
      title={`Permisos · ${role?.nombre ?? ''}`}
      subtitle="Defina qué puede ver, crear, editar y eliminar este rol en cada módulo."
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={loading || Boolean(error)} onClick={save}>
            Guardar permisos
          </Button>
        </>
      }
    >
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <div className="permissions-shell">
          <div className="permissions-summary" aria-live="polite">
            <span className="permissions-summary-pill">
              <LayoutGrid className="h-3.5 w-3.5" />
              {rows.length} módulos
            </span>
            <span className="permissions-summary-pill is-brand">
              <ShieldCheck className="h-3.5 w-3.5" />
              {activeCount} permisos activos
            </span>
            <span className="permissions-summary-note">
              {fullModules} de {rows.length} módulos con acceso completo
            </span>
          </div>

          <div className="permissions-table-wrap">
            <table className="table permissions-table">
              <colgroup>
                <col style={{ width: '46%' }} />
                {PERMISSION_KEYS.map(({ key }) => <col key={key} style={{ width: '13.5%' }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th>Módulo</th>
                  {PERMISSION_KEYS.map(({ key, label }) => (
                    <th key={key} className="permissions-action-head">
                      <label className="permissions-select-all">
                        <input
                          type="checkbox"
                          checked={columnEnabled(key)}
                          onChange={() => toggleColumn(key)}
                          aria-label={`${columnEnabled(key) ? 'Quitar' : 'Activar'} ${label.toLowerCase()} en todos los módulos`}
                        />
                        <span className="permissions-select-box" aria-hidden>
                          {columnEnabled(key) && <Check className="h-3 w-3" />}
                        </span>
                        {label}
                      </label>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.modulo}>
                    <td>
                      <div className="permissions-module">
                        <span className="permissions-module-icon">
                          <ShieldCheck className="h-4 w-4" />
                        </span>
                        <div className="permissions-module-copy">
                          <p>{row.label}</p>
                          <small>{row.descripcion}</small>
                        </div>
                      </div>
                    </td>
                    {PERMISSION_KEYS.map(({ key, label }) => {
                      const locked = bloqueadoAdmin(row.modulo, key);
                      return (
                        <td key={key} className="permissions-action-cell">
                          <label
                            className="permissions-check"
                            title={locked ? 'El rol Administrador debe conservar acceso a Usuarios' : undefined}
                          >
                            <input
                              type="checkbox"
                              checked={row[key]}
                              disabled={locked}
                              aria-label={`${row.label}: ${label}`}
                              onChange={() => toggle(row.modulo, key)}
                            />
                            <span className="permissions-check-box" aria-hidden>
                              {row[key] && <Check className="h-3.5 w-3.5" />}
                            </span>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="permissions-mobile-list">
            {rows.map((row) => (
              <article key={row.modulo} className="permissions-mobile-card">
                <header>
                  <span className="permissions-module-icon">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <p>{row.label}</p>
                    <small>{row.descripcion}</small>
                  </div>
                </header>
                <div className="permissions-mobile-grid">
                  {PERMISSION_KEYS.map(({ key, label }) => {
                    const locked = bloqueadoAdmin(row.modulo, key);
                    return (
                      <label key={key} className="permissions-mobile-option">
                        <span>{label}</span>
                        <span className="permissions-check" title={locked ? 'El rol Administrador debe conservar acceso a Usuarios' : undefined}>
                          <input
                            type="checkbox"
                            checked={row[key]}
                            disabled={locked}
                            aria-label={`${row.label}: ${label}`}
                            onChange={() => toggle(row.modulo, key)}
                          />
                          <span className="permissions-check-box" aria-hidden>
                            {row[key] && <Check className="h-3.5 w-3.5" />}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
