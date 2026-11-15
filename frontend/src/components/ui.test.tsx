import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Badge, Button, EmptyState, StatusBadge } from '@/components/ui';

describe('Button', () => {
  it('renders children and handles clicks', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled while loading', () => {
    render(<Button loading>Procesando</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('StatusBadge', () => {
  it('renders the Spanish label for a known state', () => {
    render(<StatusBadge estado="ENTREGADO_PARCIAL" />);
    expect(screen.getByText('Entregado parcial')).toBeInTheDocument();
  });

  it('renders arbitrary badge content', () => {
    render(<Badge tone="red">Crítico</Badge>);
    expect(screen.getByText('Crítico')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('shows title and description', () => {
    render(<EmptyState title="Sin registros" description="Cree el primer registro." />);
    expect(screen.getByText('Sin registros')).toBeInTheDocument();
    expect(screen.getByText('Cree el primer registro.')).toBeInTheDocument();
  });
});
