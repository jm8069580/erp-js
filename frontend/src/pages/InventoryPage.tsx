import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../services/api';
import { Boxes, Plus } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuthStore } from '../store/auth.store';

type MovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT';

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  isActive: boolean;
}

interface Movement {
  id: string;
  number: number;
  type: MovementType;
  quantity: number;
  stockAfter: number;
  reason: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string; stock: number };
  createdBy: { id: string; email: string; firstName: string; lastName: string };
}

interface FormData {
  productId: string;
  type: MovementType;
  quantity: number;
  reason: string;
}

const typeLabels: Record<MovementType, string> = {
  ENTRY: 'Entrada',
  EXIT: 'Salida',
  ADJUSTMENT: 'Ajuste',
};

const typeStyles: Record<MovementType, string> = {
  ENTRY: 'bg-green-100 text-green-800',
  EXIT: 'bg-red-100 text-red-800',
  ADJUSTMENT: 'bg-blue-100 text-blue-800',
};

const formSchema = z.object({
  productId: z.string().min(1, 'Selecciona un producto'),
  type: z.enum(['ENTRY', 'EXIT', 'ADJUSTMENT']),
  quantity: z.coerce.number().min(0, 'La cantidad no puede ser negativa'),
  reason: z.string().optional(),
});

const emptyForm: FormData = {
  productId: '',
  type: 'ENTRY',
  quantity: 1,
  reason: '',
};

export default function InventoryPage() {
  const user = useAuthStore((state) => state.user);
  const canManage = user != null && ['ADMIN', 'MANAGER'].includes(user.role);

  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const watchType = watch('type');

  const fetchMovements = async () => {
    try {
      const response = await api.get<Movement[]>('/inventory');
      setMovements(response.data);
    } catch {
      setError('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
    api
      .get<Product[]>('/products')
      .then((res) => setProducts(res.data.filter((p) => p.isActive)))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setFormError(null);
    reset(emptyForm);
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setFormError(null);
    try {
      await api.post('/inventory', {
        ...data,
        reason: data.reason || undefined,
      });
      setModalOpen(false);
      fetchMovements();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string | string[] } } })
        .response?.data?.message;
      setFormError(
        Array.isArray(message) ? message[0] : message ?? 'Error al registrar el movimiento',
      );
    } finally {
      setSaving(false);
    }
  };

  const numberLabel = (number: number) => `MOV-${String(number).padStart(4, '0')}`;

  const inputClassName =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500';
  const labelClassName = 'block text-sm font-medium text-gray-700';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Boxes className="h-6 w-6" />
            Inventario
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Movimientos de stock con trazabilidad
          </p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Nuevo movimiento
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
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay movimientos registrados</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock final</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Razón</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {numberLabel(movement.number)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(movement.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {movement.product.name}
                    <span className="ml-2 text-xs text-gray-400 font-mono">{movement.product.sku}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeStyles[movement.type]}`}>
                      {typeLabels[movement.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {movement.type === 'ADJUSTMENT' ? movement.quantity : `${movement.type === 'ENTRY' ? '+' : movement.type === 'EXIT' ? '−' : ''}${movement.quantity}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {movement.stockAfter}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[220px] truncate">
                    {movement.reason ?? '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.createdBy.firstName} {movement.createdBy.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        title="Nuevo movimiento de inventario"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="movement-product" className={labelClassName}>Producto</label>
            <select
              id="movement-product"
              {...register('productId')}
              className={inputClassName}
            >
              <option value="">Seleccionar producto...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku}) — Stock: {product.stock}
                </option>
              ))}
            </select>
            {errors.productId && (
              <p className="mt-1 text-sm text-red-600">{errors.productId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="movement-type" className={labelClassName}>Tipo</label>
              <select
                id="movement-type"
                {...register('type')}
                className={inputClassName}
              >
                <option value="ENTRY">Entrada</option>
                <option value="EXIT">Salida</option>
                <option value="ADJUSTMENT">Ajuste (fijar stock)</option>
              </select>
            </div>
            <div>
              <label htmlFor="movement-quantity" className={labelClassName}>
                {watchType === 'ADJUSTMENT' ? 'Stock final' : 'Cantidad'}
              </label>
              <input
                id="movement-quantity"
                type="number"
                min="0"
                step="1"
                {...register('quantity', { valueAsNumber: true })}
                className={inputClassName}
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="movement-reason" className={labelClassName}>Razón</label>
            <input
              id="movement-reason"
              {...register('reason')}
              placeholder="P. ej. compra a proveedor, merma, conteo físico"
              className={inputClassName}
            />
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
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Registrando...' : 'Registrar movimiento'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}