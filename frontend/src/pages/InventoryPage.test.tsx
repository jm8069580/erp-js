import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InventoryPage from './InventoryPage';
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

const product = {
  id: 'prod-1',
  name: 'Laptop',
  sku: 'LAP-001',
  stock: 10,
  isActive: true,
};

const movement = {
  id: 'mov-1',
  number: 1,
  type: 'ENTRY',
  quantity: 5,
  stockAfter: 15,
  reason: 'Compra a proveedor',
  createdAt: '2026-09-14T00:00:00.000Z',
  product: { id: 'prod-1', name: 'Laptop', sku: 'LAP-001', stock: 15 },
  createdBy: { id: 'user-1', email: 'admin@erp.com', firstName: 'Admin', lastName: 'ERP' },
};

describe('InventoryPage', () => {
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
    getMock().mockImplementation((url: string) =>
      Promise.resolve({ data: url === '/products' ? [product] : [movement] }),
    );
  });

  it('lists movements after loading', async () => {
    render(<InventoryPage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('MOV-0001')).toBeInTheDocument();
    });
    expect(screen.getByText('Entrada')).toBeInTheDocument();
    expect(screen.getByText('Compra a proveedor')).toBeInTheDocument();
    expect(getMock()).toHaveBeenCalledWith('/inventory');
    expect(getMock()).toHaveBeenCalledWith('/products');
  });

  it('shows an error when the list cannot load', async () => {
    getMock().mockImplementation((url: string) =>
      url === '/products'
        ? Promise.resolve({ data: [product] })
        : Promise.reject(new Error('boom')),
    );

    render(<InventoryPage />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar movimientos')).toBeInTheDocument();
    });
  });

  it('registers an ENTRY movement from the modal', async () => {
    postMock().mockResolvedValue({ data: movement });
    const user = userEvent.setup();

    render(<InventoryPage />);
    await screen.findByText('MOV-0001');

    await user.click(screen.getByRole('button', { name: 'Nuevo movimiento' }));
    await user.selectOptions(screen.getByLabelText('Producto'), 'prod-1');
    await user.type(screen.getByLabelText('Razón'), 'Compra a proveedor');
    await user.click(screen.getByRole('button', { name: 'Registrar movimiento' }));

    await waitFor(() => {
      expect(postMock()).toHaveBeenCalledWith('/inventory', {
        productId: 'prod-1',
        type: 'ENTRY',
        quantity: 1,
        reason: 'Compra a proveedor',
      });
    });
    expect(
      screen.queryByRole('button', { name: 'Registrar movimiento' }),
    ).not.toBeInTheDocument();
  });
});