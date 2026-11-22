import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  Camera,
  CheckCircle2,
  MapPin,
  Navigation,
  PackageCheck,
  Play,
  RefreshCw,
  Route,
  Smartphone,
  Truck,
  UserRound,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { toastSuccess } from '@/lib/toasts';
import { formatDate, formatNumber, formatQuantity } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import type { Despacho } from '@/types';
import { Badge, Button, Card, EmptyState, ErrorAlert, Spinner, StatusBadge } from '@/components/ui';
import { ModuleChips, ModuleHero, ModuleKpi } from '@/components/module';
import '@/styles/modules.css';

type GpsState = 'idle' | 'ok' | 'denied';

function obtenerUbicacion(): Promise<{ latitud: number; longitud: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitud: position.coords.latitude,
        longitud: position.coords.longitude,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 },
    );
  });
}

export default function PaginaRutaMovil() {
  const can = useAuth((state) => state.can);
  const canOperate = can('DESPACHOS', 'editar') || can('RUTA_MOVIL', 'editar');
  const [showAll, setShowAll] = useState(false);
  const [gps, setGps] = useState<GpsState>('idle');
  const assignments = useApiQuery<Despacho[]>(
    () => api.get('/mobile/assignments', { params: { incluirFinalizadas: showAll } }).then((r) => r.data),
    [showAll],
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const data = useMemo(() => assignments.data ?? [], [assignments.data]);
  const prepared = data.filter((item) => item.estado === 'PREPARADO').length;
  const onRoute = data.filter((item) => item.estado === 'EN_RUTA').length;
  const units = data.reduce(
    (sum, item) =>
      sum + item.detalles.reduce((inner, det) => inner + Number(det.cantidadComprometida), 0),
    0,
  );

  const run = async (id: number, path: string, message: string) => {
    setBusyId(id);
    setError(null);
    try {
      const coords = await obtenerUbicacion();
      setGps(coords ? 'ok' : 'denied');
      await api.post(`/dispatches/${id}${path}`, coords ?? undefined);
      const mensaje = coords ? `${message} Ubicación GPS registrada.` : `${message} Sin GPS disponible.`;
      toastSuccess(mensaje);
      assignments.reload();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const probarGps = async () => {
    const coords = await obtenerUbicacion();
    setGps(coords ? 'ok' : 'denied');
  };

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Operación en campo"
        title="Ruta móvil"
        description="Asignaciones activas del transportista y registro de hitos desde el punto de entrega. Interfaz optimizada para uso en teléfono durante la ruta."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={probarGps}
              className={clsx(
                'mod-hero-button-soft',
                gps === 'ok' && 'text-emerald-700',
                gps === 'denied' && 'text-amber-700',
              )}
            >
              <MapPin className="h-3.5 w-3.5" />
              {gps === 'ok' ? 'GPS activo' : gps === 'denied' ? 'GPS no disponible' : 'Probar GPS'}
            </button>
            <button
              type="button"
              onClick={assignments.reload}
              className="mod-hero-button-soft"
              disabled={assignments.loading}
            >
              <RefreshCw className={clsx('h-3.5 w-3.5', assignments.loading && 'animate-spin')} /> Actualizar
            </button>
          </div>
        }
      />

      {error && <ErrorAlert message={error} />}

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <ModuleKpi
          label="Asignaciones"
          value={formatNumber(data.length)}
          hint={showAll ? 'Incluye finalizadas' : 'Solo activas'}
          icon={<Smartphone className="h-5 w-5" />}
          tone="brand"
          delay="mod-reveal-1"
        />
        <ModuleKpi
          label="Preparadas"
          value={formatNumber(prepared)}
          hint="Pendientes de salida"
          icon={<PackageCheck className="h-5 w-5" />}
          tone="amber"
          delay="mod-reveal-2"
        />
        <ModuleKpi
          label="En ruta"
          value={formatNumber(onRoute)}
          hint="Viajes en ejecución"
          icon={<Route className="h-5 w-5" />}
          tone="sky"
          delay="mod-reveal-3"
        />
        <ModuleKpi
          label="Unidades a entregar"
          value={formatQuantity(units)}
          hint="Carga comprometida"
          icon={<Truck className="h-5 w-5" />}
          tone="indigo"
          delay="mod-reveal-4"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModuleChips
          filters={[
            { value: 'ACTIVE', label: 'Activas' },
            { value: 'ALL', label: 'Todas' },
          ]}
          value={showAll ? 'ALL' : 'ACTIVE'}
          onChange={(value) => setShowAll(value === 'ALL')}
          ariaLabel="Filtrar asignaciones"
        />
        <span className="text-xs text-slate-500">
          {showAll
            ? 'Incluye entregas finalizadas y canceladas.'
            : 'Solo despachos pendientes o en ruta.'}
        </span>
      </div>

      {assignments.loading && !assignments.data ? (
        <Spinner />
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin asignaciones activas"
            description={showAll
              ? 'No hay asignaciones registradas para su usuario.'
              : 'Cuando la jefatura asigne un despacho activo a su usuario, aparecerá en esta bandeja.'}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((item) => {
            const busy = busyId === item.id;
            const onRouteItem = item.estado === 'EN_RUTA';
            const delivered = item.estado === 'ENTREGADO' || item.estado === 'ENTREGADO_PARCIAL';
            const stageLabel = delivered ? 'Entrega registrada' : onRouteItem ? 'En ruta' : 'Listo para salir';
            const visible = item.detalles.slice(0, 4);
            return (
              <article key={item.id} className="mod-card mod-reveal">
                <div>
                  <div className="mod-card-top">
                    <span className="mod-code">{item.codigo}</span>
                    <StatusBadge estado={item.estado} />
                  </div>
                  <p className="mod-card-title">{item.entidad.razonSocial}</p>
                  <p className="mod-card-sub">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {item.puntoEntrega.nombre}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.puntoEntrega.direccion ?? 'Sin dirección registrada'}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone="blue">
                      <Truck className="h-3 w-3" /> {item.vehiculo?.placa ?? 'Vehículo pendiente'}
                    </Badge>
                    <Badge tone="brand">
                      <Smartphone className="h-3 w-3" /> {item.detalles.length} productos
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      <span className={onRouteItem ? 'text-amber-600' : 'text-brand-700'}>{stageLabel}</span>
                      <span>Entrega</span>
                    </div>
                    <div className="mod-steps" aria-hidden>
                      <span
                        className={clsx(
                          'mod-step',
                          !onRouteItem && !delivered && 'is-current',
                          (onRouteItem || delivered) && 'is-done',
                        )}
                      />
                      <span
                        className={clsx(
                          'mod-step',
                          onRouteItem && 'is-current',
                          delivered && 'is-done',
                        )}
                      />
                      <span className={clsx('mod-step', delivered && 'is-done')} />
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <p className="flex items-start gap-2 font-medium">
                      <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                      {item.puntoEntrega.responsable ?? 'Contacto no registrado'}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {item.puntoEntrega.telefono ? `${item.puntoEntrega.telefono} · ` : ''}
                      Entrega {formatDate(item.fecha)}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mod-card-metrics">
                    <div>
                      <span>Carga</span>
                      <strong>{formatQuantity(item.detalles.reduce((sum, det) => sum + Number(det.cantidadComprometida), 0))}</strong>
                    </div>
                    <div>
                      <span>Guía</span>
                      <strong className="text-xs">{item.numeroGuia ?? '-'}</strong>
                    </div>
                  </div>

                  <ul className="mod-list mt-2">
                    {visible.map((det) => (
                      <li key={det.id} className="mod-list-item">
                        <span className="flex-1 truncate text-xs text-slate-600">{det.producto.nombre}</span>
                        <span className="whitespace-nowrap text-xs font-bold text-slate-800">
                          {formatQuantity(det.cantidadComprometida)} {det.producto.unidadMedida}
                        </span>
                      </li>
                    ))}
                    {item.detalles.length > visible.length && (
                      <li className="pt-2 text-[11px] font-semibold text-slate-400">
                        +{item.detalles.length - visible.length} productos más
                      </li>
                    )}
                  </ul>

                  <div className="flex flex-col gap-2 pt-3">
                    {canOperate && item.estado === 'PREPARADO' && (
                      <>
                        <Button
                          className="w-full"
                          variant="secondary"
                          loading={busy}
                          onClick={() => run(item.id, '/transport-receipt', 'Recepción de carga confirmada.')}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Confirmar carga recibida
                        </Button>
                        <Button
                          className="w-full"
                          loading={busy}
                          onClick={() => run(item.id, '/depart', 'Salida registrada.')}
                        >
                          <Play className="h-4 w-4" /> Iniciar ruta
                        </Button>
                      </>
                    )}
                    {canOperate && item.estado === 'EN_RUTA' && (
                      <Button
                        className="w-full"
                        variant="secondary"
                        loading={busy}
                        onClick={() => run(item.id, '/arrive', 'Llegada registrada.')}
                      >
                        <Navigation className="h-4 w-4" /> Registrar llegada
                      </Button>
                    )}
                    {canOperate && (
                      <Link to={`/despachos/${item.id}`} className="btn btn-soft w-full">
                        <Camera className="h-4 w-4" /> Registrar entrega y evidencia
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
