import { useAuthStore } from '../store/auth.store';
import { Users, Package, ShoppingCart, TrendingUp } from 'lucide-react';

const stats = [
  { name: 'Usuarios', value: '12', icon: Users, color: 'bg-blue-500' },
  { name: 'Productos', value: '48', icon: Package, color: 'bg-green-500' },
  { name: 'Ventas', value: '24', icon: ShoppingCart, color: 'bg-yellow-500' },
  { name: 'Ingresos', value: '$12,450', icon: TrendingUp, color: 'bg-purple-500' },
];

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

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
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stat.value}
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
