import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JournalPage from './JournalPage';
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
  isActive: true,
};

const entry = {
  id: 'je-1',
  number: 1,
  date: '2026-09-15T00:00:00.000Z',
  concept: 'Ingreso',
  reference: 'REF-001',
  status: 'DRAFT',
  invoiceId: null,
  reversalOfId: null,
  createdById: 'user-1',
  createdBy: { id: 'user-1', firstName: 'Admin', lastName: 'ERP' },
  lines: [
    {
      id: 'line-1',
      accountId: 'acc-1',
      description: 'Cash',
      debit: 100,
      credit: 0,
      account: { id: 'acc-1', code: '1.1.01', name: 'Caja' },
    },
    {
      id: 'line-2',
      accountId: 'acc-2',
      description: 'Revenue',
      debit: 0,
      credit: 100,
      account: { id: 'acc-2', code: '4.1.01', name: 'Ventas' },
    },
  ],
};

describe('JournalPage', () => {
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
      url === '/journal'
        ? Promise.resolve({ data: [entry] })
        : Promise.resolve({ data: [account] }),
    );
  });

  it('lists journal entries after loading', async () => {
    render(<JournalPage />);

    expect(screen.getByText('Cargando...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Ingreso')).toBeInTheDocument();
    });
    expect(screen.getByText('ASNT-0001')).toBeInTheDocument();
    expect(getMock()).toHaveBeenCalledWith('/journal');
  });

  it('shows error when entries fail to load', async () => {
    getMock().mockImplementation((url: string) =>
      url === '/journal'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ data: [account] }),
    );

    render(<JournalPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Error al cargar los asientos contables'),
      ).toBeInTheDocument();
    });
  });

  it('books a journal entry', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    postMock().mockResolvedValue({ data: {} });
    const user = userEvent.setup();

    render(<JournalPage />);
    await screen.findByText('Ingreso');

    await user.click(screen.getByRole('button', { name: 'Contabilizar' }));

    await waitFor(() => {
      expect(postMock()).toHaveBeenCalledWith('/journal/je-1/book');
    });
    confirmSpy.mockRestore();
  });
});