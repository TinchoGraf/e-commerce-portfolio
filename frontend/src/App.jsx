import { useEffect } from 'react';
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
import AdminGuard from './components/admin/AdminGuard';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminProductFormPage from './pages/admin/AdminProductFormPage';
import { useAuthStore } from './stores/authStore';

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

        {/* Fase 4A — panel de administración */}
        <Route path="admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="productos" element={<AdminProductsPage />} />
          <Route path="productos/nuevo" element={<AdminProductFormPage />} />
          <Route path="productos/:id/editar" element={<AdminProductFormPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
