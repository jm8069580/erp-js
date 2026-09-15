import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../services/api';
import { FileText, Plus, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/auth.store';

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Invoice {
  id: string;
  number: number;
  serie: string;
  folio: number;
  date: string;
  customerId: string | null;
  customerName: string;
  saleId: string | null;
  subtotal: number;
  itbms: number;
  total: number;
  status: 'DRAFT' | 'COMPLETED' | 'ANNULLED';
  createdById: string;
  items: InvoiceItem[];
  journalEntry?: { id: string; entries: { accountCode: string; accountName: string; debit: number; credit: number }[] } | null;
}

interface Customer {
  id: string;
  name: string;
}

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'La descripción es obligatoria'),
  quantity: z.coerce.number().positive('La cantidad debe ser mayor a 0'),
  unitPrice: z.coerce.number().positive('El precio debe ser mayor a 0'),
});

const invoiceSchema = z.object({
  customerName: z.string().min(1, 'El nombre del cliente es obligatorio'),
  customerId: z.string().optional(),
  saleId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Debe agregar al menos un producto'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

const emptyForm: InvoiceFormData = {
  customerName: '',
  customerId: undefined,
  saleId: '',
  items: [{ description: '', quantity: 1, unitPrice: 0 }],
};

const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Borrador', className: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Completada', className: 'bg-green-100 text-green-800' },
  ANNULLED: { label: 'Anulada', className: 'bg-red-100 text-red-800' },
};

export default function InvoicesPage() {
  const user = useAuthStore((state) => state.user);
  const canManage = user != null && ['ADMIN', 'MANAGER'].includes(user.role);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: emptyForm,
  });

  const items = watch('items');

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices');
      setInvoices(response.data);
    } catch {
      setError('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch {
      // Customers are optional for walk-in invoices
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
  }, []);

  const filtered = invoices.filter((inv) => {
    if (statusFilter && inv.status !== statusFilter) return false;
    if (search && !inv.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => {
    setFormError(null);
    reset(emptyForm);
    setCreateOpen(true);
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const response = await api.get(`/invoices/${id}`);
      setDetailInvoice(response.data);
    } catch {
      setError('Error al cargar detalle de factura');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/invoices', {
        customerName: data.customerName,
        customerId: data.customerId || undefined,
        saleId: data.saleId || undefined,
        items: data.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
      setCreateOpen(false);
      fetchInvoices();
    } catch {
      setFormError('Error al crear la factura');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (invoice: Invoice) => {
    if (!confirm('¿Completar esta factura? Se generará la contabilidad.')) return;
    try {
      await api.post(`/invoices/${invoice.id}/complete`);
      fetchInvoices();
    } catch {
      setError('Error al completar la factura');
    }
  };

  const handleAnnul = async (invoice: Invoice) => {
    const reason = prompt('Motivo de anulación:');
    if (reason === null) return;
    try {
      await api.post(`/invoices/${invoice.id}/annul`, { reason });
      fetchInvoices();
    } catch {
      setError('Error al anular la factura');
    }
  };

  const computedTotals = (() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const itbms = subtotal * 0.07;
    const total = subtotal + itbms;
    return { subtotal, itbms, total };
  })();

  const updateItem = (index: number, field: 'description' | 'quantity' | 'unitPrice', value: string | number) => {
    const updated = [...items];
    if (field === 'description') {
      updated[index] = { ...updated[index], description: value as string };
    } else {
      updated[index] = { ...updated[index], [field]: Number(value) || 0 };
    }
    setValue('items', updated, { shouldValidate: true });
  };

  const addItem = () => {
    setValue('items', [...items, { description: '', quantity: 1, unitPrice: 0 }], { shouldValidate: true });
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setValue('items', items.filter((_, i) => i !== index), { shouldValidate: true });
  };

  const inputClassName =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500';
  const labelClassName = 'block text-sm font-medium text-gray-700';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Facturas
          </h1>
          <p className="mt-1 text-sm text-gray-600">Gestión de facturación</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Nueva factura
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Todos los estados</option>
          <option value="DRAFT">Borrador</option>
          <option value="COMPLETED">Completada</option>
          <option value="ANNULLED">Anulada</option>
        </select>
        <input
          type="text"
          placeholder="Buscar por cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay facturas registradas</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ITBMS</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    FAC-{String(inv.number).padStart(4, '0')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(inv.date).toLocaleDateString('en-CA')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {inv.customerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {money(inv.subtotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {money(inv.itbms)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                    {money(inv.total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[inv.status].className}`}>
                      {statusConfig[inv.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetail(inv.id)}
                        className="text-gray-500 hover:text-primary-600"
                        aria-label="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canManage && inv.status === 'DRAFT' && (
                        <button
                          onClick={() => handleComplete(inv)}
                          className="text-green-600 hover:text-green-800"
                          aria-label="Completar"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {canManage && inv.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleAnnul(inv)}
                          className="text-red-600 hover:text-red-900"
                          aria-label="Anular"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={createOpen} title="Nueva factura" onClose={() => setCreateOpen(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="invoice-customerName" className={labelClassName}>Nombre del cliente *</label>
              <input
                id="invoice-customerName"
                {...register('customerName')}
                className={inputClassName}
              />
              {errors.customerName && <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>}
            </div>
            <div>
              <label htmlFor="invoice-customerId" className={labelClassName}>Cliente (opcional)</label>
              <select
                id="invoice-customerId"
                {...register('customerId')}
                className={inputClassName}
              >
                <option value="">Sin asociar</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="invoice-saleId" className={labelClassName}>ID de Venta (opcional)</label>
            <input
              id="invoice-saleId"
              {...register('saleId')}
              className={inputClassName}
            />
          </div>

          <div>
            <label className={labelClassName}>Productos *</label>
            <div className="mt-2 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <label className="block text-xs text-gray-500">Descripción</label>
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      {errors.items?.[index]?.description && (
                        <p className="mt-0.5 text-xs text-red-600">{errors.items[index]?.description?.message}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="mt-0.5 text-xs text-red-600">{errors.items[index]?.quantity?.message}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500">Precio unit.</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                        className="mt-1 block w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      {errors.items?.[index]?.unitPrice && (
                        <p className="mt-0.5 text-xs text-red-600">{errors.items[index]?.unitPrice?.message}</p>
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      <label className="block text-xs text-gray-500">Subtotal</label>
                      <div className="mt-1.5 text-sm font-medium text-gray-900">
                        {money(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="mt-1.5 text-red-500 hover:text-red-700"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800"
            >
              <Plus className="h-4 w-4" />
              Agregar producto
            </button>
            {errors.items && typeof errors.items.message === 'string' && (
              <p className="mt-1 text-sm text-red-600">{errors.items.message}</p>
            )}
          </div>

          <div className="border-t border-gray-200 pt-3 space-y-1 text-right text-sm">
            <div className="text-gray-600">Subtotal: <span className="font-medium text-gray-900">{money(computedTotals.subtotal)}</span></div>
            <div className="text-gray-600">ITBMS (7%): <span className="font-medium text-gray-900">{money(computedTotals.itbms)}</span></div>
            <div className="text-gray-900 font-semibold text-base">Total: {money(computedTotals.total)}</div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creando...' : 'Crear factura'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={detailOpen} title="Detalle de factura" onClose={() => setDetailOpen(false)}>
        {detailLoading ? (
          <div className="p-4 text-center text-gray-500">Cargando...</div>
        ) : detailInvoice ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Número:</span>
                <span className="ml-2 font-medium">FAC-{String(detailInvoice.number).padStart(4, '0')}</span>
              </div>
              <div>
                <span className="text-gray-500">Fecha:</span>
                <span className="ml-2 font-medium">{new Date(detailInvoice.date).toLocaleDateString('en-CA')}</span>
              </div>
              <div>
                <span className="text-gray-500">Cliente:</span>
                <span className="ml-2 font-medium">{detailInvoice.customerName}</span>
              </div>
              <div>
                <span className="text-gray-500">Estado:</span>
                <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusConfig[detailInvoice.status].className}`}>
                  {statusConfig[detailInvoice.status].label}
                </span>
              </div>
              {detailInvoice.saleId && (
                <div>
                  <span className="text-gray-500">Venta:</span>
                  <span className="ml-2 font-medium">{detailInvoice.saleId}</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Productos</h3>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Cant.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Precio</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {detailInvoice.items.map((item, i) => (
                    <tr key={item.id ?? i}>
                      <td className="px-3 py-2 text-gray-900">{item.description}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{money(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right text-gray-900 font-medium">{money(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-1 text-right text-sm">
              <div className="text-gray-600">Subtotal: <span className="font-medium text-gray-900">{money(detailInvoice.subtotal)}</span></div>
              <div className="text-gray-600">ITBMS (7%): <span className="font-medium text-gray-900">{money(detailInvoice.itbms)}</span></div>
              <div className="text-gray-900 font-semibold text-base">Total: {money(detailInvoice.total)}</div>
            </div>

            {detailInvoice.journalEntry && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Asiento contable</h3>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cuenta</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nombre</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Debe</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Haber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailInvoice.journalEntry.entries.map((entry, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-gray-700">{entry.accountCode}</td>
                        <td className="px-3 py-2 text-gray-900">{entry.accountName}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{entry.debit > 0 ? money(entry.debit) : '—'}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{entry.credit > 0 ? money(entry.credit) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
