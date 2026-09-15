import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../services/api';
import { BookOpen, Plus, Pencil } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/auth.store';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  nature: string;
  parentId: string | null;
  isActive: boolean;
  _count: { children: number; journalLines: number };
}

const typeLabels: Record<string, string> = {
  ACTIVO: 'Activo',
  PASIVO: 'Pasivo',
  PATRIMONIO: 'Patrimonio',
  INGRESO: 'Ingreso',
  COSTO: 'Costo',
  GASTO: 'Gasto',
};

const natureLabels: Record<string, string> = {
  DEBITO: 'Débito',
  CREDITO: 'Crédito',
};

const defaultNature: Record<string, string> = {
  ACTIVO: 'DEBITO',
  PASIVO: 'DEBITO',
  COSTO: 'DEBITO',
  PATRIMONIO: 'CREDITO',
  INGRESO: 'CREDITO',
  GASTO: 'CREDITO',
};

const accountSchema = z.object({
  code: z.string().min(1, 'El código es obligatorio'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  type: z.enum(['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'COSTO', 'GASTO']),
  nature: z.enum(['DEBITO', 'CREDITO']),
  parentId: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

const emptyForm: AccountFormData = {
  code: '',
  name: '',
  type: 'ACTIVO',
  nature: 'DEBITO',
  parentId: undefined,
};

const editAccountSchema = z.object({
  code: z.string().min(1, 'El código es obligatorio'),
  name: z.string().min(1, 'El nombre es obligatorio'),
  isActive: z.boolean(),
});

type EditAccountFormData = z.infer<typeof editAccountSchema>;

export default function ChartOfAccountsPage() {
  const user = useAuthStore((state) => state.user);
  const canManage = user != null && ['ADMIN', 'MANAGER'].includes(user.role);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [configOpen, setConfigOpen] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configFormError, setConfigFormError] = useState<string | null>(null);
  const [configFormSuccess, setConfigFormSuccess] = useState(false);

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    watch: watchCreate,
    setValue: setValueCreate,
    formState: { errors: errorsCreate },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    watch: watchEdit,
    setValue: setValueEdit,
    formState: { errors: errorsEdit },
  } = useForm<EditAccountFormData>({
    resolver: zodResolver(editAccountSchema),
  });

  const [configSales, setConfigSales] = useState('');
  const [configItbms, setConfigItbms] = useState('');
  const [configReceivable, setConfigReceivable] = useState('');

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      setAccounts(response.data);
    } catch {
      setError('Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await api.get('/accounting/config');
      setConfigSales(response.data.salesAccountId ?? '');
      setConfigItbms(response.data.itbmsAccountId ?? '');
      setConfigReceivable(response.data.receivableAccountId ?? '');
    } catch {
      // Config may not exist yet
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchConfig();
  }, []);

  const watchedType = watchCreate('type');

  useEffect(() => {
    const nature = defaultNature[watchedType] as AccountFormData['nature'];
    if (nature) {
      setValueCreate('nature', nature);
    }
  }, [watchedType, setValueCreate]);

  const openCreate = () => {
    setFormError(null);
    resetCreate(emptyForm);
    setCreateModalOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setFormError(null);
    resetEdit({
      code: account.code,
      name: account.name,
      isActive: account.isActive,
    });
    setEditModalOpen(true);
  };

  const onCreateSubmit = async (data: AccountFormData) => {
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/accounts', {
        code: data.code,
        name: data.name,
        type: data.type,
        nature: data.nature,
        parentId: data.parentId || undefined,
      });
      setCreateModalOpen(false);
      fetchAccounts();
    } catch {
      setFormError('Error al crear la cuenta');
    } finally {
      setSaving(false);
    }
  };

  const onEditSubmit = async (data: EditAccountFormData) => {
    if (editing && !data.isActive) {
      if (!confirm('¿Está seguro de desactivar esta cuenta?')) {
        setSaving(false);
        return;
      }
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.patch(`/accounts/${editing!.id}`, data);
      setEditModalOpen(false);
      fetchAccounts();
    } catch {
      setFormError('Error al actualizar la cuenta');
    } finally {
      setSaving(false);
    }
  };

  const onConfigSubmit = async () => {
    setConfigSaving(true);
    setConfigFormError(null);
    setConfigFormSuccess(false);
    try {
      await api.patch('/accounting/config', {
        salesAccountId: configSales || null,
        itbmsAccountId: configItbms || null,
        receivableAccountId: configReceivable || null,
      });
      setConfigFormSuccess(true);
      fetchConfig();
    } catch {
      setConfigFormError('Error al guardar la configuración');
    } finally {
      setConfigSaving(false);
    }
  };

  const inputClassName =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500';
  const labelClassName = 'block text-sm font-medium text-gray-700';

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

  const groupedAccounts = accounts.reduce<Record<string, Account[]>>((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = [];
    }
    acc[account.type].push(account);
    return acc;
  }, {});

  const sortedTypeKeys = ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'COSTO', 'GASTO'].filter(
    (t) => groupedAccounts[t]?.length > 0,
  );

  const activeAccounts = accounts.filter((a) => a.isActive);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Plan de Cuentas
          </h1>
          <p className="mt-1 text-sm text-gray-600">Gestión del catálogo de cuentas contables</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Nueva cuenta
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay cuentas registradas</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Naturaleza</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hijos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asientos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                {canManage && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTypeKeys.map((type) => {
                const typeAccounts = groupedAccounts[type].sort((a, b) => a.code.localeCompare(b.code));
                return typeAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {account.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {account.parentId && <span className="text-gray-400 mr-1">└</span>}
                      {account.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeBadgeColor(account.type)}`}>
                        {typeLabels[account.type] ?? account.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        account.nature === 'DEBITO' ? 'bg-gray-100 text-gray-800' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {natureLabels[account.nature] ?? account.nature}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account._count.children}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {account._count.journalLines}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        account.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {account.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => openEdit(account)}
                          className="text-gray-500 hover:text-primary-600"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={createModalOpen}
        title="Nueva cuenta"
        onClose={() => setCreateModalOpen(false)}
      >
        <form onSubmit={handleSubmitCreate(onCreateSubmit)} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="account-code" className={labelClassName}>Código</label>
              <input
                id="account-code"
                {...registerCreate('code')}
                className={inputClassName}
                placeholder="1.1.01"
              />
              {errorsCreate.code && <p className="mt-1 text-sm text-red-600">{errorsCreate.code.message}</p>}
            </div>
            <div>
              <label htmlFor="account-name" className={labelClassName}>Nombre</label>
              <input
                id="account-name"
                {...registerCreate('name')}
                className={inputClassName}
              />
              {errorsCreate.name && <p className="mt-1 text-sm text-red-600">{errorsCreate.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="account-type" className={labelClassName}>Tipo</label>
              <select
                id="account-type"
                {...registerCreate('type')}
                className={inputClassName}
              >
                <option value="ACTIVO">Activo</option>
                <option value="PASIVO">Pasivo</option>
                <option value="PATRIMONIO">Patrimonio</option>
                <option value="INGRESO">Ingreso</option>
                <option value="COSTO">Costo</option>
                <option value="GASTO">Gasto</option>
              </select>
              {errorsCreate.type && <p className="mt-1 text-sm text-red-600">{errorsCreate.type.message}</p>}
            </div>
            <div>
              <label htmlFor="account-nature" className={labelClassName}>Naturaleza</label>
              <select
                id="account-nature"
                {...registerCreate('nature')}
                className={inputClassName}
              >
                <option value="DEBITO">Débito</option>
                <option value="CREDITO">Crédito</option>
              </select>
              {errorsCreate.nature && <p className="mt-1 text-sm text-red-600">{errorsCreate.nature.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="account-parent" className={labelClassName}>Cuenta padre (opcional)</label>
            <select
              id="account-parent"
              {...registerCreate('parentId')}
              className={inputClassName}
              defaultValue=""
            >
              <option value="">Ninguna</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editModalOpen}
        title="Editar cuenta"
        onClose={() => setEditModalOpen(false)}
      >
        <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-account-code" className={labelClassName}>Código</label>
              <input
                id="edit-account-code"
                {...registerEdit('code')}
                className={inputClassName}
              />
              {errorsEdit.code && <p className="mt-1 text-sm text-red-600">{errorsEdit.code.message}</p>}
            </div>
            <div>
              <label htmlFor="edit-account-name" className={labelClassName}>Nombre</label>
              <input
                id="edit-account-name"
                {...registerEdit('name')}
                className={inputClassName}
              />
              {errorsEdit.name && <p className="mt-1 text-sm text-red-600">{errorsEdit.name.message}</p>}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={watchEdit('isActive')}
              onChange={(e) => setValueEdit('isActive', e.target.checked, { shouldValidate: true })}
              className="h-4 w-4 text-primary-600 rounded"
            />
            Activo
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="mt-8">
        <button
          onClick={() => setConfigOpen(!configOpen)}
          className="w-full flex items-center justify-between px-6 py-4 bg-white shadow rounded-lg hover:bg-gray-50"
        >
          <span className="text-sm font-medium text-gray-900">Configuración de Cuentas por Defecto</span>
          <svg
            className={`h-5 w-5 text-gray-500 transition-transform ${configOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {configOpen && (
          <div className="mt-2 bg-white shadow rounded-lg px-6 py-5 space-y-4">
            {configFormSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                Configuración guardada correctamente
              </div>
            )}
            {configFormError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {configFormError}
              </div>
            )}

            <div>
              <label htmlFor="config-sales" className={labelClassName}>Cuenta de Ventas</label>
              <select
                id="config-sales"
                value={configSales}
                onChange={(e) => setConfigSales(e.target.value)}
                className={inputClassName}
              >
                <option value="">Ninguna</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="config-itbms" className={labelClassName}>Cuenta de ITBMS</label>
              <select
                id="config-itbms"
                value={configItbms}
                onChange={(e) => setConfigItbms(e.target.value)}
                className={inputClassName}
              >
                <option value="">Ninguna</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="config-receivable" className={labelClassName}>Cuenta por Cobrar</label>
              <select
                id="config-receivable"
                value={configReceivable}
                onChange={(e) => setConfigReceivable(e.target.value)}
                className={inputClassName}
              >
                <option value="">Ninguna</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onConfigSubmit}
                disabled={configSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {configSaving ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
