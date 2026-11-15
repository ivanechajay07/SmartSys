import {
  Activity,
  Bell,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  Gauge,
  History,
  PackageCheck,
  RefreshCcw,
  ScrollText,
  Settings2,
  Smartphone,
  Truck,
  UserCog,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  module: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Operación',
    items: [
      { to: '/', label: 'Panel general', icon: Gauge, module: 'PANEL' },
      { to: '/solicitudes', label: 'Solicitudes', icon: ClipboardList, module: 'SOLICITUDES' },
      { to: '/reposiciones', label: 'Reposiciones', icon: RefreshCcw, module: 'REPOSICIONES' },
      { to: '/programacion', label: 'Programación', icon: Activity, module: 'PROGRAMACION' },
      { to: '/despachos', label: 'Despachos', icon: Truck, module: 'DESPACHOS' },
      { to: '/ruta-movil', label: 'Ruta móvil', icon: Smartphone, module: 'RUTA_MOVIL' },
      { to: '/recepciones', label: 'Recepciones', icon: PackageCheck, module: 'RECEPCIONES' },
    ],
  },
  {
    title: 'Control y análisis',
    items: [
      { to: '/inventario', label: 'Inventario', icon: Boxes, module: 'INVENTARIO' },
      { to: '/trazabilidad', label: 'Trazabilidad', icon: History, module: 'TRAZABILIDAD' },
      { to: '/cumplimiento', label: 'Cumplimiento TDR', icon: ClipboardCheck, module: 'CUMPLIMIENTO' },
      { to: '/reportes', label: 'Reportes', icon: FileBarChart, module: 'REPORTES' },
      { to: '/notificaciones', label: 'Notificaciones', icon: Bell, module: 'NOTIFICACIONES' },
    ],
  },
  {
    title: 'Administración',
    items: [
      { to: '/datos-maestros', label: 'Datos maestros', icon: Settings2, module: 'DATOS_MAESTROS' },
      { to: '/usuarios', label: 'Usuarios y roles', icon: UserCog, module: 'USUARIOS' },
      { to: '/auditoria', label: 'Auditoría', icon: ScrollText, module: 'AUDITORIA' },
      { to: '/perfil', label: 'Mi cuenta', icon: Users, module: 'PERFIL' },
    ],
  },
];

export function navigationFor(): NavGroup[] {
  return NAV_GROUPS;
}
