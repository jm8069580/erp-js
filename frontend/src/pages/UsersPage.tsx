import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../services/api';
import { Users, Trash2, Pencil, Plus } from 'lucide-react';
import Modal from '../components/Modal';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const baseUserSchema = {
  firstName: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().min(1, 'El apellido es obligatorio'),
  email: z.string().email('Email inválido'),
  role: z.enum(['ADMIN', 'MANAGER', 'USER']),
};

const createUserSchema = z.object({
  ...baseUserSchema,
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

const editUserSchema = z.object({
  ...baseUserSchema,
  password: z.string().optional(),
});

type UserFormData = z.infer<typeof editUserSchema>;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(editing ? editUserSchema : createUserSchema),
  });

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch {
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    reset({ firstName: '', lastName: '', email: '', password: '', role: 'USER' });
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setFormError(null);
    reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role as UserFormData['role'],
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: UserFormData) => {
    const payload: Record<string, unknown> = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role,
    };
    if (data.password) {
      payload.password = data.password;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/users/${editing.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setModalOpen(false);
      fetchUsers();
    } catch {
      setFormError('Error al guardar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter((u) => u.id !== id));
    } catch {
      setError('Error al eliminar usuario');
    }
  };

  const inputClassName =
    'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500';
  const labelClassName = 'block text-sm font-medium text-gray-700';

  const roleBadge = (role: string) =>
    `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
      role === 'ADMIN'
        ? 'bg-purple-100 text-purple-800'
        : role === 'MANAGER'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-gray-100 text-gray-800'
    }`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Usuarios
          </h1>
          <p className="mt-1 text-sm text-gray-600">Gestión de usuarios del sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          Nuevo usuario
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
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay usuarios registrados</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={roleBadge(user.role)}>{user.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => openEdit(user)}
                      className="text-gray-500 hover:text-primary-600 mr-3"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
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
        title={editing ? 'Editar usuario' : 'Nuevo usuario'}
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
              <label htmlFor="user-firstName" className={labelClassName}>Nombre</label>
              <input
                id="user-firstName"
                {...register('firstName')}
                className={inputClassName}
              />
              {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
            </div>
            <div>
              <label htmlFor="user-lastName" className={labelClassName}>Apellido</label>
              <input
                id="user-lastName"
                {...register('lastName')}
                className={inputClassName}
              />
              {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="user-email" className={labelClassName}>Email</label>
            <input
              id="user-email"
              type="email"
              {...register('email')}
              className={inputClassName}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="user-password" className={labelClassName}>
              Contraseña {editing && <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span>}
            </label>
            <input
              id="user-password"
              type="password"
              {...register('password')}
              className={inputClassName}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="user-role" className={labelClassName}>Rol</label>
            <select
              id="user-role"
              {...register('role')}
              className={inputClassName}
            >
              <option value="USER">USER</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
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
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}