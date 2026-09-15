import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChartOfAccountsPage from './ChartOfAccountsPage';
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

const account = {
  id: 'acc-1',
  code: '1.1.01',
  name: 'Caja',
  type: 'ACTIVO',
  nature: 'DEBITO',
  parentId: null,
  isActive: true,
  _count: { children: 0, journalLines: 5 },
};

describe('ChartOfAccountsPage', () => {
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
    getMock().mockResolvedValue({ data: [] });
  });

  it('lists accounts after loading', async () => {
    getMock().mockImplementation((url: string) =>
      url === '/accounting/config'
        ? Promise.resolve({ data: {} })
        : Promise.resolve({ data: [account] }),
    );

    render(<ChartOfAccountsPage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Caja')).toBeInTheDocument();
    });
    expect(screen.getByText('1.1.01')).toBeInTheDocument();
    expect(screen.getAllByText('Activo').length).toBeGreaterThan(0);
    expect(getMock()).toHaveBeenCalledWith('/accounts');
  });

  it('shows error when accounts fail to load', async () => {
    getMock().mockRejectedValue(new Error('boom'));

    render(<ChartOfAccountsPage />);

    await waitFor(() => {
      expect(screen.getByText('Error al cargar cuentas')).toBeInTheDocument();
    });
  });

  it('creates an account from the modal', async () => {
    getMock().mockImplementation((url: string) =>
      url === '/accounting/config'
        ? Promise.resolve({ data: {} })
        : Promise.resolve({ data: [] }),
    );
    postMock().mockResolvedValue({ data: account });
    const user = userEvent.setup();

    render(<ChartOfAccountsPage />);
    await screen.findByText('No hay cuentas registradas');

    await user.click(screen.getByRole('button', { name: 'Nueva cuenta' }));
    await user.type(screen.getByLabelText('Código'), '2.1.01');
    await user.type(screen.getByLabelText('Nombre'), 'Préstamos');
    await user.selectOptions(screen.getByLabelText('Tipo'), 'PASIVO');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(postMock()).toHaveBeenCalledWith('/accounts', {
        code: '2.1.01',
        name: 'Préstamos',
        type: 'PASIVO',
        nature: 'DEBITO',
        parentId: undefined,
      });
    });
    expect(
      screen.queryByRole('button', { name: 'Crear cuenta' }),
    ).not.toBeInTheDocument();
  });
});