import { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  ShoppingCart,
  Plus,
  Eye,
  Trash2,
  XCircle,
  X,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/auth.store';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  isActive: boolean;
}

interface SaleItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface Sale {
  id: string;
  number: number;
  customerName: string | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  total: number;
  createdAt: string;
  createdBy: { id: string; email: string; firstName: string; lastName: string };
  items: SaleItem[];
}

interface Line {
  productId: string;
  quantity: number;
}

const emptyLine: Line = { productId: '', quantity: 1 };

const statusStyles: Record<Sale['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<Sale['status'], string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

export default function SalesPage() {
  const user = useAuthStore((state) => state.user);
  const canManage = user != null && ['ADMIN', 'MANAGER'].includes(user.role);

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);

  const fetchSales = async () => {
    try {
      const response = await api.get<Sale[]>('/sales');
      setSales(response.data);
    } catch {
      setError('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
    api
      .get<Product[]>('/products')
      .then((res) => setProducts(res.data))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setCustomerName('');
    setLines([{ ...emptyLine }]);
    setFormError(null);
    setCreateOpen(true);
  };

  const updateLine = (index: number, patch: Partial<Line>) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  };

  const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);

  const removeLine = (index: number) =>
    setLines((prev) => prev.filter((_, i) => i !== index));

  const productsById = new Map(products.map((p) => [p.id, p]));

  const total = lines.reduce((acc, line) => {
    const product = productsById.get(line.productId);
    return acc + (product ? product.price * line.quantity : 0);
  }, 0);

  const onSubmit = async () => {
    if (lines.some((line) => !line.productId || line.quantity < 1)) {
      setFormError('Cada línea debe tener un producto y una cantidad válida');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await api.post('/sales', {
        customerName: customerName.trim() || undefined,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
      });
      setCreateOpen(false);
      fetchSales();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string | string[] } } })
        .response?.data?.message;
      setFormError(
        Array.isArray(message)
          ? message[0]
          : message ?? 'Error al registrar la venta',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (sale: Sale) => {
    if (!confirm('¿Cancelar esta venta? Se repondrá el stock.')) return;
    try {
      await api.patch(`/sales/${sale.id}`, { status: 'CANCELLED' });
      setDetailSale(null);
      fetchSales();
    } catch {
      setError('Error al cancelar la venta');
    }
  };

  const handleDelete = async (sale: Sale) => {
    if (!confirm('¿Eliminar esta venta? Se repondrá el stock.')) return;
    try {
      await api.delete(`/sales/${sale.id}`);
      setDetailSale(null);
      fetchSales();
    } catch {
      setError('Error al eliminar la venta');
    }
  };

  const numberLabel = (number: number) => `SALE-${String(number).padStart(4, '0')}`;

  const inputClassName =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500';
  const labelClassName = 'block text-sm font-medium text-gray-700';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Ventas
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Registro de ventas y punto de venta
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          Nueva venta
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : sales.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay ventas registradas</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                    {numberLabel(sale.number)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {sale.customerName ?? 'Cliente final'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.items.reduce((acc, i) => acc + i.quantity, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${sale.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[sale.status]}`}
                    >
                      {statusLabels[sale.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {sale.createdBy.firstName} {sale.createdBy.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setDetailSale(sale)}
                      className="text-gray-500 hover:text-primary-600 mr-3"
                      aria-label="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {canManage && sale.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleCancel(sale)}
                        className="text-yellow-600 hover:text-yellow-900 mr-3"
                        aria-label="Cancelar venta"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => handleDelete(sale)}
                        className="text-red-600 hover:text-red-900"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={createOpen}
        title="Nueva venta"
        onClose={() => setCreateOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
          className="space-y-4"
        >
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="sale-customer" className={labelClassName}>
              Cliente
            </label>
            <input
              id="sale-customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Cliente final"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClassName}>Productos</label>
            {lines.map((line, index) => {
              const product = productsById.get(line.productId);
              return (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={line.productId}
                    onChange={(e) => updateLine(index, { productId: e.target.value })}
                    className={inputClassName}
                  >
                    <option value="">Seleccionar producto...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id} disabled={product.stock <= 0}>
                        {product.name} ({product.sku}) — Stock: {product.stock}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(index, { quantity: Math.max(1, Number(e.target.value)) })
                    }
                    className={`${inputClassName} w-20`}
                    aria-label="Cantidad"
                  />
                  <span className="w-20 text-right text-sm text-gray-700 whitespace-nowrap">
                    {product ? `$${(product.price * line.quantity).toFixed(2)}` : '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    disabled={lines.length === 1}
                    className="text-red-600 hover:text-red-900 disabled:opacity-30"
                    aria-label="Quitar línea"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Plus className="h-4 w-4" />
              Agregar producto
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-sm font-medium text-gray-700">Total</span>
            <span className="text-xl font-bold text-gray-900">${total.toFixed(2)}</span>
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
              {saving ? 'Registrando...' : 'Registrar venta'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailSale !== null}
        title={detailSale ? `Venta ${numberLabel(detailSale.number)}` : ''}
        onClose={() => setDetailSale(null)}
      >
        {detailSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Cliente</p>
                <p className="font-medium text-gray-900">
                  {detailSale.customerName ?? 'Cliente final'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Vendedor</p>
                <p className="font-medium text-gray-900">
                  {detailSale.createdBy.firstName} {detailSale.createdBy.lastName}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Fecha</p>
                <p className="font-medium text-gray-900">
                  {new Date(detailSale.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Estado</p>
                <span
                  className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[detailSale.status]}`}
                >
                  {detailSale.status === 'CANCELLED' ? (
                    <XCircle className="h-3 w-3 mr-1" />
                  ) : detailSale.status === 'COMPLETED' ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <Clock className="h-3 w-3 mr-1" />
                  )}
                  {statusLabels[detailSale.status]}
                </span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P. unit</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {detailSale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.product.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 text-right">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">${item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="text-xl font-bold text-gray-900">${detailSale.total.toFixed(2)}</span>
            </div>

            {canManage && detailSale.status !== 'CANCELLED' && (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => handleCancel(detailSale)}
                  className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg"
                >
                  Cancelar venta
                </button>
                <button
                  onClick={() => handleDelete(detailSale)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}