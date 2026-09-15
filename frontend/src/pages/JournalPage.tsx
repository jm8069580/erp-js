import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../services/api';
import { ScrollText, Plus, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/auth.store';

interface JournalEntry {
  id: string;
  number: number;
  date: string;
  concept: string;
  reference: string | null;
  status: 'DRAFT' | 'BOOKED' | 'CANCELLED';
  invoiceId: string | null;
  reversalOfId: string | null;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string };
  lines: {
    id: string;
    accountId: string;
    description: string | null;
    debit: number;
    credit: number;
    account: { id: string; code: string; name: string };
  }[];
}

interface Account {
  id: string;
  code: string;
  name: string;
}

const entrySchema = z.object({
  date: z.string().optional(),
  concept: z.string().min(1, 'El concepto es obligatorio'),
  reference: z.string().optional(),
});

const lineSchema = z.object({
  accountId: z.string().min(1, 'Selecciona una cuenta'),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  description: z.string().optional(),
});

type EntryFormData = z.infer<typeof entrySchema>;
type LineFormData = z.infer<typeof lineSchema>;

interface LineRow extends LineFormData {
  id: string;
}

const lineEmpty = (): LineRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  accountId: '',
  debit: 0,
  credit: 0,
  description: '',
});

const defaultDate = () => new Date().toISOString().split('T')[0];

const statusBadge: Record<JournalEntry['status'], string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  BOOKED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabel: Record<JournalEntry['status'], string> = {
  DRAFT: 'Borrador',
  BOOKED: 'Contabilizado',
  CANCELLED: 'Anulado',
};

export default function JournalPage() {
  const user = useAuthStore((state) => state.user);
  const canManage = user != null && ['ADMIN', 'MANAGER'].includes(user.role);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [conceptFilter, setConceptFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lines, setLines] = useState<LineRow[]>([]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [detail, setDetail] = useState<JournalEntry | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
  });

  const fetchEntries = async () => {
    try {
      const response = await api.get('/journal');
      setEntries(response.data);
    } catch {
      setError('Error al cargar los asientos contables');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      setAccounts(response.data);
    } catch {
      setAccounts([]);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
  }, []);

  const filteredEntries = useMemo(() => {
    const concept = conceptFilter.trim().toLowerCase();
    return entries.filter((entry) => {
      if (statusFilter !== 'ALL' && entry.status !== statusFilter) return false;
      if (concept && !entry.concept.toLowerCase().includes(concept)) return false;
      return true;
    });
  }, [entries, statusFilter, conceptFilter]);

  const totalDebits = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0),
    [lines],
  );
  const totalCredits = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0),
    [lines],
  );

  const totalsBalanced = totalDebits === totalCredits;
  const canSubmit =
    lines.length >= 2 && totalsBalanced && totalDebits > 0;

  const openCreate = () => {
    setFormError(null);
    reset({
      date: defaultDate(),
      concept: '',
      reference: '',
    });
    setLines([lineEmpty(), lineEmpty()]);
    setModalOpen(true);
  };

  const updateLine = (id: string, patch: Partial<LineFormData>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const addLine = () => {
    setLines((prev) => [...prev, lineEmpty()]);
  };

  const onSubmit = async (data: EntryFormData) => {
    const parsed = lines.map((line) => lineSchema.safeParse(line));
    const invalidLine = parsed.find((result) => !result.success);
    if (invalidLine) {
      setFormError('Revisa las líneas del asiento: cuenta seleccionada e importes válidos');
      return;
    }
    if (lines.length < 2) {
      setFormError('El asiento debe tener al menos 2 líneas');
      return;
    }
    if (!totalsBalanced || totalDebits <= 0) {
      setFormError('El total de débitos debe ser igual al total de créditos y mayor a cero');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        date: data.date || undefined,
        concept: data.concept,
        reference: data.reference || undefined,
        lines: parsed.map((result) => {
          const line = result.data!;
          return {
            accountId: line.accountId,
            description: line.description || undefined,
            debit: line.debit,
            credit: line.credit,
          };
        }),
      };
      await api.post('/journal', payload);
      setModalOpen(false);
      fetchEntries();
    } catch {
      setFormError('Error al crear el asiento contable');
    } finally {
      setSaving(false);
    }
  };

  const handleBook = async (entry: JournalEntry) => {
    if (!confirm(`¿Contabilizar el asiento ${numberLabel(entry.number)}?`)) return;
    try {
      await api.post(`/journal/${entry.id}/book`);
      fetchEntries();
    } catch {
      setError('Error al contabilizar el asiento');
    }
  };

  const handleCancel = async (entry: JournalEntry) => {
    if (!confirm(`¿Anular el asiento ${numberLabel(entry.number)}?`)) return;
    try {
      await api.post(`/journal/${entry.id}/cancel`);
      fetchEntries();
    } catch {
      setError('Error al anular el asiento');
    }
  };

  const numberLabel = (number: number) => `ASNT-${String(number).padStart(4, '0')}`;

  const inputClassName =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500';
  const labelClassName = 'block text-sm font-medium text-gray-700';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ScrollText className="h-6 w-6" />
            Asientos Contables
          </h1>
          <p className="mt-1 text-sm text-gray-600">Gestión de asientos contables</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Nuevo asiento
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 bg-white shadow rounded-lg p-4 flex flex-wrap items-center gap-4">
        <div className="w-48">
          <label htmlFor="journal-status" className={labelClassName}>Estado</label>
          <select
            id="journal-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputClassName}
          >
            <option value="ALL">Todos</option>
            <option value="DRAFT">Borrador</option>
            <option value="BOOKED">Contabilizado</option>
            <option value="CANCELLED">Anulado</option>
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label htmlFor="journal-concept" className={labelClassName}>Buscar por concepto</label>
          <input
            id="journal-concept"
            type="text"
            value={conceptFilter}
            onChange={(e) => setConceptFilter(e.target.value)}
            placeholder="Buscar asientos..."
            className={inputClassName}
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay asientos contables</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Débitos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Créditos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado por</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry) => {
                const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
                const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {numberLabel(entry.number)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.concept}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.reference ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {totalDebit.toLocaleString('es-PA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {totalCredit.toLocaleString('es-PA', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.createdBy.firstName} {entry.createdBy.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge[entry.status]}`}>
                        {statusLabel[entry.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setDetail(entry)}
                        className="text-gray-500 hover:text-primary-600 mr-3"
                        aria-label="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canManage && entry.status === 'DRAFT' && (
                        <>
                          <button
                            onClick={() => handleBook(entry)}
                            className="text-green-600 hover:text-green-800 mr-3"
                            aria-label="Contabilizar"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCancel(entry)}
                            className="text-red-600 hover:text-red-900"
                            aria-label="Anular"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        title="Nuevo asiento contable"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="journal-date" className={labelClassName}>Fecha</label>
              <input
                id="journal-date"
                type="date"
                {...register('date')}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="journal-reference" className={labelClassName}>Referencia</label>
              <input
                id="journal-reference"
                type="text"
                {...register('reference')}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="journal-concept" className={labelClassName}>Concepto</label>
            <input
              id="journal-concept"
              type="text"
              {...register('concept')}
              className={inputClassName}
            />
            {errors.concept && <p className="mt-1 text-sm text-red-600">{errors.concept.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClassName}>Líneas</label>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg"
              >
                <Plus className="h-3 w-3" />
                Agregar línea
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line) => (
                <div key={line.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div>
                    <label className={`${labelClassName} text-xs`}>Cuenta</label>
                    <select
                      value={line.accountId}
                      onChange={(e) => updateLine(line.id, { accountId: e.target.value })}
                      className={inputClassName}
                    >
                      <option value="">Selecciona una cuenta</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} — {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`${labelClassName} text-xs`}>Débito</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit}
                        onChange={(e) => updateLine(line.id, { debit: Number(e.target.value) })}
                        className={inputClassName}
                      />
                    </div>
                    <div>
                      <label className={`${labelClassName} text-xs`}>Crédito</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit}
                        onChange={(e) => updateLine(line.id, { credit: Number(e.target.value) })}
                        className={inputClassName}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`${labelClassName} text-xs`}>Descripción</label>
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, { description: e.target.value })}
                      className={inputClassName}
                    />
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-3 w-3" />
                      Eliminar línea
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <div className="text-sm">
                <span className="text-gray-500">Débitos:</span>{' '}
                <span className="font-mono text-gray-900">
                  {totalDebits.toLocaleString('es-PA', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Créditos:</span>{' '}
                <span className="font-mono text-gray-900">
                  {totalCredits.toLocaleString('es-PA', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <span className={`text-xs font-semibold ${totalsBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {totalsBalanced ? 'Balanceado' : 'Desbalanceado'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Crear asiento'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detail != null}
        title={detail ? `Asiento ${numberLabel(detail.number)}` : ''}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Fecha</div>
                <div className="font-medium text-gray-900">{detail.date}</div>
              </div>
              <div>
                <div className="text-gray-500">Referencia</div>
                <div className="font-medium text-gray-900">{detail.reference ?? '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Concepto</div>
                <div className="font-medium text-gray-900">{detail.concept}</div>
              </div>
              <div>
                <div className="text-gray-500">Creado por</div>
                <div className="font-medium text-gray-900">
                  {detail.createdBy.firstName} {detail.createdBy.lastName}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge[detail.status]}`}>
                  {statusLabel[detail.status]}
                </span>
              </div>
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Débito</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crédito</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {detail.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <span className="font-mono">{line.account.code}</span> — {line.account.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{line.description ?? '—'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 font-mono">
                        {line.debit.toLocaleString('es-PA', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 font-mono">
                        {line.credit.toLocaleString('es-PA', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}