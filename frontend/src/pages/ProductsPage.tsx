import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../services/api';
import { Package, Trash2, Pencil, Plus } from 'lucide-react';
import Modal from '../components/Modal';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sku: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
}

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  sku: z.string().min(1, 'El SKU es obligatorio'),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  stock: z.coerce.number().min(0, 'El stock no puede ser negativo'),
  isActive: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

const emptyForm: ProductFormData = {
  name: '',
  description: '',
  sku: '',
  price: 0,
  stock: 0,
  isActive: true,
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch {
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    reset(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormError(null);
    reset({
      name: product.name,
      description: product.description ?? '',
      sku: product.sku,
      price: product.price,
      stock: product.stock,
      isActive: product.isActive,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: ProductFormData) => {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/products/${editing.id}`, data);
      } else {
        await api.post('/products', data);
      }
      setModalOpen(false);
      fetchProducts();
    } catch {
      setFormError('Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(products.filter((p) => p.id !== id));
    } catch {
      setError('Error al eliminar producto');
    }
  };

  const inputClassName =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500';
  const labelClassName = 'block text-sm font-medium text-gray-700';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6" />
            Productos
          </h1>
          <p className="mt-1 text-sm text-gray-600">Gestión de productos del inventario</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
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
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay productos registrados</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div>
                      <div>{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-gray-500 mt-0.5">{product.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{product.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.price.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      product.stock <= 0 ? 'text-red-600' : product.stock <= 5 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => openEdit(product)}
                      className="text-gray-500 hover:text-primary-600 mr-3"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="product-name" className={labelClassName}>Nombre</label>
            <input
              id="product-name"
              {...register('name')}
              className={inputClassName}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="product-description" className={labelClassName}>Descripción</label>
            <textarea
              id="product-description"
              {...register('description')}
              rows={2}
              className={inputClassName}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="product-sku" className={labelClassName}>SKU</label>
              <input
                id="product-sku"
                {...register('sku')}
                className={inputClassName}
              />
              {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>}
            </div>
            <div>
              <label htmlFor="product-price" className={labelClassName}>Precio</label>
              <input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                {...register('price', { valueAsNumber: true })}
                className={inputClassName}
              />
              {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="product-stock" className={labelClassName}>Stock</label>
              <input
                id="product-stock"
                type="number"
                min="0"
                step="1"
                {...register('stock', { valueAsNumber: true })}
                className={inputClassName}
              />
              {errors.stock && <p className="mt-1 text-sm text-red-600">{errors.stock.message}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={watch('isActive')}
                onChange={(e) => setValue('isActive', e.target.checked, { shouldValidate: true })}
                className="h-4 w-4 text-primary-600 rounded"
              />
              Activo
            </label>
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
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}