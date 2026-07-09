import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import * as categoriesApi from '../../api/categories';

export default function Header() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const itemCount = useCartStore((state) => state.itemCount);

  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    categoriesApi
      .getCategories()
      .then((response) => {
        if (isMounted) {
          setCategories(response.data.filter((category) => !category.parent_id));
        }
      })
      .catch(() => {
        if (isMounted) setCategories([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearchSubmit(event) {
    if (event.key !== 'Enter') return;
    const trimmed = searchTerm.trim();
    navigate(trimmed ? `/catalogo?search=${encodeURIComponent(trimmed)}` : '/catalogo');
    setMobileMenuOpen(false);
  }

  function handleUserIconClick() {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setUserMenuOpen((open) => !open);
  }

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ink-soft/10 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="shrink-0 font-display text-2xl font-bold text-brand-700">
          Tech<span className="text-accent-500">Store</span>
        </Link>

        <div className="hidden flex-1 md:block">
          <label className="relative block max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={handleSearchSubmit}
              placeholder="Buscar productos..."
              aria-label="Buscar productos"
              className="w-full rounded-full border border-ink-soft/20 bg-white py-2 pl-10 pr-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>

        <nav className="hidden items-center gap-5 md:flex">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/categoria/${category.slug}`}
              className="text-sm font-medium text-ink-soft hover:text-brand-600"
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button
            type="button"
            onClick={() => navigate('/carrito')}
            aria-label="Ver carrito"
            className="relative cursor-pointer rounded-full p-2 text-ink hover:bg-surface-alt"
          >
            <ShoppingCart size={22} />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={handleUserIconClick}
              aria-label="Cuenta de usuario"
              className="cursor-pointer rounded-full p-2 text-ink hover:bg-surface-alt"
            >
              <User size={22} />
            </button>
            {userMenuOpen && isAuthenticated && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-ink-soft/10 bg-white py-1.5 shadow-lg">
                <Link
                  to="/perfil"
                  onClick={() => setUserMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-ink hover:bg-surface-alt"
                >
                  Mi perfil
                </Link>
                <Link
                  to="/pedidos"
                  onClick={() => setUserMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-ink hover:bg-surface-alt"
                >
                  Mis pedidos
                </Link>
                <Link
                  to="/favoritos"
                  onClick={() => setUserMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-ink hover:bg-surface-alt"
                >
                  Favoritos
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-red-600 hover:bg-surface-alt"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Abrir menú"
            className="cursor-pointer rounded-full p-2 text-ink hover:bg-surface-alt md:hidden"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-ink-soft/10 px-4 pb-4 pt-3 md:hidden">
          <label className="relative mb-3 block">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={handleSearchSubmit}
              placeholder="Buscar productos..."
              aria-label="Buscar productos"
              className="w-full rounded-full border border-ink-soft/20 bg-white py-2 pl-10 pr-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <nav className="flex flex-col gap-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/categoria/${category.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-2 text-sm font-medium text-ink hover:bg-surface-alt"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
