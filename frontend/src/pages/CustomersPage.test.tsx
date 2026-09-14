import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomersPage from './CustomersPage';
import { useAuthStore } from '../store/auth.store';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const getMock = (): ReturnType<typeof vi.fn> => api.get as never;
const postMock = (): ReturnType<typeof vi.fn> => api.post as never;

const customer = {
  id: 'cust-1',
  number: 1,
  name: 'Juan Pérez',
  email: 'juan@example.com',
  phone: '555-1234',
  address: null,
  taxId: null,
  notes: 'Cliente frecuente',
  isActive: true,
  createdAt: '2026-09-14T00:00:00.000Z',
  _count: { sales: 3 },
};

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'admin@erp.com',
        firstName: 'Admin',
        lastName: 'ERP',
        role: 'ADMIN',
      },
      restored: false,
    });
    getMock().mockResolvedValue({ data: [customer] });
  });

  it('lists customers after loading', async () => {
    render(<CustomersPage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });
    expect(screen.getByText('CUS-0001')).toBeInTheDocument();
    expect(screen.getByText('juan@example.com')).toBeInTheDocument();
    expect(getMock()).toHaveBeenCalledWith('/customers');
  });

  it('shows an error when the list cannot load', async () => {
    getMock().mockRejectedValue(new Error('boom'));

    render(<CustomersPage />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar clientes')).toBeInTheDocument();
    });
  });

  it('creates a customer from the modal', async () => {
    postMock().mockResolvedValue({ data: customer });
    const user = userEvent.setup();

    render(<CustomersPage />);
    await screen.findByText('Juan Pérez');

    await user.click(screen.getByRole('button', { name: 'Nuevo cliente' }));
    await user.type(screen.getByLabelText('Nombre'), 'María González');
    await user.type(screen.getByLabelText('Email'), 'maria@example.com');
    await user.click(screen.getByRole('button', { name: 'Crear cliente' }));

    await waitFor(() => {
      expect(postMock()).toHaveBeenCalledWith('/customers', {
        name: 'María González',
        email: 'maria@example.com',
        phone: undefined,
        address: undefined,
        taxId: undefined,
        notes: undefined,
        isActive: true,
      });
    });
    expect(
      screen.queryByRole('button', { name: 'Crear cliente' }),
    ).not.toBeInTheDocument();
  });
});