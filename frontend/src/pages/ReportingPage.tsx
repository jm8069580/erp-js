import { Fragment, useEffect, useState } from 'react';
import { api } from '../services/api';
import { BarChart3, BookOpen } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  nature: string;
  isActive: boolean;
}

interface TrialBalanceAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  nature: string;
  debit: number;
  credit: number;
  balance: number;
}

interface TrialBalance {
  accounts: TrialBalanceAccount[];
  totals: { debit: number; credit: number };
}

interface LedgerMovement {
  entryId: string;
  entryNumber: number;
  date: string;
  concept: string;
  reference?: string | null;
  description?: string | null;
  debit: number;
  credit: number;
  balance: number;
}

interface LedgerData {
  account: { id: string; code: string; name: string; type: string; nature: string };
  movements: LedgerMovement[];
}

type Mode = 'trial' | 'ledger';

const typeLabels: Record<string, string> = {
  ACTIVO: 'Activo',
  PASIVO: 'Pasivo',
  PATRIMONIO: 'Patrimonio',
  INGRESO: 'Ingreso',
  COSTO: 'Costo',
  GASTO: 'Gasto',
};

const sortedTypeKeys = ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'COSTO', 'GASTO'];

const typeBadgeColor = (type: string) => {
  switch (type) {
    case 'ACTIVO':
      return 'bg-blue-100 text-blue-800';
    case 'PASIVO':
      return 'bg-orange-100 text-orange-800';
    case 'PATRIMONIO':
      return 'bg-purple-100 text-purple-800';
    case 'INGRESO':
      return 'bg-green-100 text-green-800';
    case 'COSTO':
      return 'bg-red-100 text-red-800';
    case 'GASTO':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const moneyFormat = new Intl.NumberFormat('es-PA', {
  style: 'currency',
  currency: 'PAB',
});

const formatMoney = (amount: number) => moneyFormat.format(amount);

export default function ReportingPage() {
  const user = useAuthStore((state) => state.user);
  const canManage = user != null && ['ADMIN', 'MANAGER'].includes(user.role);

  const [mode, setMode] = useState<Mode>('trial');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trial, setTrial] = useState<TrialBalance | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountQuery, setAccountQuery] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Account[]>('/accounts')
      .then((res) => setAccounts(res.data))
      .catch(() => {});
  }, []);

  const buildParams = () => {
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    return params;
  };

  const generateTrial = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<TrialBalance>('/reporting/trial-balance', {
        params: buildParams(),
      });
      setTrial(response.data);
    } catch {
      setError('Error al generar el balance de comprobación');
    } finally {
      setLoading(false);
    }
  };

  const generateLedger = async () => {
    if (!selectedAccountId) {
      setLedgerError('Selecciona una cuenta de la lista');
      return;
    }
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const response = await api.get<LedgerData>(`/reporting/ledger/${selectedAccountId}`, {
        params: buildParams(),
      });
      setLedger(response.data);
    } catch {
      setLedgerError('Error al generar el libro mayor');
    } finally {
      setLedgerLoading(false);
    }
  };

  const onGenerate = () => {
    if (mode === 'trial') {
      void generateTrial();
    } else {
      void generateLedger();
    }
  };

  const selecting = loading || ledgerLoading;

  const periodLabel = () => {
    if (!dateFrom && !dateTo) return 'Período: todas las fechas';
    const from = dateFrom ? new Date(dateFrom).toLocaleDateString('es-PA') : 'inicio';
    const to = dateTo ? new Date(dateTo).toLocaleDateString('es-PA') : 'hoy';
    return `Período: ${from} — ${to}`;
  };

  const filteredAccounts = accounts
    .filter((account) => {
      const query = accountQuery.trim().toLowerCase();
      return (
        !query ||
        account.code.toLowerCase().includes(query) ||
        account.name.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

  const selectAccount = (account: Account) => {
    setSelectedAccountId(account.id);
    setAccountQuery(`${account.code} — ${account.name}`);
    setAccountOpen(false);
    setLedger(null);
  };

  const groupedTrial = trial
    ? trial.accounts.reduce<Record<string, TrialBalanceAccount[]>>((acc, account) => {
        if (!acc[account.type]) {
          acc[account.type] = [];
        }
        acc[account.type].push(account);
        return acc;
      }, {})
    : {};

  const inputClassName =
    'block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500';
  const labelClassName = 'block text-sm font-medium text-gray-700';

  return (
    <div>
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          {mode === 'trial' ? 'Balance de Comprobación' : 'Libro Mayor'}
        </h1>
        {mode === 'ledger' && selectedAccount && (
          <p className="text-sm text-gray-600">
            {selectedAccount.code} — {selectedAccount.name}
          </p>
        )}
        <p className="text-sm text-gray-600">{periodLabel()}</p>
      </div>

      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Reportes Contables
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Balance de comprobación y libro mayor
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Imprimir
          </button>
        )}
      </div>

      <div className="mb-6 inline-flex rounded-lg bg-gray-100 p-1 print:hidden">
        <button
          type="button"
          onClick={() => setMode('trial')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${
            mode === 'trial'
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Balance de Comprobación
        </button>
        <button
          type="button"
          onClick={() => setMode('ledger')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${
            mode === 'ledger'
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Libro Mayor
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6 print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="report-date-from" className={labelClassName}>
              Desde
            </label>
            <input
              id="report-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`${inputClassName} mt-1`}
            />
          </div>
          <div>
            <label htmlFor="report-date-to" className={labelClassName}>
              Hasta
            </label>
            <input
              id="report-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`${inputClassName} mt-1`}
            />
          </div>
          {mode === 'ledger' && (
            <div className="relative flex-1 min-w-[220px]">
              <label htmlFor="report-account" className={labelClassName}>
                Cuenta
              </label>
              <input
                id="report-account"
                value={accountQuery}
                onChange={(e) => {
                  setAccountQuery(e.target.value);
                  setSelectedAccountId('');
                  setLedger(null);
                  setAccountOpen(true);
                }}
                onFocus={() => setAccountOpen(true)}
                onBlur={() => setTimeout(() => setAccountOpen(false), 150)}
                placeholder="Buscar por código o nombre..."
                className={`${inputClassName} mt-1`}
              />
              {accountOpen && (
                <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-300 rounded-lg shadow-lg">
                  {filteredAccounts.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-gray-500">Sin resultados</li>
                  ) : (
                    filteredAccounts.slice(0, 50).map((account) => (
                      <li key={account.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectAccount(account);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span className="font-mono text-gray-500">{account.code}</span>
                          <span className={account.isActive ? 'text-gray-900' : 'text-gray-400'}>
                            {account.name}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
          <button
            onClick={onGenerate}
            disabled={selecting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selecting ? 'Generando...' : 'Generar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm print:hidden">
          {error}
        </div>
      )}
      {mode === 'ledger' && ledgerError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm print:hidden">
          {ledgerError}
        </div>
      )}

      {mode === 'trial' ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Balance de Comprobación</h2>
            <p className="text-sm text-gray-500">{periodLabel()}</p>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : !trial || trial.accounts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay movimientos para el rango seleccionado
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Débito ($)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Crédito ($)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo ($)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTypeKeys.map((type) => {
                  const typeAccounts = groupedTrial[type];
                  if (!typeAccounts?.length) return null;
                  return (
                    <Fragment key={type}>
                      <tr className="bg-gray-100">
                        <td
                          colSpan={6}
                          className="px-6 py-2 text-sm font-semibold text-gray-700 uppercase tracking-wide"
                        >
                          {typeLabels[type] ?? type}
                        </td>
                      </tr>
                      {typeAccounts.map((account) => (
                        <tr key={account.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {account.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {account.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeBadgeColor(account.type)}`}
                            >
                              {typeLabels[account.type] ?? account.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                            {formatMoney(account.debit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                            {formatMoney(account.credit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                            {formatMoney(account.balance)}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-6 py-3 text-sm font-bold text-gray-900">
                    Totales
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                    {formatMoney(trial.totals.debit)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                    {formatMoney(trial.totals.credit)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Libro Mayor</h2>
            <p className="text-sm text-gray-500">
              {selectedAccount
                ? `${selectedAccount.code} — ${selectedAccount.name} — ${periodLabel()}`
                : periodLabel()}
            </p>
          </div>
          {ledgerLoading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : !ledger ? (
            <div className="p-8 text-center text-gray-500">
              Selecciona una cuenta y rango de fechas
            </div>
          ) : ledger.movements.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay movimientos para el rango seleccionado
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº Asiento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Débito ($)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Crédito ($)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo ($)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ledger.movements.map((movement) => (
                  <tr key={movement.entryId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(movement.date).toLocaleDateString('es-PA')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                      {`ASIENTO-${String(movement.entryNumber).padStart(4, '0')}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {movement.concept}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {movement.reference ?? movement.description ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                      {formatMoney(movement.debit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                      {formatMoney(movement.credit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {formatMoney(movement.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}