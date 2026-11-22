import type { ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

export function FilterDrawer({
  open,
  onClose,
  onClear,
  onApply,
  children,
  title = 'Filtros',
  activeCount = 0,
}: {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
  children: ReactNode;
  title?: string;
  activeCount?: number;
}) {
  return (
    <Modal
      open={open}
      title={title}
      subtitle="Ajusta los filtros y aplica los cambios al listado."
      icon={<SlidersHorizontal className="h-4 w-4" />}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClear}>
            <X className="h-3.5 w-3.5" /> Limpiar
          </Button>
          <Button onClick={onApply}>Aplicar filtros</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {activeCount > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-2">
            <span className="text-xs font-semibold text-brand-800">Filtros activos</span>
            <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          </div>
        )}
        {children}
      </div>
    </Modal>
  );
}
