import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
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
import { ModuleKpi, ModuleProgress, ModuleViewToggle } from '@/components/module';
import { DatePicker } from '@/components/DatePicker';
import { FormWizard } from '@/components/FormWizard';
import '@/styles/modules.css';

const COLORS = [
  { name: 'Surface', value: '#ffffff', css: 'var(--ss-surface-0)' },
  { name: 'Surface alt', value: '#f8fafc', css: 'var(--ss-surface-1)' },
  { name: 'Text 1', value: '#0f172a', css: 'var(--ss-text-1)' },
  { name: 'Text 2', value: '#475569', css: 'var(--ss-text-2)' },
  { name: 'Text 3', value: '#64748b', css: 'var(--ss-text-3)' },
  { name: 'Brand', value: '#047664', css: 'var(--ss-brand)' },
  { name: 'Éxito', value: '#047857', css: '#047857' },
  { name: 'Atención', value: '#b45309', css: '#b45309' },
  { name: 'Peligro', value: '#be123c', css: '#be123c' },
];

export default function PaginaDesignSystem() {
  const [modalOpen, setModalOpen] = useState(false);
  const [demoDate, setDemoDate] = useState('');
  const [demoView, setDemoView] = useState<'table' | 'grid'>('table');

  return (
    <div className="mod-page">
      <section className="mod-hero mod-reveal">
        <div className="mod-hero-content">
          <div>
            <p className="mod-eyebrow"><span className="mod-live-dot" /> Sistema de diseño</p>
            <h1 className="mod-title">SmartSys UI</h1>
            <p className="mod-sub">
              Tokens, tipografía, estados y componentes base. Esta página es interna y sirve como
              referencia para mantener consistencia entre módulos.
            </p>
          </div>
        </div>
      </section>

      <Card className="mod-reveal mod-reveal-1">
        <div className="card-header">
          <div>
            <h2 className="mod-card-title">Color y superficies</h2>
            <p className="text-sm text-slate-500">Paleta semántica y texto secundario con contraste AA.</p>
          </div>
          <Badge tone="brand">Tokens</Badge>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {COLORS.map((color) => (
              <div key={color.name} className="rounded-xl border border-slate-200 bg-white p-3">
                <span
                  className="block h-12 w-full rounded-lg border border-black/5"
                  style={{ background: color.css }}
                />
                <p className="mt-2 text-sm font-semibold text-slate-800">{color.name}</p>
                <p className="text-xs text-slate-500">{color.value}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="mod-reveal mod-reveal-2">
          <div className="card-header"><h2 className="mod-card-title">Tipografía</h2></div>
          <div className="card-body space-y-3">
            <p className="text-3xl font-extrabold tracking-tight text-slate-900">Título display</p>
            <p className="text-xl font-bold text-slate-800">Título de módulo</p>
            <p className="text-base font-semibold text-slate-800">Título de tarjeta</p>
            <p className="text-sm text-slate-600">Texto de cuerpo para descripciones y ayudas.</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Etiqueta de sección</p>
            <p className="text-sm text-slate-500">Mínimo recomendado: 12 px para etiquetas y ayudas.</p>
          </div>
        </Card>

        <Card className="mod-reveal mod-reveal-3">
          <div className="card-header"><h2 className="mod-card-title">Botones y estados</h2></div>
          <div className="card-body space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary"><Sparkles className="h-4 w-4" /> Primario</Button>
              <Button variant="secondary">Secundario</Button>
              <Button variant="soft">Suave</Button>
              <Button variant="danger">Peligro</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Tamaño sm</Button>
              <Button disabled>Deshabilitado</Button>
              <Button loading>Cargando</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">Correcto</Badge>
              <Badge tone="amber">Atención</Badge>
              <Badge tone="red">Crítico</Badge>
              <Badge tone="blue">Informativo</Badge>
              <Badge tone="brand">Marca</Badge>
              <StatusBadge estado="ENTREGADO_PARCIAL" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="mod-reveal mod-reveal-3">
          <div className="card-header"><h2 className="mod-card-title">Formularios</h2></div>
          <div className="card-body space-y-4">
            <Field label="Correo corporativo" hint="Usa el dominio de la empresa." required>
              <Input type="email" placeholder="usuario@smartsys.local" />
            </Field>
            <Field label="Rol" required>
              <Select defaultValue="PERSONAL_LOGISTICA">
                <option value="ADMINISTRADOR">Administrador</option>
                <option value="JEFE_LOGISTICA">Jefe de logística</option>
                <option value="PERSONAL_LOGISTICA">Personal de logística</option>
              </Select>
            </Field>
            <Field label="Observaciones" error="Este campo es obligatorio.">
              <Textarea placeholder="Describe el motivo..." />
            </Field>
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setModalOpen(true)}>Abrir modal</Button>
            </div>
          </div>
        </Card>

        <Card className="mod-reveal mod-reveal-4">
          <div className="card-header"><h2 className="mod-card-title">Feedback y KPIs</h2></div>
          <div className="card-body space-y-4">
            <ErrorAlert message="No se pudo cargar la información." onRetry={() => undefined} />
            <EmptyState
              title="Sin registros"
              description="Los registros aparecerán cuando exista actividad."
              action={<Button size="sm">Crear registro</Button>}
            />
            <div className="flex items-center justify-center gap-3">
              <Spinner label="Cargando datos..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ModuleKpi
                label="Entregas"
                value="12"
                hint="En el periodo"
                icon={<Truck className="h-5 w-5" />}
                tone="brand"
                compact
              />
              <ModuleKpi
                label="Pendientes"
                value="4"
                hint="Requieren atención"
                icon={<ClipboardList className="h-5 w-5" />}
                tone="amber"
                compact
              />
            </div>
            <ModuleProgress value={78} />
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> OK</span>
              <span className="inline-flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-amber-600" /> Atención</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-brand-700" /> Seguro</span>
              <span className="inline-flex items-center gap-1"><PackageCheck className="h-4 w-4 text-sky-600" /> Entrega</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mod-reveal mod-reveal-5">
        <div className="card-header">
          <div>
            <h2 className="mod-card-title">Tablas, fechas y wizard</h2>
            <p className="text-sm text-slate-500">Patrones usados en los módulos operativos.</p>
          </div>
          <Badge tone="brand">Patrones</Badge>
        </div>
        <div className="card-body space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Fecha de ejemplo" className="w-52">
              <DatePicker value={demoDate} onChange={setDemoDate} />
            </Field>
            <ModuleViewToggle value={demoView} onChange={setDemoView} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200" role="region" aria-label="Ejemplo de tabla de inventario" tabIndex={0}>
            <table className="table table-pro">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="text-right">Disponible</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Jabón líquido antibacterial 1L</strong><p className="text-xs text-slate-400">PROD-001</p></td>
                  <td><Badge tone="brand">Higiene</Badge></td>
                  <td className="text-right font-bold">240</td>
                  <td><Badge tone="green">Normal</Badge></td>
                </tr>
                <tr>
                  <td><strong>Papel higiénico institucional 300m</strong><p className="text-xs text-slate-400">PROD-002</p></td>
                  <td><Badge tone="brand">Higiene</Badge></td>
                  <td className="text-right font-bold">460</td>
                  <td><Badge tone="green">Normal</Badge></td>
                </tr>
                <tr>
                  <td><strong>Alcohol etílico 70% 1L</strong><p className="text-xs text-slate-400">PROD-003</p></td>
                  <td><Badge tone="blue">Desinfección</Badge></td>
                  <td className="text-right font-bold text-rose-600">0</td>
                  <td><Badge tone="red">Bajo mínimo</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <FormWizard
              resetKey="design-system"
              submitLabel="Guardar ejemplo"
              onCancel={() => undefined}
              onSubmit={() => undefined}
              steps={[
                {
                  id: 'datos',
                  label: 'Datos',
                  description: 'Paso inicial',
                  content: (
                    <Field label="Nombre del registro" hint="Ejemplo de campo dentro del wizard.">
                      <Input placeholder="Nombre" />
                    </Field>
                  ),
                },
                {
                  id: 'confirmacion',
                  label: 'Confirmación',
                  description: 'Paso final',
                  content: (
                    <Field label="Observaciones">
                      <Textarea placeholder="Detalle opcional" />
                    </Field>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card className="mod-reveal mod-reveal-5">
        <div className="card-header">
          <h2 className="mod-card-title">Reglas rápidas</h2>
        </div>
        <div className="card-body grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Color', 'Un color, un significado: verde éxito, ámbar atención, rojo crítico.'],
            ['Tipografía', '12 px mínimo para etiquetas; 14 px para cuerpo; contraste AA.'],
            ['Móvil', 'Acciones principales grandes, tarjetas antes que tablas y navegación inferior.'],
            ['Estados', 'Toda acción debe tener loading, éxito, vacío y error visibles.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-800">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        title="Ejemplo de modal"
        subtitle="Foco, Escape, retorno de foco y footer sticky en móvil."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={() => setModalOpen(false)}>Confirmar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nombre" required>
            <Input placeholder="Nombre del registro" />
          </Field>
          <Field label="Detalle">
            <Textarea placeholder="Descripción opcional" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
