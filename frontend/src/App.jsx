import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import ProfilePage from './pages/ProfilePage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import WishlistPage from './pages/WishlistPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Spinner from './components/ui/Spinner';
import { useAuthStore } from './stores/authStore';

// Panel de administración: code-split del bundle público. Sólo los admins
// pagan el costo de descarga de estas rutas.
const AdminGuard = lazy(() => import('./components/admin/AdminGuard'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminProductFormPage = lazy(() => import('./pages/admin/AdminProductFormPage'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'));
const AdminBrandsPage = lazy(() => import('./pages/admin/AdminBrandsPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCouponsPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" className="text-brand-600" />
    </div>
  );
}

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />

          {/* Fase 3B — catálogo, categorías y detalle de producto */}
          <Route path="catalogo" element={<CatalogPage />} />
          <Route path="categoria/:slug" element={<CatalogPage />} />
          <Route path="producto/:slug" element={<ProductPage />} />

          {/* Fase 3B — carrito y autenticación */}
          <Route path="carrito" element={<CartPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="registro" element={<RegisterPage />} />

          {/* Fase 3C — checkout */}
          <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="checkout/exito" element={<CheckoutSuccessPage />} />

          {/* Fase 3C — área de usuario */}
          <Route path="perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="pedidos" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="pedidos/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
          <Route path="favoritos" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Fase 4 — panel de administración (lazy-loaded) */}
        <Route
          path="admin"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            </Suspense>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminDashboardPage />
              </Suspense>
            }
          />
          <Route
            path="productos"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminProductsPage />
              </Suspense>
            }
          />
          <Route
            path="productos/nuevo"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminProductFormPage />
              </Suspense>
            }
          />
          <Route
            path="productos/:id/editar"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminProductFormPage />
              </Suspense>
            }
          />
          <Route
            path="categorias"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminCategoriesPage />
              </Suspense>
            }
          />
          <Route
            path="marcas"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminBrandsPage />
              </Suspense>
            }
          />
          <Route
            path="pedidos"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminOrdersPage />
              </Suspense>
            }
          />
          <Route
            path="cupones"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminCouponsPage />
              </Suspense>
            }
          />
          <Route
            path="usuarios"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminUsersPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
