export type Rol =
  | 'ADMINISTRADOR'
  | 'GERENTE_GENERAL'
  | 'JEFE_LOGISTICA'
  | 'ENCARGADO_ALMACEN'
  | 'PERSONAL_OPERATIVO'
  | 'PERSONAL_LOGISTICA'
  | 'RESPONSABLE_DISTRIBUCION'
  | 'TRANSPORTISTA';

export type EstadoSolicitud =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'PENDIENTE_DESPACHO'
  | 'PARCIALMENTE_ATENDIDA'
  | 'DESPACHADA';

export type EstadoDespacho =
  | 'BORRADOR'
  | 'EN_PREPARACION'
  | 'PREPARADO'
  | 'EN_RUTA'
  | 'ENTREGADO'
  | 'ENTREGADO_PARCIAL'
  | 'CANCELADO';

export type EstadoProgramacion =
  | 'PROGRAMADA'
  | 'REPROGRAMADA'
  | 'CANCELADA'
  | 'EN_EJECUCION'
  | 'CUMPLIDA'
  | 'PARCIAL';

export interface BaseEntity {
  id: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Usuario extends BaseEntity {
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  rol: Rol;
  activo: boolean;
  ultimoAcceso?: string;
}

export interface EntidadPublica extends BaseEntity {
  ruc: string;
  razonSocial: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  telefono?: string;
  correo?: string;
  responsable?: string;
  activo: boolean;
}

export interface PuntoEntrega extends BaseEntity {
  entidad: EntidadPublica;
  nombre: string;
  direccion?: string;
  distrito?: string;
  responsable?: string;
  telefono?: string;
  activo: boolean;
}

export interface Producto extends BaseEntity {
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  unidadMedida: string;
  marca?: string;
  requiereLote: boolean;
  requiereVencimiento: boolean;
  activo: boolean;
}

export interface Inventario extends BaseEntity {
  producto: Producto;
  stockFisico: number;
  stockReservado: number;
  stockDisponible: number;
  stockMinimo: number;
  version?: number;
}

export type TipoMovimiento =
  | 'INGRESO'
  | 'SALIDA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'MERMA';

export interface MovimientoInventario extends BaseEntity {
  producto: Producto;
  tipo: TipoMovimiento;
  cantidad: number;
  saldoResultante: number;
  referencia?: string;
  observaciones?: string;
  usuario?: Usuario;
  fecha: string;
}

export interface Contrato extends BaseEntity {
  numero: string;
  codigo: string;
  entidad: EntidadPublica;
  objeto?: string;
  fechaInicio?: string;
  fechaFin?: string;
  responsableInterno?: string;
  estado: string;
  archivoUrl?: string;
}

export interface Tdr extends BaseEntity {
  contrato: Contrato;
  version: string;
  fechaVigencia?: string;
  archivoUrl?: string;
  estado: string;
}

export type Frecuencia = 'DIARIA' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'PERSONALIZADA';

export interface TdrItem extends BaseEntity {
  tdr: Tdr;
  producto: Producto;
  cantidadTotal: number;
  unidad: string;
  frecuencia: Frecuencia;
  cantidadPorEntrega: number;
  fechaProgramada?: string;
  fechaLimite?: string;
  diasPersonalizado?: number;
  observaciones?: string;
}

export interface DetalleSolicitud extends BaseEntity {
  producto: Producto;
  cantidadSolicitada: number;
  cantidadAprobada: number;
  cantidadDespachada: number;
  reservaId?: number;
}

export interface SolicitudMaterial extends BaseEntity {
  codigo: string;
  entidad: EntidadPublica;
  puntoEntrega: PuntoEntrega;
  solicitante: Usuario;
  fechaSolicitud: string;
  justificacion: string;
  estado: EstadoSolicitud;
  motivoRechazo?: string;
  aprobadoPor?: Usuario;
  fechaAprobacion?: string;
  detalles: DetalleSolicitud[];
}

export interface DetalleDespacho extends BaseEntity {
  producto: Producto;
  cantidadComprometida: number;
  cantidadPreparada: number;
  cantidadDespachada: number;
  reservaId?: number;
  solicitudDetalleId?: number;
}

export interface Vehiculo extends BaseEntity {
  placa: string;
  marca?: string;
  modelo?: string;
  tipo?: string;
  estado: string;
}

export interface Proveedor extends BaseEntity {
  ruc: string;
  razonSocial: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  estado: boolean;
}

export interface RolSistema {
  id: number;
  nombre: string;
  descripcion?: string;
}

export type AccionPermiso = 'ver' | 'crear' | 'editar' | 'eliminar';

export interface PermisoModulo {
  modulo: string;
  label: string;
  descripcion: string;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface OrdenServicio {
  id: number;
  clienteNombre: string;
  clienteRuc: string;
  direccionServicio?: string;
  tipoServicio?: string;
  fechaServicio: string;
  estado: string;
  solicitudId?: number;
  solicitudCodigo?: string;
}

export interface DetalleIngresoAlmacen {
  id: number;
  codigoProducto: string;
  producto: string;
  cantidad: number;
  lote?: string;
  fechaVencimiento?: string;
}

export interface IngresoAlmacen {
  id: number;
  fecha: string;
  guia?: string;
  proveedorId?: number;
  proveedor?: string;
  usuario: string;
  observacion?: string;
  estado: boolean;
  detalles: DetalleIngresoAlmacen[];
}

export interface DetalleSalidaAlmacen {
  id: number;
  codigoProducto: string;
  producto: string;
  cantidad: number;
}

export interface SalidaAlmacen {
  id: number;
  fecha: string;
  guia?: string;
  tipoEntrega?: string;
  usuario: string;
  estado: boolean;
  despachoId?: number;
  despachoCodigo?: string;
  detalles: DetalleSalidaAlmacen[];
}

export interface Despacho extends BaseEntity {
  codigo: string;
  entidad: EntidadPublica;
  puntoEntrega: PuntoEntrega;
  contrato: Contrato;
  tdr: Tdr;
  programacion: ProgramacionAbastecimiento;
  solicitud?: SolicitudMaterial;
  fecha: string;
  responsable: Usuario;
  transportista?: Usuario;
  acompanante?: Usuario;
  vehiculo?: Vehiculo;
  fechaHoraAsignacion?: string;
  estado: EstadoDespacho;
  numeroGuia?: string;
  numeroSalida?: string;
  numeroHojaRuta?: string;
  fechaHoraSalida?: string;
  fechaHoraLlegada?: string;
  observaciones?: string;
  detalles: DetalleDespacho[];
}

export interface ProgramacionAbastecimiento extends BaseEntity {
  contrato: Contrato;
  tdrItem: TdrItem;
  entidad: EntidadPublica;
  puntoEntrega: PuntoEntrega;
  producto: Producto;
  fechaProgramada: string;
  fechaLimite?: string;
  cantidadComprometida: number;
  cantidadProgramada: number;
  cantidadEntregada: number;
  saldoPendiente: number;
  estado: EstadoProgramacion;
  motivo?: string;
  version?: number;
}

export interface PreviewItem {
  fecha: string;
  cantidad: number;
}

export interface DetalleRecepcion extends BaseEntity {
  producto: Producto;
  cantidadRecibida: number;
  cantidadRechazada: number;
  observaciones?: string;
}

export interface Recepcion extends BaseEntity {
  despacho: Despacho;
  fechaHora: string;
  recibidoPor: string;
  documentoIdentidad?: string;
  estado: string;
  observaciones?: string;
  conforme: boolean;
  usuario: Usuario;
  detalles: DetalleRecepcion[];
}

export interface Notificacion extends BaseEntity {
  usuario?: Usuario;
  rolDestino?: Rol;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  fecha: string;
}

export interface Auditoria extends BaseEntity {
  usuarioEmail?: string;
  usuarioNombre?: string;
  rol?: string;
  metodo: string;
  recurso: string;
  accion: string;
  modulo?: string;
  exito: boolean;
  detalle?: string;
  ip?: string;
  dispositivo?: string;
  equipo?: string;
  navegador?: string;
  sistemaOperativo?: string;
  fecha: string;
}

export type EstadoReposicion =
  | 'BORRADOR'
  | 'PENDIENTE_APROBACION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'ATENDIDA';

export interface DetalleReposicion extends BaseEntity {
  producto: Producto;
  cantidad: number;
  observacion?: string;
}

export interface SolicitudReposicion extends BaseEntity {
  codigo: string;
  justificacion: string;
  montoEstimado?: number;
  referenciaPresupuesto?: string;
  proveedorSugerido?: string;
  estado: EstadoReposicion;
  solicitante: Usuario;
  aprobador?: Usuario;
  fechaSolicitud: string;
  fechaResolucion?: string;
  motivoRechazo?: string;
  detalles: DetalleReposicion[];
}

export interface DashboardSummary {
  productos: number;
  stockBajo: number;
  solicitudes: number;
  solicitudesPendientes: number;
  solicitudesAprobadas: number;
  despachos: number;
  despachosActivos: number;
  entregasMes: number;
  programacionesMes: number;
  recepciones: number;
  recepcionesNoConformes: number;
  incidenciasAbiertas: number;
  cumplimientoPromedio: number;
}

export interface StateCount {
  estado: string;
  total: number;
}

export interface MonthlyPoint {
  mes: string;
  entregas: number;
  cantidad: number;
}

export interface ProductTotal {
  producto: string;
  cantidad: number;
}

export interface DashboardCharts {
  mensual: MonthlyPoint[];
  solicitudes: StateCount[];
  despachos: StateCount[];
  topProductos: ProductTotal[];
}

export interface ItemCompliance {
  tdrItemId: number;
  producto: string;
  comprometido: number;
  programado: number;
  entregado: number;
  cumplimientoPct: number;
}

export interface ClausulaEvaluada {
  id: number;
  codigo: string;
  descripcion: string;
  tipo: string;
  umbralPorcentaje?: number;
  accionSugerida: string;
  incumplida: boolean;
  resultado: string;
}

export interface TdrCompliance {
  tdrId: number;
  contrato: string;
  entidad: string;
  comprometido: number;
  programado: number;
  entregado: number;
  recibido: number;
  cumplimientoPct: number;
  puntualidadPct: number;
  programaciones: number;
  cumplidas: number;
  vencidas: number;
  recepciones: number;
  incidencias: number;
  items: ItemCompliance[];
  clausulas: ClausulaEvaluada[];
}

export interface ReportDefinition {
  key: string;
  nombre: string;
  descripcion: string;
}

export interface ReportHistorial {
  id: number;
  tipo: string;
  formato: string;
  desde?: string;
  hasta?: string;
  generado: string;
  usuario: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  type: string;
  expiresIn: number;
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  telefono?: string;
  avatarUrl?: string;
}

export interface PerfilUsuario {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  nombres: string;
  apellidos: string;
  telefono?: string;
  avatarUrl?: string;
  ultimoAcceso?: string;
  createdAt?: string;
}

export interface PresenciaUsuario {
  usuarioId: number;
  ultimaActividad?: string;
  enLinea: boolean;
  ventanaSegundos: number;
}

export interface UserOption {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  telefono?: string;
  rol: Rol;
  activo?: boolean;
  bloqueadoHasta?: string;
  ultimoAcceso?: string;
  createdAt?: string;
  avatarUrl?: string;
}

export interface UsuarioAdmin extends UserOption {
  activo: boolean;
}

export interface EventoSeguimiento extends BaseEntity {
  despacho: Despacho;
  tipo: string;
  observaciones?: string;
  latitud?: number;
  longitud?: number;
  evidenciaUrl?: string;
  usuario: Usuario;
  fechaHora: string;
}

export interface IncidenciaDespacho extends BaseEntity {
  despacho: Despacho;
  tipo: string;
  descripcion: string;
  estado: string;
  usuario: Usuario;
  fecha: string;
}

export interface Evidencia extends BaseEntity {
  despacho: Despacho;
  recepcionId?: number;
  tipo: string;
  url: string;
  nombreArchivo?: string;
  observaciones?: string;
  usuario: Usuario;
  fecha: string;
}

export interface RouteSheet {
  despacho: string;
  hojaRuta?: string;
  origen: string;
  destino: string;
  fecha: string;
  salida?: string;
  transportista?: string;
  acompanante?: string;
  vehiculo?: string;
  contactoLlegada?: string;
  telefonoLlegada?: string;
  productos: { producto: string; cantidad: number; unidad: string }[];
}

export type TipoFirmaHojaRuta = 'DESPACHO' | 'TRANSPORTISTA' | 'RECEPCION';

export interface FirmaHojaRuta {
  tipo: TipoFirmaHojaRuta;
  nombre?: string;
  dni?: string;
  cargo?: string;
  fechaFirma?: string;
  imagen: string;
}

export interface Clause {
  id: number;
  contrato: Contrato;
  codigo: string;
  descripcion: string;
  tipo: string;
  umbralPorcentaje?: number;
  accionSugerida: string;
  activa: boolean;
}
