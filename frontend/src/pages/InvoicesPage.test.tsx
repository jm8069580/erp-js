import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoicesPage from './InvoicesPage';
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

const invoice = {
  id: 'inv-1',
  number: 1,
  serie: 'A',
  folio: 1,
  date: '2026-09-15T00:00:00.000Z',
  customerId: 'cust-1',
  customerName: 'Juan Pérez',
  saleId: null,
  subtotal: 100,
  itbms: 7,
  total: 107,
  status: 'DRAFT',
  createdById: 'user-1',
  items: [
    {
      id: 'item-1',
      description: 'Laptop',
      quantity: 1,
      unitPrice: 100,
      subtotal: 100,
    },
  ],
};

describe('InvoicesPage', () => {
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
      url === '/invoices'
        ? Promise.resolve({ data: [invoice] })
        : Promise.resolve({ data: [] }),
    );
  });

  it('lists invoices after loading', async () => {
    render(<InvoicesPage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });
    expect(screen.getByText('FAC-0001')).toBeInTheDocument();
    expect(getMock()).toHaveBeenCalledWith('/invoices');
  });

  it('shows error when invoices fail to load', async () => {
    getMock().mockImplementation((url: string) =>
      url === '/invoices'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ data: [] }),
    );

    render(<InvoicesPage />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar facturas')).toBeInTheDocument();
    });
  });

  it('creates an invoice from the modal', async () => {
    getMock().mockImplementation(() =>
      Promise.resolve({ data: [] }),
    );
    postMock().mockResolvedValue({ data: invoice });
    const user = userEvent.setup();

    render(<InvoicesPage />);
    await screen.findByText('No hay facturas registradas');

    await user.click(screen.getByRole('button', { name: 'Nueva factura' }));
    await user.type(
      screen.getByLabelText('Nombre del cliente *'),
      'Juan Pérez',
    );

    const spinbuttons = screen.getAllByRole('spinbutton');
    fireEvent.change(spinbuttons[0], { target: { value: '1' } });
    fireEvent.change(spinbuttons[1], { target: { value: '100' } });

    const descriptionInput = screen.getAllByRole('textbox')[screen.getAllByRole('textbox').length - 1];
    await user.type(descriptionInput, 'Laptop');

    await user.click(screen.getByRole('button', { name: 'Crear factura' }));

    await waitFor(() => {
      expect(postMock()).toHaveBeenCalledWith('/invoices', {
        customerName: 'Juan Pérez',
        customerId: undefined,
        saleId: undefined,
        items: [{ description: 'Laptop', quantity: 1, unitPrice: 100 }],
      });
    });
    expect(
      screen.queryByRole('button', { name: 'Crear factura' }),
    ).not.toBeInTheDocument();
  });
});