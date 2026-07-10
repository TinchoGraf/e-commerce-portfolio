import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import Toast from '../ui/Toast';

const SECTION_TITLES = {
  '/admin': 'Dashboard',
  '/admin/productos': 'Productos',
  '/admin/categorias': 'Categorías',
  '/admin/marcas': 'Marcas',
  '/admin/pedidos': 'Pedidos',
  '/admin/cupones': 'Cupones',
  '/admin/usuarios': 'Usuarios',
};

function getSectionTitle(pathname) {
  if (SECTION_TITLES[pathname]) return SECTION_TITLES[pathname];
  const match = Object.keys(SECTION_TITLES)
    .filter((path) => path !== '/admin' && pathname.startsWith(path))
    .sort((a, b) => b.length - a.length)[0];
  return match ? SECTION_TITLES[match] : 'Panel de administración';
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-surface">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-ink-soft/10 bg-surface px-4 py-4 lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            className="cursor-pointer rounded-lg p-1.5 text-ink-soft hover:bg-surface-alt lg:hidden"
          >
            <Menu size={22} />
          </button>
          <h1 className="font-display text-lg font-semibold text-ink">
            {getSectionTitle(location.pathname)}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <Toast />
    </div>
  );
}
