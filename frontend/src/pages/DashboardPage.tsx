import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { api } from '../services/api';
import { Users, Package, ShoppingCart, TrendingUp } from 'lucide-react';

interface Stats {
  users: { total: number; active: number };
  products: { total: number; active: number };
  sales: { total: number; revenue: number };
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Stats>('/stats')
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      name: 'Usuarios',
      value: stats ? String(stats.users.total) : loading ? '...' : '—',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Productos',
      value: stats ? String(stats.products.total) : loading ? '...' : '—',
      icon: Package,
      color: 'bg-green-500',
    },
    {
      name: 'Ventas',
      value: stats ? String(stats.sales.total) : loading ? '...' : '—',
      icon: ShoppingCart,
      color: 'bg-yellow-500',
    },
    {
      name: 'Ingresos',
      value: stats ? `$${stats.sales.revenue.toFixed(2)}` : loading ? '...' : '—',
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Aquí tienes un resumen de tu negocio
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${card.color} rounded-md p-3`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.name}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {card.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Actividad reciente</h2>
        <p className="text-gray-500">No hay actividad reciente para mostrar.</p>
      </div>
    </div>
  );
}
