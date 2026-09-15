import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportingPage from './ReportingPage';
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

const trialBalance = {
  accounts: [
    {
      id: 'acc-1',
      code: '1.1.01',
      name: 'Caja',
      type: 'ACTIVO',
      nature: 'DEBITO',
      debit: 500,
      credit: 100,
      balance: 400,
    },
  ],
  totals: { debit: 500, credit: 500 },
};

describe('ReportingPage', () => {
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
      url === '/accounts'
        ? Promise.resolve({ data: [] })
        : Promise.resolve({ data: trialBalance }),
    );
  });

  it('renders trial balance tab by default', async () => {
    const user = userEvent.setup();

    render(<ReportingPage />);

    expect(
      screen.getAllByText('Balance de Comprobación').length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Generar' }));

    await waitFor(() => {
      expect(screen.getByText('Caja')).toBeInTheDocument();
    });
    expect(screen.getByText('1.1.01')).toBeInTheDocument();
    expect(getMock()).toHaveBeenCalledWith('/reporting/trial-balance', {
      params: {},
    });
  });

  it('shows error when report fails to load', async () => {
    getMock().mockImplementation((url: string) =>
      url === '/accounts'
        ? Promise.resolve({ data: [] })
        : Promise.reject(new Error('boom')),
    );
    const user = userEvent.setup();

    render(<ReportingPage />);

    await user.click(screen.getByRole('button', { name: 'Generar' }));

    await waitFor(() => {
      expect(
        screen.getByText('Error al generar el balance de comprobación'),
      ).toBeInTheDocument();
    });
  });

  it('fetches trial balance with date filters', async () => {
    const user = userEvent.setup();

    render(<ReportingPage />);

    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.change(screen.getByLabelText('Hasta'), {
      target: { value: '2026-09-15' },
    });
    await user.click(screen.getByRole('button', { name: 'Generar' }));

    await waitFor(() => {
      expect(getMock()).toHaveBeenCalledWith('/reporting/trial-balance', {
        params: {
          dateFrom: '2026-09-01',
          dateTo: '2026-09-15',
        },
      });
    });
  });
});