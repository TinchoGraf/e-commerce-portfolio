import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
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
          {/* <Route path="catalogo" element={<CatalogPage />} /> */}
          {/* <Route path="categoria/:slug" element={<CategoryPage />} /> */}
          {/* <Route path="producto/:slug" element={<ProductDetailPage />} /> */}

          {/* Fase 3B — carrito y autenticación */}
          {/* <Route path="carrito" element={<CartPage />} /> */}
          {/* <Route path="login" element={<LoginPage />} /> */}
          {/* <Route path="registro" element={<RegisterPage />} /> */}

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
