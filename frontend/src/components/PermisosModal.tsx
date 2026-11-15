import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { PermisoModulo, RolSistema } from '@/types';
import { Button, ErrorAlert, Modal, Spinner } from '@/components/ui';

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
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Módulo</th>
                <th className="text-center">Ver</th>
                <th className="text-center">Crear</th>
                <th className="text-center">Editar</th>
                <th className="text-center">Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.modulo}>
                  <td>
                    <p className="text-sm font-semibold text-slate-800">{row.label}</p>
                    <p className="text-xs text-slate-400">{row.descripcion}</p>
                  </td>
                  {(['ver', 'crear', 'editar', 'eliminar'] as const).map((key) => (
                    <td key={key} className="text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        checked={row[key]}
                        disabled={bloqueadoAdmin(row.modulo, key)}
                        title={bloqueadoAdmin(row.modulo, key)
                          ? 'El rol Administrador debe conservar acceso a Usuarios'
                          : undefined}
                        onChange={() => toggle(row.modulo, key)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
