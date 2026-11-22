import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Eraser,
  ExternalLink,
  FileText,
  Link2,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  PenLine,
  Play,
  Printer,
  RefreshCw,
  Send,
  Truck,
  UploadCloud,
  UserRound,
  Wrench,
  XCircle,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { EMPRESA } from '@/lib/empresa';
import { toastError, toastSuccess } from '@/lib/toasts';
import { SortableTh, useTableSort } from '@/components/sortable';
import { fetchUsers } from '@/lib/catalogs';
import { formatDate, formatDateTime, formatQuantity, stateLabel, safeUrl } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks';
import { useAuth } from '@/store/auth';
import type {
  Despacho,
  DetalleDespacho,
  Evidencia,
  EventoSeguimiento,
  FirmaHojaRuta,
  IncidenciaDespacho,
  Recepcion,
  RouteSheet,
  TipoFirmaHojaRuta,
  UserOption,
  Vehiculo,
} from '@/types';
import {
  Badge,
  Button,
  Card,
  DetailRow,
  EmptyState,
  ErrorAlert,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { ModuleHero, ModuleKpi, ModuleProgress } from '@/components/module';
import { FormGrid, FormHero, FormNote, FormSection, FormStats, FormTag } from '@/components/FormKit';
import '@/styles/modules.css';
import '@/styles/dispatch.css';
import '@/styles/dispatch-modals.css';

type ModalKind = 'prepare' | 'assign' | 'deliver' | 'cancel' | 'incident' | 'evidence' | 'reception' | 'route' | null;

export default function PaginaDetalleDespacho() {
  const { id } = useParams();
  const dispatchId = Number(id);
  const navigate = useNavigate();
  const can = useAuth((state) => state.can);
  const canManage = can('DESPACHOS', 'editar');
  const canWarehouse = can('DESPACHOS', 'editar');
  const canAssign = can('DESPACHOS', 'editar');
  const canTransport = can('DESPACHOS', 'editar');
  const canReception = can('RECEPCIONES', 'crear');

  const dispatch = useApiQuery<Despacho>(() => api.get(`/dispatches/${dispatchId}`).then((r) => r.data), [dispatchId]);
  const events = useApiQuery<EventoSeguimiento[]>(
    () => api.get(`/dispatches/${dispatchId}/events`).then((r) => r.data),
    [dispatchId],
  );
  const incidents = useApiQuery<IncidenciaDespacho[]>(
    () => api.get(`/dispatches/${dispatchId}/incidents`).then((r) => r.data),
    [dispatchId],
  );
  const evidence = useApiQuery<Evidencia[]>(
    () => api.get(`/dispatches/${dispatchId}/evidence`).then((r) => r.data),
    [dispatchId],
  );
  const receptions = useApiQuery<Recepcion[]>(
    () => api.get(`/dispatches/${dispatchId}/receptions`).then((r) => r.data),
    [dispatchId],
  );
  const users = useApiQuery<UserOption[]>(() => fetchUsers(), []);
  const vehicles = useApiQuery<Vehiculo[]>(() => api.get('/vehicles').then((r) => r.data), []);

  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = () => {
    dispatch.reload();
    events.reload();
    incidents.reload();
    evidence.reload();
    receptions.reload();
  };

  const runAction = async (path: string, body?: unknown, message = 'Operación registrada.') => {
    setBusy(true);
    setActionError(null);
    try {
      await api.post(`/dispatches/${dispatchId}${path}`, body);
      setModal(null);
      toastSuccess(message);
      refresh();
    } catch (error) {
      setActionError(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const uploadEvidence = async (file: File, tipo: string, observaciones: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('tipo', tipo);
      if (observaciones) form.append('observaciones', observaciones);
      await api.post(`/dispatches/${dispatchId}/evidence/upload`, form);
      setModal(null);
      toastSuccess('Evidencia adjuntada.');
      refresh();
    } catch (error) {
      setActionError(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const openEvidence = async (item: Evidencia) => {
    if (!item.url.startsWith('/dispatches/')) {
      const safe = safeUrl(item.url);
      if (safe) window.open(safe, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const response = await api.get(item.url, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(response.data as Blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      setActionError(apiErrorMessage(error));
    }
  };

  const materialSort = useTableSort(dispatch.data?.detalles ?? [], {
    producto: (det) => det.producto.nombre,
    comprometido: (det) => Number(det.cantidadComprometida),
    preparado: (det) => Number(det.cantidadPreparada),
    despachado: (det) => Number(det.cantidadDespachada),
    reserva: (det) => det.reservaId ?? 0,
  });

  if (dispatch.loading && !dispatch.data) return <Spinner label="Cargando despacho..." />;
  if (dispatch.error) return <ErrorAlert message={dispatch.error} onRetry={dispatch.reload} />;
  if (!dispatch.data) return <ErrorAlert message="Despacho no encontrado." />;

  const data = dispatch.data;
  const state = data.estado;
  const assigned = Boolean(data.transportista);

  const committed = data.detalles.reduce((sum, det) => sum + Number(det.cantidadComprometida), 0);
  const prepared = data.detalles.reduce((sum, det) => sum + Number(det.cantidadPreparada), 0);
  const dispatched = data.detalles.reduce((sum, det) => sum + Number(det.cantidadDespachada), 0);
  const progress = committed > 0 ? Math.round((dispatched / committed) * 100) : 0;
  const totals = { committed, prepared, dispatched, progress };

  const openIncidents = (incidents.data ?? []).filter((item) => item.estado === 'ABIERTA').length;
  const steps = [
    { key: 'BORRADOR', label: 'Borrador', hint: 'Creado', Icon: FileText },
    { key: 'PREPARADO', label: 'Preparado', hint: 'Almacén', Icon: PackageCheck },
    { key: 'EN_RUTA', label: 'En ruta', hint: 'Distribución', Icon: Truck },
    { key: 'ENTREGADO', label: 'Entregado', hint: 'Punto de entrega', Icon: CheckCircle2 },
  ];
  const order = ['BORRADOR', 'PREPARADO', 'EN_RUTA', 'ENTREGADO', 'ENTREGADO_PARCIAL'];
  const currentIndex = state === 'ENTREGADO_PARCIAL' ? 3 : order.indexOf(state);
  const isFinal = ['ENTREGADO', 'ENTREGADO_PARCIAL', 'CANCELADO'].includes(state);

  const eventIcon = (tipo: string) => {
    const key = tipo.toLowerCase();
    if (key.includes('prepar')) return PackageCheck;
    if (key.includes('asign') || key.includes('salida')) return Truck;
    if (key.includes('recepcion')) return Package;
    if (key.includes('llegada')) return Navigation;
    if (key.includes('entrega')) return Send;
    if (key.includes('incid')) return AlertTriangle;
    return Clock;
  };

  return (
    <div className="mod-page">
      <ModuleHero
        eyebrow="Trazabilidad de despacho"
        title={data.codigo}
        description={`${data.entidad.razonSocial} · ${data.puntoEntrega.nombre} · ${formatDate(data.fecha)}. Ciclo completo de preparación, transporte, entrega y recepción.`}
        actions={
          <>
            <button type="button" className="mod-hero-button-soft" onClick={() => navigate('/despachos')}>
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </button>
            <button type="button" className="mod-hero-button-soft" onClick={refresh} disabled={dispatch.loading}>
              <RefreshCw className={clsx('h-3.5 w-3.5', dispatch.loading && 'animate-spin')} /> Actualizar
            </button>
            <button type="button" className="mod-hero-button" onClick={() => setModal('route')}>
              <Printer className="h-3.5 w-3.5" /> Hoja de ruta
            </button>
          </>
        }
      />

      {actionError && <ErrorAlert message={actionError} />}

      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <ModuleKpi
          label="Comprometido"
          value={formatQuantity(totals.committed)}
          hint={`${data.detalles.length} productos en el despacho`}
          icon={<Package className="h-5 w-5" />}
          tone="brand"
          delay="mod-reveal-1"
        />
        <ModuleKpi
          label="Despachado"
          value={formatQuantity(totals.dispatched)}
          hint={`${formatQuantity(totals.prepared)} preparados en almacén`}
          icon={<Truck className="h-5 w-5" />}
          tone="sky"
          delay="mod-reveal-2"
        />
        <ModuleKpi
          label="Avance de entrega"
          value={`${totals.progress}%`}
          hint="Sobre la cantidad comprometida"
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="indigo"
          delay="mod-reveal-3"
        />
        <ModuleKpi
          label="Novedades"
          value={openIncidents}
          hint={`${incidents.data?.length ?? 0} incidencias · ${evidence.data?.length ?? 0} evidencias`}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={openIncidents > 0 ? 'rose' : 'amber'}
          delay="mod-reveal-4"
        />
      </div>

      <section className="dispatch-stepper-card mod-reveal mod-reveal-2">
        <div className="dispatch-stepper-head">
          <div>
            <p className="dispatch-stepper-eyebrow">Flujo logístico</p>
            <h2>Estado del despacho</h2>
            <p>
              {state === 'CANCELADO'
                ? 'El despacho fue cancelado y sus reservas liberadas.'
                : isFinal
                  ? 'El ciclo operativo está cerrado. Revisa la trazabilidad y las recepciones.'
                  : 'La etapa resaltada indica el siguiente hito operativo.'}
            </p>
          </div>
          <StatusBadge estado={state} />
        </div>

        <div className="dispatch-stepper">
          {steps.map((step, index) => {
            const done = state !== 'CANCELADO' && currentIndex >= index;
            const current = state !== 'CANCELADO' && currentIndex === index;
            const StepIcon = step.Icon;
            return (
              <div
                key={step.key}
                className={clsx('dispatch-step', done && 'is-done', current && 'is-current')}
              >
                <span className="dispatch-step-icon">
                  <StepIcon className="h-4 w-4" />
                </span>
                <div className="dispatch-step-copy">
                  <p>{step.label}</p>
                  <span>{step.hint}</span>
                </div>
                {index < steps.length - 1 && <i className="dispatch-step-line" aria-hidden />}
              </div>
            );
          })}
        </div>

        <div className="dispatch-stepper-progress">
          <span>Avance de entrega</span>
          <ModuleProgress value={totals.progress} />
          <strong>{totals.progress}%</strong>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="min-w-0 space-y-4 xl:col-span-2">
          <Card className="dispatch-panel mod-reveal mod-reveal-2">
            <div className="dispatch-panel-head">
              <div>
                <p className="dispatch-panel-eyebrow">Materiales</p>
                <h3>Productos del despacho</h3>
                <span>{data.detalles.length} productos comprometidos · {formatQuantity(totals.committed)} unidades</span>
              </div>
              <Badge tone="brand">{formatQuantity(totals.committed)} und</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-pro">
                <thead>
                  <tr>
                    <SortableTh label="Producto" column="producto" sortKey={materialSort.sort?.key ?? null} direction={materialSort.sort?.dir ?? null} onSort={materialSort.toggle} />
                    <SortableTh label="Comprometido" column="comprometido" className="text-right" sortKey={materialSort.sort?.key ?? null} direction={materialSort.sort?.dir ?? null} onSort={materialSort.toggle} />
                    <SortableTh label="Preparado" column="preparado" className="hidden text-right sm:table-cell" sortKey={materialSort.sort?.key ?? null} direction={materialSort.sort?.dir ?? null} onSort={materialSort.toggle} />
                    <SortableTh label="Despachado" column="despachado" className="text-right" sortKey={materialSort.sort?.key ?? null} direction={materialSort.sort?.dir ?? null} onSort={materialSort.toggle} />
                    <th>Avance</th>
                    <SortableTh label="Reserva" column="reserva" className="hidden sm:table-cell" sortKey={materialSort.sort?.key ?? null} direction={materialSort.sort?.dir ?? null} onSort={materialSort.toggle} />
                  </tr>
                </thead>
                <tbody>
                  {materialSort.rows.map((det) => {
                    const itemProgress = Number(det.cantidadComprometida) > 0
                      ? Math.round((Number(det.cantidadDespachada) / Number(det.cantidadComprometida)) * 100)
                      : 0;
                    return (
                      <tr key={det.id}>
                        <td>
                          <p className="font-semibold text-slate-800">{det.producto.nombre}</p>
                          <p className="text-xs text-slate-400">{det.producto.codigo} · {det.producto.unidadMedida}</p>
                        </td>
                        <td className="text-right">{formatQuantity(det.cantidadComprometida)}</td>
                        <td className="hidden text-right sm:table-cell">{formatQuantity(det.cantidadPreparada)}</td>
                        <td className="text-right font-bold text-slate-800">{formatQuantity(det.cantidadDespachada)}</td>
                        <td className="w-[100px] sm:w-auto sm:min-w-[130px]">
                          <div className="flex items-center gap-2">
                            <div className="dispatch-material-bar">
                              <span style={{ width: `${Math.min(100, itemProgress)}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{itemProgress}%</span>
                          </div>
                        </td>
                        <td className="hidden text-xs text-slate-400 sm:table-cell">{det.reservaId ? `#${det.reservaId}` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="dispatch-panel mod-reveal mod-reveal-3">
            <div className="dispatch-panel-head">
              <div>
                <p className="dispatch-panel-eyebrow">Bitácora</p>
                <h3>Trazabilidad del despacho</h3>
                <span>Eventos registrados en orden cronológico</span>
              </div>
              {canTransport && (
                <div className="dispatch-panel-actions">
                  <Button variant="secondary" size="sm" onClick={() => setModal('incident')}>
                    <AlertTriangle className="h-3.5 w-3.5" /> Incidencia
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setModal('evidence')}>
                    <Camera className="h-3.5 w-3.5" /> Evidencia
                  </Button>
                </div>
              )}
            </div>
            <div className="card-body">
              {events.loading && !events.data ? (
                <Spinner />
              ) : events.data && events.data.length > 0 ? (
                <ol className="dispatch-timeline">
                  {events.data.map((event, index) => {
                    const EventIcon = eventIcon(event.tipo);
                    return (
                      <li
                        key={event.id}
                        className={clsx('dispatch-event', index === events.data!.length - 1 && 'is-last')}
                      >
                        <span className="dispatch-event-dot">
                          <EventIcon className="h-3.5 w-3.5" />
                        </span>
                        <div className="dispatch-event-card">
                          <div className="dispatch-event-head">
                            <p>{stateLabel(event.tipo)}</p>
                            <span>{formatDateTime(event.fechaHora)}</span>
                          </div>
                          {event.observaciones && (
                            <p className="dispatch-event-note">{event.observaciones}</p>
                          )}
                          <div className="dispatch-event-meta">
                            <span>{event.usuario.nombres} {event.usuario.apellidos}</span>
                            {event.latitud != null && (
                              <span className="dispatch-event-chip">
                                <MapPin className="h-3 w-3" /> {event.latitud}, {event.longitud}
                              </span>
                            )}
                            {event.evidenciaUrl && (
                              <span className="dispatch-event-chip is-brand">
                                <Camera className="h-3 w-3" /> Evidencia adjunta
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <EmptyState title="Sin eventos" description="Aún no se registraron movimientos de este despacho." />
              )}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="dispatch-panel">
              <div className="dispatch-panel-head is-compact">
                <div>
                  <p className="dispatch-panel-eyebrow">Novedades</p>
                  <h3>Incidencias</h3>
                </div>
                <Badge tone={(incidents.data?.length ?? 0) > 0 ? 'red' : 'slate'}>
                  {incidents.data?.length ?? 0}
                </Badge>
              </div>
              <div className="dispatch-list">
                {incidents.data?.length ? (
                  incidents.data.map((item) => (
                    <div key={item.id} className="dispatch-list-item">
                      <span className="dispatch-list-icon is-amber">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <div className="dispatch-list-copy">
                        <div className="flex items-center justify-between gap-2">
                          <p>{stateLabel(item.tipo)}</p>
                          <Badge tone={item.estado === 'ABIERTA' ? 'amber' : 'green'}>{item.estado}</Badge>
                        </div>
                        <p className="dispatch-list-text">{item.descripcion}</p>
                        <span className="dispatch-list-meta">{formatDateTime(item.fecha)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="Sin incidencias" description="No se reportaron novedades en este despacho." />
                )}
              </div>
            </Card>

            <Card className="dispatch-panel">
              <div className="dispatch-panel-head is-compact">
                <div>
                  <p className="dispatch-panel-eyebrow">Soporte</p>
                  <h3>Evidencias</h3>
                </div>
                <Badge tone={(evidence.data?.length ?? 0) > 0 ? 'blue' : 'slate'}>
                  {evidence.data?.length ?? 0}
                </Badge>
              </div>
              <div className="dispatch-list">
                {evidence.data?.length ? (
                  evidence.data.map((item) => (
                    <div key={item.id} className="dispatch-list-item">
                      <span className="dispatch-list-icon is-sky">
                        <Camera className="h-4 w-4" />
                      </span>
                      <div className="dispatch-list-copy">
                        <p>{stateLabel(item.tipo)}</p>
                        {item.url.startsWith('/dispatches/') ? (
                          <button
                            type="button"
                            className="dispatch-evidence-link"
                            onClick={() => openEvidence(item)}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {item.nombreArchivo ?? 'Ver archivo adjunto'}
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        ) : safeUrl(item.url) ? (
                          <a
                            href={safeUrl(item.url)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="dispatch-evidence-link"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {item.nombreArchivo ?? item.url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="dispatch-list-meta">URL de evidencia no válida</span>
                        )}
                        <span className="dispatch-list-meta">{formatDateTime(item.fecha)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="Sin evidencias" description="Adjunta fotos o actas como respaldo." />
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="dispatch-side space-y-4">
          <Card className="dispatch-panel dispatch-actions">
            <div className="dispatch-panel-head">
              <div>
                <p className="dispatch-panel-eyebrow">Operación</p>
                <h3>Acciones disponibles</h3>
                <span>Hitos habilitados según tu rol y el estado actual</span>
              </div>
              <span className={clsx('dispatch-live', isFinal && 'is-final')}>
                <i /> {stateLabel(state)}
              </span>
            </div>            <div className="card-body space-y-2">
              {canWarehouse && state === 'BORRADOR' && (
                <Button className="w-full" onClick={() => setModal('prepare')}>
                  <PackageCheck className="h-4 w-4" /> Preparar materiales
                </Button>
              )}
              {canAssign && ['BORRADOR', 'PREPARADO'].includes(state) && (
                <Button className="w-full" variant={assigned ? 'secondary' : 'primary'} onClick={() => setModal('assign')}>
                  <Truck className="h-4 w-4" /> {assigned ? 'Reasignar transporte' : 'Asignar transporte'}
                </Button>
              )}
              {state === 'PREPARADO' && canTransport && assigned && (
                <>
                  <Button
                    className="w-full"
                    variant="secondary"
                    loading={busy}
                    onClick={() => runAction('/transport-receipt', undefined, 'Recepción de carga confirmada.')}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Confirmar recepción de carga
                  </Button>
                  <Button className="w-full" loading={busy} onClick={() => runAction('/depart', undefined, 'Salida registrada.')}>
                    <Play className="h-4 w-4" /> Registrar salida
                  </Button>
                </>
              )}
              {state === 'EN_RUTA' && canTransport && (
                <Button
                  className="w-full"
                  variant="secondary"
                  loading={busy}
                  onClick={() => runAction('/arrive', undefined, 'Llegada registrada.')}
                >
                  <MapPin className="h-4 w-4" /> Registrar llegada
                </Button>
              )}
              {['EN_RUTA', 'PREPARADO'].includes(state) && canTransport && (
                <Button className="w-full" onClick={() => setModal('deliver')}>
                  <Send className="h-4 w-4" /> Registrar entrega
                </Button>
              )}
              {['ENTREGADO', 'ENTREGADO_PARCIAL'].includes(state) && canReception && (
                <Button className="w-full" onClick={() => setModal('reception')}>
                  <PackageCheck className="h-4 w-4" /> Registrar recepción
                </Button>
              )}
              {canManage && !['ENTREGADO', 'ENTREGADO_PARCIAL', 'CANCELADO'].includes(state) && (
                <Button className="w-full" variant="danger" onClick={() => setModal('cancel')}>
                  <XCircle className="h-4 w-4" /> Cancelar despacho
                </Button>
              )}
              {['ENTREGADO', 'ENTREGADO_PARCIAL', 'CANCELADO'].includes(state) && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  El despacho se encuentra en estado final. Consulte la trazabilidad y las recepciones.
                </p>
              )}
            </div>
          </Card>

          <Card className="dispatch-panel">
            <div className="dispatch-panel-head is-compact">
              <div>
                <p className="dispatch-panel-eyebrow">Ficha</p>
                <h3>Datos del envío</h3>
              </div>
              <Badge tone="slate">{data.contrato.codigo}</Badge>
            </div>            <dl className="divide-y divide-slate-100 px-5 py-2">
              <DetailRow label="Fecha">{formatDate(data.fecha)}</DetailRow>
              <DetailRow label="Contrato">{data.contrato.codigo}</DetailRow>
              <DetailRow label="TDR">{data.tdr.version}</DetailRow>
              <DetailRow label="Guia">{data.numeroGuia ?? '-'}</DetailRow>
              <DetailRow label="Hoja de ruta">{data.numeroHojaRuta ?? '-'}</DetailRow>
              <DetailRow label="Responsable">
                {data.responsable.nombres} {data.responsable.apellidos}
              </DetailRow>
              <DetailRow label="Transportista">
                {data.transportista ? `${data.transportista.nombres} ${data.transportista.apellidos}` : 'Sin asignar'}
              </DetailRow>
              <DetailRow label="Vehículo">{data.vehiculo ? `${data.vehiculo.placa} · ${data.vehiculo.marca ?? ''}` : '-'}</DetailRow>
              <DetailRow label="Salida">{formatDateTime(data.fechaHoraSalida)}</DetailRow>
              <DetailRow label="Llegada">{formatDateTime(data.fechaHoraLlegada)}</DetailRow>
              {data.observaciones && <DetailRow label="Observaciones">{data.observaciones}</DetailRow>}
            </dl>
          </Card>

          <Card className="dispatch-panel">
            <div className="dispatch-panel-head is-compact">
              <div>
                <p className="dispatch-panel-eyebrow">Conformidad</p>
                <h3>Recepciones</h3>
              </div>
              <Badge tone={(receptions.data?.length ?? 0) > 0 ? 'green' : 'slate'}>
                {receptions.data?.length ?? 0}
              </Badge>
            </div>
            <div className="dispatch-list">
              {receptions.data?.length ? (
                receptions.data.map((item) => (
                  <div key={item.id} className="dispatch-list-item">
                    <span className={clsx('dispatch-list-icon', item.conforme ? 'is-green' : 'is-amber')}>
                      <PackageCheck className="h-4 w-4" />
                    </span>
                    <div className="dispatch-list-copy">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StatusBadge estado={item.estado} />
                        <span className="dispatch-list-meta">{formatDateTime(item.fechaHora)}</span>
                      </div>
                      <p className="dispatch-list-text">Recibido por {item.recibidoPor}</p>
                      <span className="dispatch-list-meta">
                        {item.detalles.map((d) => `${d.producto.nombre}: ${formatQuantity(d.cantidadRecibida)}`).join(' · ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="Sin recepciones" description="Registre la conformidad del punto de entrega." />
              )}
            </div>
          </Card>
        </div>
      </div>

      <PrepareModal
        open={modal === 'prepare'}
        onClose={() => setModal(null)}
        details={data.detalles}
        busy={busy}
        error={actionError}
        onSubmit={(items) => runAction('/prepare', { items }, 'Materiales preparados.')}
      />
      <AssignModal
        open={modal === 'assign'}
        onClose={() => setModal(null)}
        users={users.data ?? []}
        vehicles={vehicles.data ?? []}
        busy={busy}
        error={actionError}
        onSubmit={(body) => runAction('/assign', body, 'Transporte asignado.')}
      />
      <DeliverModal
        open={modal === 'deliver'}
        onClose={() => setModal(null)}
        details={data.detalles}
        busy={busy}
        error={actionError}
        onSubmit={(body) => runAction('/deliver', body, 'Entrega registrada.')}
      />
      <CancelModal
        open={modal === 'cancel'}
        onClose={() => setModal(null)}
        busy={busy}
        error={actionError}
        onSubmit={(motivo) => runAction('/cancel', { motivo }, 'Despacho cancelado y reservas liberadas.')}
      />
      <IncidentModal
        open={modal === 'incident'}
        onClose={() => setModal(null)}
        busy={busy}
        error={actionError}
        onSubmit={(body) => runAction('/incidents', body, 'Incidencia registrada.')}
      />
      <EvidenceModal
        open={modal === 'evidence'}
        onClose={() => setModal(null)}
        busy={busy}
        error={actionError}
        onSubmit={(body) => runAction('/evidence', body, 'Evidencia registrada.')}
        onUpload={uploadEvidence}
      />
      <ReceptionModal
        open={modal === 'reception'}
        onClose={() => setModal(null)}
        details={data.detalles}
        busy={busy}
        error={actionError}
        onSubmit={(body) => runAction('/receptions', body, 'Recepción registrada.')}
      />
      <RouteModal
        open={modal === 'route'}
        onClose={() => setModal(null)}
        dispatchId={dispatchId}
        dispatch={dispatch.data ?? null}
      />
    </div>
  );
}

/* --------------------------------------------------------------- Modals */

function PrepareModal({
  open,
  onClose,
  details,
  busy,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  details: DetalleDespacho[];
  busy: boolean;
  error: string | null;
  onSubmit: (items: { productoId: number; cantidad: number }[]) => void;
}) {
  const [values, setValues] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;
    setValues(Object.fromEntries(details.map((det) => [det.producto.id, String(det.cantidadComprometida)])));
  }, [open, details]);

  return (
    <Modal
      open={open}
      title="Preparar materiales"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            loading={busy}
            onClick={() =>
              onSubmit(
                details.map((det) => ({
                  productoId: det.producto.id,
                  cantidad: Number(values[det.producto.id] ?? det.cantidadComprometida),
                })),
              )
            }
          >
            Confirmar preparación
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        <div className="space-y-2">
          {details.map((det) => (
            <div key={det.id} className="flex items-end gap-3 rounded-lg border border-slate-200 p-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">{det.producto.nombre}</p>
                <p className="text-xs text-slate-400">Comprometido: {formatQuantity(det.cantidadComprometida)} {det.producto.unidadMedida}</p>
              </div>
              <Input
                type="number"
                min={0}
                step="0.001"
                className="w-32"
                value={values[det.producto.id] ?? ''}
                onChange={(event) => setValues((prev) => ({ ...prev, [det.producto.id]: event.target.value }))}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400">La cantidad preparada no puede superar la cantidad comprometida.</p>
      </div>
    </Modal>
  );
}

function AssignModal({
  open,
  onClose,
  users,
  vehicles,
  busy,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  users: UserOption[];
  vehicles: Vehiculo[];
  busy: boolean;
  error: string | null;
  onSubmit: (body: { transportistaId: number; acompananteId?: number; vehiculoId?: number }) => void;
}) {
  const drivers = useMemo(
    () => users.filter((user) => user.rol === 'TRANSPORTISTA' || user.rol === 'RESPONSABLE_DISTRIBUCION'),
    [users],
  );
  const [driverId, setDriverId] = useState(0);
  const [companionId, setCompanionId] = useState(0);
  const [vehicleId, setVehicleId] = useState(0);

  useEffect(() => {
    if (!open) return;
    setDriverId(drivers[0]?.id ?? 0);
    setCompanionId(0);
    setVehicleId(vehicles[0]?.id ?? 0);
  }, [open, drivers, vehicles]);

  return (
    <Modal
      open={open}
      title="Asignar transporte"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            loading={busy}
            disabled={!driverId}
            onClick={() =>
              onSubmit({
                transportistaId: driverId,
                acompananteId: companionId || undefined,
                vehiculoId: vehicleId || undefined,
              })
            }
          >
            Asignar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        {drivers.length === 0 ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No hay usuarios con rol de transportista o responsable de distribucion activos.
          </p>
        ) : (
          <>
            <Field label="Transportista">
              <Select value={driverId} onChange={(event) => setDriverId(Number(event.target.value))}>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.nombres} {driver.apellidos} · {driver.email}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Acompanante (opcional)">
              <Select value={companionId} onChange={(event) => setCompanionId(Number(event.target.value))}>
                <option value={0}>Sin acompanante</option>
                {users
                  .filter((user) => user.id !== driverId)
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nombres} {user.apellidos} · {user.rol}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Vehículo">
              <Select value={vehicleId} onChange={(event) => setVehicleId(Number(event.target.value))}>
                <option value={0}>Sin vehículo</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.placa} · {vehicle.marca ?? ''} {vehicle.modelo ?? ''}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}

function DeliverModal({
  open,
  onClose,
  details,
  busy,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  details: DetalleDespacho[];
  busy: boolean;
  error: string | null;
  onSubmit: (body: { items: { productoId: number; cantidad: number }[]; observaciones: string }) => void;
}) {
  const [values, setValues] = useState<Record<number, string>>({});
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (!open) return;
    setObservaciones('');
    setValues(
      Object.fromEntries(
        details.map((det) => {
          const max = Number(det.cantidadPreparada) > 0 ? Number(det.cantidadPreparada) : Number(det.cantidadComprometida);
          return [det.producto.id, String(Math.max(max - Number(det.cantidadDespachada), 0))];
        }),
      ),
    );
  }, [open, details]);

  return (
    <Modal
      open={open}
      title="Registrar entrega"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            loading={busy}
            onClick={() =>
              onSubmit({
                items: details
                  .map((det) => ({ productoId: det.producto.id, cantidad: Number(values[det.producto.id] ?? 0) }))
                  .filter((item) => item.cantidad > 0),
                observaciones,
              })
            }
          >
            Confirmar entrega
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}
        {details.map((det) => {
          const max = Number(det.cantidadPreparada) > 0 ? Number(det.cantidadPreparada) : Number(det.cantidadComprometida);
          return (
            <div key={det.id} className="flex items-end gap-3 rounded-lg border border-slate-200 p-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">{det.producto.nombre}</p>
                <p className="text-xs text-slate-400">Maximo entregable: {formatQuantity(max)} {det.producto.unidadMedida}</p>
              </div>
              <Input
                type="number"
                min={0}
                step="0.001"
                className="w-32"
                value={values[det.producto.id] ?? ''}
                onChange={(event) => setValues((prev) => ({ ...prev, [det.producto.id]: event.target.value }))}
              />
            </div>
          );
        })}
        <Field label="Observaciones">
          <Textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder="Condiciones de la entrega, faltantes o incidencias" />
        </Field>
        <p className="text-xs text-slate-400">
          Si la cantidad entregada es menor a la comprometida, el despacho quedara como entrega parcial y se liberara la
          reserva restante.
        </p>
      </div>
    </Modal>
  );
}

function CancelModal({
  open,
  onClose,
  busy,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  error: string | null;
  onSubmit: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState('');
  useEffect(() => {
    if (open) setMotivo('');
  }, [open]);

  return (
    <Modal
      open={open}
      title="Cancelar despacho"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Volver</Button>
          <Button variant="danger" loading={busy} disabled={motivo.trim().length < 3} onClick={() => onSubmit(motivo)}>
            Confirmar cancelación
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <ErrorAlert message={error} />}
        <p className="text-sm text-slate-600">
          La cancelación libera las reservas de stock asociadas. Esta accion queda registrada en auditoría.
        </p>
        <Field label="Motivo">
          <Textarea value={motivo} onChange={(event) => setMotivo(event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

const INCIDENT_TYPES = [
  { value: 'RETRASO', label: 'Retraso', hint: 'Demora en la ruta', Icon: Clock },
  { value: 'AVERIA', label: 'Avería', hint: 'Falla del vehículo', Icon: Wrench },
  { value: 'ACCIDENTE', label: 'Accidente', hint: 'Evento en ruta', Icon: AlertTriangle },
  { value: 'RECHAZO', label: 'Rechazo', hint: 'No aceptado en punto', Icon: XCircle },
  { value: 'FALTANTE', label: 'Faltante', hint: 'Material incompleto', Icon: Package },
  { value: 'OTRO', label: 'Otro', hint: 'Otra incidencia', Icon: FileText },
] as const;

function IncidentModal({
  open,
  onClose,
  busy,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  error: string | null;
  onSubmit: (body: { tipo: string; descripcion: string }) => void;
}) {
  const [tipo, setTipo] = useState('RETRASO');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (!open) return;
    setTipo('RETRASO');
    setDescripcion('');
  }, [open]);

  const selectedType = INCIDENT_TYPES.find((item) => item.value === tipo) ?? INCIDENT_TYPES[0];

  return (
    <Modal
      open={open}
      title="Registrar incidencia"
      subtitle="Documenta el evento y su impacto en la entrega."
      icon={<AlertTriangle className="h-4 w-4" />}
      tone="amber"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={descripcion.trim().length < 5} onClick={() => onSubmit({ tipo, descripcion })}>
            Registrar incidencia
          </Button>
        </>
      }
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <FormHero
          tone="amber"
          icon={<AlertTriangle className="h-6 w-6" />}
          eyebrow={<><Wrench className="h-3 w-3" /> Seguimiento de ruta</>}
          title={selectedType.label}
          subtitle={descripcion || 'Selecciona el tipo y describe lo ocurrido durante la entrega'}
          tags={
            <>
              <FormTag tone="warn">{selectedType.hint}</FormTag>
              <FormTag>{descripcion.length} caracteres</FormTag>
            </>
          }
          aside={
            <FormStats
              items={[
                { label: 'Tipo', value: selectedType.label },
                { label: 'Mínimo', value: '5 car.' },
              ]}
            />
          }
        />

        <FormSection
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Clasificación"
          description="Tipo de evento que afecta la entrega"
        >
          <div className="fk-choices" role="radiogroup" aria-label="Tipo de incidencia">
            {INCIDENT_TYPES.map(({ value, label, hint, Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={tipo === value}
                className={clsx('fk-choice', tipo === value && 'is-selected')}
                onClick={() => setTipo(value)}
              >
                <span className="fk-choice-icon"><Icon className="h-3.5 w-3.5" /></span>
                <strong>{label}</strong>
                <small>{hint}</small>
              </button>
            ))}
          </div>
        </FormSection>

        <FormSection
          icon={<FileText className="h-4 w-4" />}
          title="Descripción del evento"
          description="Explica qué ocurrió y cómo afecta la entrega"
        >
          <Field
            label="Descripción"
            hint={`${descripcion.length} caracteres · mínimo 5. La incidencia quedará registrada en la auditoría.`}
          >
            <Textarea
              placeholder="Ej. El vehículo presentó una falla mecánica a 15 minutos del punto de entrega; se coordinó el reemplazo."
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
            />
          </Field>
        </FormSection>

        <FormNote icon={<Clock className="h-3.5 w-3.5" />} tone="warn">
          La incidencia no cancela el despacho. Podrás continuar la ruta y registrar evidencias desde el detalle.
        </FormNote>
      </div>
    </Modal>
  );
}

const EVIDENCE_TYPES = [
  { value: 'FOTO', label: 'Fotografía', hint: 'Imagen del hecho', Icon: Camera },
  { value: 'FIRMA', label: 'Firma digital', hint: 'Firma del responsable', Icon: PenLine },
  { value: 'DOCUMENTO', label: 'Documento', hint: 'PDF o acta firmada', Icon: FileText },
  { value: 'OTRO', label: 'Otro', hint: 'Evidencia adicional', Icon: UploadCloud },
] as const;

function EvidenceModal({
  open,
  onClose,
  busy,
  error,
  onSubmit,
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  error: string | null;
  onSubmit: (body: { tipo: string; url: string; nombreArchivo: string; observaciones: string }) => void;
  onUpload: (file: File, tipo: string, observaciones: string) => void;
}) {
  const [tipo, setTipo] = useState('FOTO');
  const [modo, setModo] = useState<'archivo' | 'url'>('archivo');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [nombre, setNombre] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTipo('FOTO');
    setModo('archivo');
    setFile(null);
    setUrl('');
    setNombre('');
    setObservaciones('');
    setDragging(false);
  }, [open]);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const selectedType = EVIDENCE_TYPES.find((item) => item.value === tipo) ?? EVIDENCE_TYPES[0];
  const valido = modo === 'archivo' ? Boolean(file) : url.trim().length >= 5;

  const guardar = () => {
    if (modo === 'archivo' && file) {
      onUpload(file, tipo, observaciones);
    } else {
      onSubmit({ tipo, url, nombreArchivo: nombre, observaciones });
    }
  };

  const pickFile = (nextFile: File | null) => {
    if (!nextFile) return;
    setFile(nextFile);
    if (!nombre) setNombre(nextFile.name.replace(/\.[^.]+$/, ''));
  };

  return (
    <Modal
      open={open}
      title="Adjuntar evidencia"
      subtitle="Respalda la entrega con imágenes, documentos o enlaces."
      icon={<Camera className="h-4 w-4" />}
      tone="sky"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} disabled={!valido} onClick={guardar}>
            Guardar evidencia
          </Button>
        </>
      }
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <FormHero
          tone="sky"
          icon={<Camera className="h-6 w-6" />}
          eyebrow={<><UploadCloud className="h-3 w-3" /> Evidencia del despacho</>}
          title={selectedType.label}
          subtitle={
            modo === 'url' && url
              ? url
              : file
                ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
                : 'Selecciona un archivo o registra un enlace autorizado'
          }
          tags={
            <>
              <FormTag tone={valido ? 'ok' : 'warn'}>{valido ? 'Listo para guardar' : 'Evidencia pendiente'}</FormTag>
              <FormTag icon={modo === 'archivo' ? <UploadCloud className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}>
                {modo === 'archivo' ? 'Archivo' : 'URL'}
              </FormTag>
            </>
          }
          aside={
            <FormStats
              items={[
                { label: 'Tipo', value: selectedType.label },
                { label: 'Modo', value: modo === 'archivo' ? 'Archivo' : 'URL' },
                { label: 'Tamaño', value: file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : '—' },
              ]}
            />
          }
        />

        <FormSection
          icon={<Camera className="h-4 w-4" />}
          title="Tipo de evidencia"
          description="Clasifica el respaldo que se adjuntará al despacho"
        >
          <div className="fk-choices fk-choices-2" role="radiogroup" aria-label="Tipo de evidencia">
            {EVIDENCE_TYPES.map(({ value, label, hint, Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={tipo === value}
                className={clsx('fk-choice', tipo === value && 'is-selected')}
                onClick={() => setTipo(value)}
              >
                <span className="fk-choice-icon"><Icon className="h-3.5 w-3.5" /></span>
                <strong>{label}</strong>
                <small>{hint}</small>
              </button>
            ))}
          </div>
        </FormSection>

        <FormSection
          icon={<UploadCloud className="h-4 w-4" />}
          title="Archivo o enlace"
          description="Sube el archivo o registra una URL del repositorio documental"
        >
          <div className="fk-segmented" role="tablist" aria-label="Método de evidencia">
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'archivo'}
              className={modo === 'archivo' ? 'is-active' : ''}
              onClick={() => setModo('archivo')}
            >
              <UploadCloud className="h-3.5 w-3.5" /> Subir archivo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'url'}
              className={modo === 'url' ? 'is-active' : ''}
              onClick={() => setModo('url')}
            >
              <Link2 className="h-3.5 w-3.5" /> Usar URL
            </button>
          </div>

          {modo === 'archivo' ? (
            <>
              <div
                className={clsx('fk-dropzone', dragging && 'is-dragging', file && 'has-file')}
                role="button"
                tabIndex={0}
                onClick={() => fileInput.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    fileInput.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  pickFile(event.dataTransfer.files?.[0] ?? null);
                }}
              >
                <input
                  ref={fileInput}
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
                />
                <span className="fk-dropzone-icon"><UploadCloud className="h-5 w-5" /></span>
                <div className="fk-dropzone-copy">
                  <strong>{file ? file.name : 'Arrastra tu archivo aquí'}</strong>
                  <small>
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${file.type || 'archivo'}`
                      : 'o haz clic para seleccionar · JPG, PNG, WEBP o PDF · máximo 8 MB'}
                  </small>
                </div>
                {file && (
                  <button
                    type="button"
                    className="fk-dropzone-remove"
                    aria-label="Quitar archivo"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFile(null);
                      if (fileInput.current) fileInput.current.value = '';
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
              {previewUrl && (
                <div className="fk-preview">
                  <img src={previewUrl} alt="Vista previa de la evidencia" />
                </div>
              )}
            </>
          ) : (
            <FormGrid>
              <Field label="URL del archivo" hint="Enlace al repositorio documental o almacenamiento autorizado.">
                <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Nombre de archivo">
                <Input value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="acta-recepcion.pdf" />
              </Field>
            </FormGrid>
          )}
        </FormSection>

        <FormSection
          icon={<FileText className="h-4 w-4" />}
          title="Observaciones"
          description="Detalle opcional sobre la evidencia adjunta"
        >
          <Field label="Comentario">
            <Textarea
              placeholder="Ej. Fotografía del empaque dañado al momento de la entrega"
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
            />
          </Field>
        </FormSection>
      </div>
    </Modal>
  );
}

function ReceptionModal({
  open,
  onClose,
  details,
  busy,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  details: DetalleDespacho[];
  busy: boolean;
  error: string | null;
  onSubmit: (body: {
    recibidoPor: string;
    documentoIdentidad: string;
    observaciones: string;
    evidenciaUrl: string;
    items: { productoId: number; cantidadRecibida: number; cantidadRechazada: number; observaciones: string }[];
  }) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [recibidoPor, setRecibidoPor] = useState('');
  const [documento, setDocumento] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [evidenciaUrl, setEvidenciaUrl] = useState('');
  const [values, setValues] = useState<Record<number, { recibida: string; rechazada: string }>>({});

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setRecibidoPor('');
    setDocumento('');
    setObservaciones('');
    setEvidenciaUrl('');
    setValues(
      Object.fromEntries(
        details.map((det) => [
          det.producto.id,
          {
            recibida: String(Number(det.cantidadDespachada) > 0 ? det.cantidadDespachada : det.cantidadComprometida),
            rechazada: '0',
          },
        ]),
      ),
    );
  }, [open, details]);

  const totals = details.reduce(
    (acc, det) => {
      const dispatched = Number(det.cantidadDespachada) > 0 ? Number(det.cantidadDespachada) : Number(det.cantidadComprometida);
      acc.dispatched += dispatched;
      acc.received += Number(values[det.producto.id]?.recibida ?? 0);
      acc.rejected += Number(values[det.producto.id]?.rechazada ?? 0);
      return acc;
    },
    { dispatched: 0, received: 0, rejected: 0 },
  );
  const withDifference = totals.rejected > 0 || totals.received < totals.dispatched;

  return (
    <Modal
      open={open}
      title="Registrar recepción en punto de entrega"
      subtitle="Confirma lo recibido y documenta cualquier diferencia."
      icon={<PackageCheck className="h-4 w-4" />}
      tone="brand"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={step === 1 ? onClose : () => setStep((current) => (current - 1) as 1 | 2 | 3)}>
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </Button>
          {step < 3 ? (
            <Button
              variant="primary"
              disabled={step === 1 && recibidoPor.trim().length < 3}
              onClick={() => setStep((current) => (current + 1) as 1 | 2 | 3)}
            >
              Continuar
            </Button>
          ) : (
            <Button
              loading={busy}
              disabled={recibidoPor.trim().length < 3}
              onClick={() =>
                onSubmit({
                  recibidoPor,
                  documentoIdentidad: documento,
                  observaciones,
                  evidenciaUrl,
                  items: details.map((det) => ({
                    productoId: det.producto.id,
                    cantidadRecibida: Number(values[det.producto.id]?.recibida ?? 0),
                    cantidadRechazada: Number(values[det.producto.id]?.rechazada ?? 0),
                    observaciones: '',
                  })),
                })
              }
            >
              Registrar recepción
            </Button>
          )}
        </>
      }
    >
      <div className="fk-form">
        {error && <ErrorAlert message={error} />}

        <div className="fk-wizard" aria-label={`Paso ${step} de 3`}>
          {['Responsable', 'Productos', 'Evidencia'].map((label, index) => {
            const value = (index + 1) as 1 | 2 | 3;
            return (
              <div
                key={label}
                className={clsx('fk-wizard-step', step === value && 'is-active', step > value && 'is-done')}
                aria-current={step === value ? 'step' : undefined}
              >
                <span className="fk-wizard-dot">{step > value ? '✓' : value}</span>
                <span>{label}</span>
              </div>
            );
          })}
        </div>

        <FormHero
          tone={withDifference ? 'amber' : 'brand'}
          icon={<PackageCheck className="h-6 w-6" />}
          eyebrow={<><ClipboardCheck className="h-3 w-3" /> Acta de recepción</>}
          title={details.length === 1 ? details[0]?.producto.nombre : `${details.length} productos por recibir`}
          subtitle={recibidoPor || 'Registra el responsable y confirma las cantidades'}
          tags={
            <>
              <FormTag tone={withDifference ? 'warn' : 'ok'}>{withDifference ? 'Revisar diferencia' : 'Conforme'}</FormTag>
              <FormTag>Despachado: {formatQuantity(totals.dispatched)}</FormTag>
              <FormTag>Recibido: {formatQuantity(totals.received)}</FormTag>
            </>
          }
          aside={
            <FormStats
              items={[
                { label: 'Despachado', value: formatQuantity(totals.dispatched) },
                { label: 'Recibido', value: formatQuantity(totals.received) },
                { label: 'Rechazado', value: formatQuantity(totals.rejected) },
              ]}
            />
          }
        />

        {step === 1 && (
        <FormSection
          icon={<UserRound className="h-4 w-4" />}
          title="Responsable de la recepción"
          description="Persona que firma y recibe el material en el punto"
        >
          <FormGrid>
            <Field label="Recibido por">
              <Input value={recibidoPor} onChange={(event) => setRecibidoPor(event.target.value)} placeholder="Nombre del responsable" />
            </Field>
            <Field label="Documento de identidad">
              <Input value={documento} onChange={(event) => setDocumento(event.target.value)} placeholder="DNI / CE" />
            </Field>
          </FormGrid>
        </FormSection>
        )}

        {step === 2 && (
        <FormSection
          icon={<Package className="h-4 w-4" />}
          title="Productos recibidos"
          description="Confirma la cantidad recibida y registra los rechazos"
          actions={<Badge tone={withDifference ? 'amber' : 'green'}>{details.length} {details.length === 1 ? 'producto' : 'productos'}</Badge>}
        >
          <div className="fk-rcp-list">
            {details.map((det) => {
              const max = Number(det.cantidadDespachada) > 0 ? Number(det.cantidadDespachada) : Number(det.cantidadComprometida);
              const received = Number(values[det.producto.id]?.recibida ?? 0);
              const rejected = Number(values[det.producto.id]?.rechazada ?? 0);
              const differs = rejected > 0 || received < max;
              return (
                <div key={det.id} className={clsx('fk-rcp-item', differs && 'has-diff')}>
                  <div className="fk-rcp-head">
                    <div className="fk-rcp-product">
                      <span className="fk-rcp-icon"><Package className="h-4 w-4" /></span>
                      <div>
                        <strong>{det.producto.nombre}</strong>
                        <small>{det.producto.unidadMedida} · Despachado: {formatQuantity(max)}</small>
                      </div>
                    </div>
                    <span className={clsx('fk-rcp-state', differs ? 'is-warn' : 'is-ok')}>
                      {differs ? 'Diferencia' : 'Conforme'}
                    </span>
                  </div>
                  <div className="fk-rcp-grid">
                    <Field label="Cantidad recibida">
                      <Input
                        type="number"
                        min={0}
                        step="0.001"
                        value={values[det.producto.id]?.recibida ?? ''}
                        onChange={(event) =>
                          setValues((prev) => ({
                            ...prev,
                            [det.producto.id]: {
                              ...(prev[det.producto.id] ?? { rechazada: '0' }),
                              recibida: event.target.value,
                            },
                          }))
                        }
                      />
                    </Field>
                    <Field label="Cantidad rechazada">
                      <Input
                        type="number"
                        min={0}
                        step="0.001"
                        value={values[det.producto.id]?.rechazada ?? '0'}
                        onChange={(event) =>
                          setValues((prev) => ({
                            ...prev,
                            [det.producto.id]: {
                              ...(prev[det.producto.id] ?? { recibida: '0' }),
                              rechazada: event.target.value,
                            },
                          }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        </FormSection>
        )}

        {step === 3 && (
        <FormSection
          icon={<FileText className="h-4 w-4" />}
          title="Observaciones y evidencia"
          description="Documenta daños, faltantes o el enlace del acta firmada"
        >
          <Field label="Observaciones">
            <Textarea
              placeholder="Ej. Se rechazan 10 unidades por empaque dañado"
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
            />
          </Field>
          <Field label="Evidencia (URL)" className="fk-gap-top">
            <Input value={evidenciaUrl} onChange={(event) => setEvidenciaUrl(event.target.value)} placeholder="https://..." />
          </Field>
        </FormSection>
        )}

        <FormNote icon={withDifference ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />} tone={withDifference ? 'warn' : 'ok'}>
          {withDifference
            ? 'Hay una diferencia entre lo despachado y lo recibido. La recepción se marcará como no conforme y generará una incidencia.'
            : 'Las cantidades coinciden con lo despachado. La recepción se registrará como conforme.'}
        </FormNote>
      </div>
    </Modal>
  );
}

const FIRMA_TIPOS: TipoFirmaHojaRuta[] = ['DESPACHO', 'TRANSPORTISTA', 'RECEPCION'];

function firmasIniciales(): Record<TipoFirmaHojaRuta, FirmaHojaRuta> {
  return {
    DESPACHO: {
      tipo: 'DESPACHO',
      nombre: '',
      dni: '',
      cargo: 'Responsable de despacho',
      fechaFirma: '',
      imagen: '',
    },
    TRANSPORTISTA: {
      tipo: 'TRANSPORTISTA',
      nombre: '',
      dni: '',
      cargo: 'Transportista',
      fechaFirma: '',
      imagen: '',
    },
    RECEPCION: {
      tipo: 'RECEPCION',
      nombre: '',
      dni: '',
      cargo: 'Responsable de recepción',
      fechaFirma: '',
      imagen: '',
    },
  };
}

function SignaturePad({
  tipo,
  label,
  role,
  value,
  onChange,
}: {
  tipo: TipoFirmaHojaRuta;
  label: string;
  role: string;
  value: FirmaHojaRuta;
  onChange: (next: FirmaHojaRuta) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const valueRef = useRef(value);
  const signed = Boolean(value.imagen);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const paint = (dataUrl?: string) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    if (!dataUrl) return;
    const image = new Image();
    image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height);
    image.src = dataUrl;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
      if (valueRef.current.imagen) paint(valueRef.current.imagen);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    paint(value.imagen);
    // La firma se redibuja cuando llega desde el servidor o se limpia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.imagen]);

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = event.currentTarget;
    canvas.setPointerCapture(event.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = point(event);
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = event.currentTarget.getContext('2d');
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    const imagen = event.currentTarget.toDataURL('image/png');
    onChange({
      ...valueRef.current,
      imagen,
      fechaFirma: valueRef.current.fechaFirma || new Date().toISOString(),
    });
  };

  const clear = () => {
    paint(undefined);
    onChange({ ...valueRef.current, imagen: '' });
  };

  return (
    <div className={clsx('fk-sign', signed && 'is-signed')} data-tipo={tipo}>
      <div className="fk-sign-head">
        <div>
          <strong>{label}</strong>
          <small>{role}</small>
        </div>
        <span className={clsx('fk-sign-state', signed ? 'is-ok' : 'is-pending')}>
          {signed ? 'Firmado' : 'Pendiente'}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        className="fk-sign-canvas"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        aria-label={`Área de ${label.toLowerCase()}`}
      />
      <div className="fk-sign-fields">
        <label className="fk-sign-field">
          <span>Nombre completo</span>
          <input
            value={value.nombre ?? ''}
            placeholder="Nombre y apellidos"
            onChange={(event) => onChange({ ...value, nombre: event.target.value })}
          />
        </label>
        <label className="fk-sign-field">
          <span>DNI / CE</span>
          <input
            value={value.dni ?? ''}
            inputMode="numeric"
            maxLength={12}
            aria-label="DNI o carné de extranjería"
            onChange={(event) => onChange({ ...value, dni: event.target.value })}
          />
        </label>
        <label className="fk-sign-field">
          <span>Cargo</span>
          <input
            value={value.cargo ?? ''}
            onChange={(event) => onChange({ ...value, cargo: event.target.value })}
          />
        </label>
        <label className="fk-sign-field">
          <span>Fecha y hora</span>
          <input readOnly value={value.fechaFirma ? formatDateTime(value.fechaFirma) : ''} />
        </label>
      </div>
      <div className="fk-sign-foot">
        <span><PenLine className="h-3 w-3" /> Firme dentro del recuadro</span>
        <button type="button" className="fk-sign-clear" onClick={clear} disabled={!signed}>
          <Eraser className="h-3 w-3" /> Limpiar
        </button>
      </div>
    </div>
  );
}

function RouteProductsTable({
  rows,
  totalUnits,
}: {
  rows: { codigo: string; nombre: string; unidad: string; cantidad: number }[];
  totalUnits: number;
}) {
  const sorting = useTableSort(rows, {
    codigo: (row) => row.codigo,
    producto: (row) => row.nombre,
    unidad: (row) => row.unidad,
    cantidad: (row) => row.cantidad,
  });

  return (
    <table className="table table-pro">
      <thead>
        <tr>
          <SortableTh label="Código" column="codigo" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
          <SortableTh label="Producto" column="producto" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
          <SortableTh label="Unidad" column="unidad" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
          <SortableTh label="Cantidad" column="cantidad" className="text-right" sortKey={sorting.sort?.key ?? null} direction={sorting.sort?.dir ?? null} onSort={sorting.toggle} />
          <th className="text-right">Recibido</th>
        </tr>
      </thead>
      <tbody>
        {sorting.rows.map((product, index) => (
          <tr key={`${product.codigo}-${index}`}>
            <td className="text-xs text-slate-500">{product.codigo}</td>
            <td>{product.nombre}</td>
            <td>{product.unidad}</td>
            <td className="text-right">{formatQuantity(product.cantidad)}</td>
            <td className="text-right text-slate-300">________</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={3}>Total: {rows.length} {rows.length === 1 ? 'ítem' : 'ítems'}</td>
          <td className="text-right">{formatQuantity(totalUnits)}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

function RouteModal({
  open,
  onClose,
  dispatchId,
  dispatch,
}: {
  open: boolean;
  onClose: () => void;
  dispatchId: number;
  dispatch: Despacho | null;
}) {
  const route = useApiQuery<RouteSheet>(
    () => api.get(`/dispatches/${dispatchId}/route-sheet`).then((r) => r.data),
    [dispatchId, open],
  );
  const signaturesQuery = useApiQuery<FirmaHojaRuta[]>(
    () => api.get(`/dispatches/${dispatchId}/signatures`).then((r) => r.data),
    [dispatchId, open],
  );

  const [firmas, setFirmas] = useState<Record<TipoFirmaHojaRuta, FirmaHojaRuta>>(firmasIniciales);
  const [savingSignatures, setSavingSignatures] = useState(false);
  const [signaturesSaved, setSignaturesSaved] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const loadedRef = useRef(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!open || !route.data || !signaturesQuery.data) return;
    const base = firmasIniciales();
    base.DESPACHO.nombre = dispatch?.responsable
      ? `${dispatch.responsable.nombres} ${dispatch.responsable.apellidos}`
      : '';
    base.TRANSPORTISTA.nombre = route.data.transportista ?? '';
    base.RECEPCION.nombre =
      route.data.contactoLlegada ?? dispatch?.puntoEntrega?.responsable ?? '';
    for (const firma of signaturesQuery.data) {
      base[firma.tipo] = {
        ...base[firma.tipo],
        ...firma,
        imagen: firma.imagen ?? '',
        fechaFirma: firma.imagen ? firma.fechaFirma ?? '' : '',
      };
    }
    setFirmas(base);
    loadedRef.current = true;
    dirtyRef.current = signaturesQuery.data.length < 3;
    setSignaturesSaved(signaturesQuery.data.length >= 3);
  }, [open, route.data, signaturesQuery.data, dispatch]);

  const guardarFirmas = async (silent = false) => {
    if (!loadedRef.current) return;
    setSavingSignatures(true);
    try {
      await api.post(`/dispatches/${dispatchId}/signatures`, {
        firmas: FIRMA_TIPOS.map((tipo) => ({
          tipo,
          nombre: firmas[tipo].nombre || null,
          dni: firmas[tipo].dni || null,
          cargo: firmas[tipo].cargo || null,
          fechaFirma: firmas[tipo].imagen
            ? firmas[tipo].fechaFirma || new Date().toISOString()
            : null,
          imagen: firmas[tipo].imagen || null,
        })),
      });
      dirtyRef.current = false;
      setSignaturesSaved(true);
      if (!silent) toastSuccess('Firmas guardadas.');
    } catch (error) {
      toastError(apiErrorMessage(error));
    } finally {
      setSavingSignatures(false);
    }
  };

  useEffect(() => {
    if (!open || !loadedRef.current || !dirtyRef.current) return;
    const timer = window.setTimeout(() => {
      void guardarFirmas(true);
    }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmas, open]);

  const actualizarFirma = (tipo: TipoFirmaHojaRuta, next: FirmaHojaRuta) => {
    setFirmas((prev) => ({ ...prev, [tipo]: { ...next, tipo } }));
    dirtyRef.current = true;
    setSignaturesSaved(false);
  };

  const handleClose = () => {
    if (dirtyRef.current) {
      void guardarFirmas(true);
    }
    onClose();
  };

  if (!route.data) {
    return (
      <Modal
        open={open}
        title="Hoja de ruta"
        subtitle="Documento oficial de transporte, entrega y firmas."
        icon={<FileText className="h-4 w-4" />}
        tone="brand"
        onClose={onClose}
        size="lg"
        footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}
      >
        {route.loading ? <Spinner /> : <ErrorAlert message={route.error ?? 'No se pudo cargar la hoja de ruta.'} />}
      </Modal>
    );
  }

  const productRows = dispatch?.detalles?.length
    ? dispatch.detalles.map((detail) => ({
        codigo: detail.producto.codigo,
        nombre: detail.producto.nombre,
        unidad: detail.producto.unidadMedida,
        cantidad:
          Number(detail.cantidadDespachada) > 0
            ? Number(detail.cantidadDespachada)
            : Number(detail.cantidadComprometida),
      }))
    : route.data.productos.map((product) => ({
        codigo: '—',
        nombre: product.producto,
        unidad: product.unidad,
        cantidad: Number(product.cantidad),
      }));

  const totalUnits = productRows.reduce((sum, item) => sum + item.cantidad, 0);
  const salida = dispatch?.fechaHoraSalida ?? route.data.salida;
  const llegada = dispatch?.fechaHoraLlegada;
  const generatedAt = formatDateTime(new Date().toISOString());
  const vehicle = dispatch?.vehiculo;

  const descargarPdf = async () => {
    setExportingPdf(true);
    try {
      if (dirtyRef.current) {
        await guardarFirmas(true);
      }
      const { data } = await api.get(`/dispatches/${dispatchId}/route-sheet/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${route.data?.hojaRuta ?? 'hoja-ruta'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toastSuccess('Hoja de ruta exportada en PDF.');
    } catch (error) {
      toastError(apiErrorMessage(error));
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Hoja de ruta"
      subtitle="Documento oficial de transporte, entrega y firmas."
      icon={<FileText className="h-4 w-4" />}
      tone="brand"
      onClose={handleClose}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button loading={exportingPdf} onClick={descargarPdf}>
            <FileText className="h-4 w-4" /> Descargar PDF
          </Button>
        </>
      }
    >
      <div className="fk-form">
        {route.error && <ErrorAlert message={route.error} />}

        <article className="fk-doc">
          <header className="fk-doc-head">
            <div className="fk-doc-brand">
              <span className="fk-doc-logo"><Truck className="h-6 w-6" /></span>
              <div>
                <p className="fk-doc-company">{EMPRESA.razonSocial}</p>
                <p className="fk-doc-title">Hoja de ruta · Documento de control logístico</p>
                {(EMPRESA.ruc || EMPRESA.direccion || EMPRESA.telefono) && (
                  <p className="fk-doc-company-meta">
                    {EMPRESA.ruc && <span>RUC {EMPRESA.ruc}</span>}
                    {EMPRESA.direccion && <span>{EMPRESA.direccion}</span>}
                    {EMPRESA.telefono && <span>Tel. {EMPRESA.telefono}</span>}
                  </p>
                )}
              </div>
            </div>
            <div className="fk-doc-meta">
              <span className="fk-doc-original">Original</span>
              <strong>{route.data.hojaRuta ?? 'HR —'}</strong>
              <span>{route.data.despacho}</span>
              <small>Emisión: {generatedAt}</small>
              {dispatch?.estado && <span className="fk-doc-state">{stateLabel(dispatch.estado)}</span>}
            </div>
          </header>

          <div className="fk-doc-body">
            <section className="fk-doc-section">
              <p className="fk-doc-section-title">Datos del despacho</p>
              <div className="fk-info-grid">
                <div className="fk-info">
                  <span>Despacho</span>
                  <strong>{route.data.despacho}</strong>
                </div>
                <div className="fk-info">
                  <span>Hoja de ruta</span>
                  <strong>{route.data.hojaRuta ?? '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>Contrato</span>
                  <strong>{dispatch?.contrato?.codigo ?? '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>TDR</span>
                  <strong>{dispatch?.tdr?.version ?? '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>Programación</span>
                  <strong>{formatDate(dispatch?.programacion?.fechaProgramada)}</strong>
                </div>
                <div className="fk-info">
                  <span>Estado</span>
                  <strong>{dispatch?.estado ? stateLabel(dispatch.estado) : '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>Hora de salida</span>
                  <strong>{salida ? formatDateTime(salida) : '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>Hora de llegada</span>
                  <strong>{llegada ? formatDateTime(llegada) : '—'}</strong>
                </div>
              </div>
            </section>

            <section className="fk-doc-section">
              <p className="fk-doc-section-title">Origen y destino</p>
              <div className="fk-info-grid">
                <div className="fk-info">
                  <span>Origen</span>
                  <strong>{EMPRESA.almacen}</strong>
                </div>
                <div className="fk-info">
                  <span>Entidad de destino</span>
                  <strong>{dispatch?.entidad?.razonSocial ?? route.data.destino}</strong>
                </div>
                <div className="fk-info">
                  <span>RUC de la entidad</span>
                  <strong>{dispatch?.entidad?.ruc ?? '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>Punto de entrega</span>
                  <strong>{dispatch?.puntoEntrega?.nombre ?? route.data.destino}</strong>
                </div>
                <div className="fk-info fk-info-wide">
                  <span>Dirección de entrega</span>
                  <strong>
                    {[route.data.destino, dispatch?.puntoEntrega?.distrito].filter(Boolean).join(' · ') || '—'}
                  </strong>
                </div>
                <div className="fk-info">
                  <span>Contacto en destino</span>
                  <strong>{route.data.contactoLlegada ?? dispatch?.puntoEntrega?.responsable ?? '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>Teléfono de contacto</span>
                  <strong>{route.data.telefonoLlegada ?? dispatch?.puntoEntrega?.telefono ?? '—'}</strong>
                </div>
              </div>
            </section>

            <section className="fk-doc-section">
              <p className="fk-doc-section-title">Transporte</p>
              <div className="fk-info-grid">
                <div className="fk-info">
                  <span>Transportista</span>
                  <strong>{route.data.transportista ?? '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>Teléfono del transportista</span>
                  <strong>{dispatch?.transportista?.telefono ?? '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>Acompañante</span>
                  <strong>{route.data.acompanante ?? '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>Vehículo</span>
                  <strong>
                    {[route.data.vehiculo, vehicle?.marca, vehicle?.modelo].filter(Boolean).join(' · ') || '—'}
                  </strong>
                </div>
                <div className="fk-info">
                  <span>Tipo de vehículo</span>
                  <strong>{vehicle?.tipo ?? '—'}</strong>
                </div>
                <div className="fk-info">
                  <span>Observaciones del despacho</span>
                  <strong>{dispatch?.observaciones ?? 'Sin observaciones'}</strong>
                </div>
              </div>
            </section>

            <section className="fk-doc-section">
              <p className="fk-doc-section-title">Productos transportados</p>
              <div className="fk-table-wrap">
                <RouteProductsTable rows={productRows} totalUnits={totalUnits} />
              </div>
            </section>

            <p className="fk-doc-legal">
              Declaro haber recibido los productos descritos en la presente hoja de ruta, en las cantidades y
              condiciones indicadas. Cualquier faltante, daño o diferencia se registrará en el acto de recepción.
            </p>

            <div className="fk-doc-signatures">
              <SignaturePad
                tipo="DESPACHO"
                label="Firma despacho"
                role="Responsable de despacho"
                value={firmas.DESPACHO}
                onChange={(next) => actualizarFirma('DESPACHO', next)}
              />
              <SignaturePad
                tipo="TRANSPORTISTA"
                label="Firma transportista"
                role="Transportista"
                value={firmas.TRANSPORTISTA}
                onChange={(next) => actualizarFirma('TRANSPORTISTA', next)}
              />
              <SignaturePad
                tipo="RECEPCION"
                label="Firma recepción"
                role="Responsable de recepción"
                value={firmas.RECEPCION}
                onChange={(next) => actualizarFirma('RECEPCION', next)}
              />
            </div>

            <footer className="fk-doc-footer">
              <span>Documento generado el {generatedAt}</span>
              <span>Verificación: {route.data.hojaRuta ?? route.data.despacho}</span>
              <span>{EMPRESA.razonSocial}</span>
            </footer>
          </div>
        </article>

        <div className="fk-doc-note">
          <FormNote icon={<PenLine className="h-3.5 w-3.5" />} tone="ok">
            <span>
              Las firmas se guardan automáticamente y se incluyen en el PDF y en la impresión.
            </span>
            <span className={clsx('fk-doc-save-state', savingSignatures && 'is-saving')}>
              {savingSignatures
                ? 'Guardando firmas…'
                : signaturesSaved
                  ? 'Firmas guardadas'
                  : 'Firmas pendientes de guardar'}
            </span>
          </FormNote>
        </div>
      </div>
    </Modal>
  );
}
