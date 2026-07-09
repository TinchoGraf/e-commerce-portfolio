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
          {/* <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} /> */}
          {/* <Route path="checkout/exito" element={<ProtectedRoute><CheckoutSuccessPage /></ProtectedRoute>} /> */}

          {/* Fase 3C — área de usuario */}
          {/* <Route path="perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} /> */}
          {/* <Route path="pedidos" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} /> */}
          {/* <Route path="pedidos/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} /> */}
          {/* <Route path="favoritos" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} /> */}

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
