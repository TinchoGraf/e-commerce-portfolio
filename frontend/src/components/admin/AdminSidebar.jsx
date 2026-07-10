import clsx from 'clsx';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  ShoppingBag,
  Ticket,
  Users,
  ExternalLink,
  LogOut,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/categorias', label: 'Categorías', icon: FolderTree },
  { to: '/admin/marcas', label: 'Marcas', icon: Tags },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { to: '/admin/cupones', label: 'Cupones', icon: Ticket },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink-soft/10 bg-surface transition-transform duration-200 lg:static lg:z-auto lg:w-[250px] lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <span className="font-display text-lg font-bold text-ink">TechStore Admin</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="cursor-pointer rounded-lg p-1.5 text-ink-soft hover:bg-surface-alt lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-surface-alt',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-1 border-t border-ink-soft/10 px-3 py-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-alt"
          >
            <ExternalLink size={18} />
            Ver tienda
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-surface-alt"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
