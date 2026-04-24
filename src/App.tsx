import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomCursor from '@/components/ui/CustomCursor';
import LoadingScreen from '@/components/ui/LoadingScreen';
import PageTransition from '@/components/ui/PageTransition';
import CartDrawer from '@/components/cart/CartDrawer';
import ScrollToTop from '@/components/layout/ScrollToTop';
import SmoothScroll from '@/components/layout/SmoothScroll';
import RouteErrorBoundary from '@/components/layout/RouteErrorBoundary';

import Home from '@/pages/Home';
import Products from '@/pages/Products';
import ProductDetail from '@/pages/ProductDetail';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Admin from '@/pages/Admin';
import NotFound from '@/pages/NotFound';

import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useStampsStore } from '@/store/useStampsStore';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';

import bendoFloat from '@/assets/bendo.png';
import { HiOutlineDownload } from 'react-icons/hi';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useFreezeRecovery } from '@/hooks/useFreezeRecovery';

function App() {
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const initAuth = useAuthStore((s) => s.init);
  const theme = useThemeStore((s) => s.theme);
  const fetchStamps = useStampsStore((s) => s.fetch);
  const pwa = usePWAInstall();
  useFreezeRecovery();

  useEffect(() => {
    const unsub = initAuth();
    return () => unsub();
  }, [initAuth]);

  useEffect(() => {
    void fetchStamps();
  }, [fetchStamps]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {loading && <LoadingScreen key="loader" />}
      </AnimatePresence>

      <CustomCursor />
      <ScrollToTop />
      <SmoothScroll>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#0a0a0a',
              color: '#faf7f0',
              border: '1px solid rgba(220,20,60,0.2)',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.02em',
            },
          }}
        />

        <div className="relative min-h-screen">
          <Navbar />
          <CartDrawer />

          <RouteErrorBoundary key={location.pathname}>
            <PageTransition key={location.pathname}>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/produtos" element={<Products />} />
                <Route path="/produtos/:id" element={<ProductDetail />} />
                <Route path="/carrinho" element={<Cart />} />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Register />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PageTransition>
          </RouteErrorBoundary>

          <Footer />

          <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-center gap-2">
            {pwa.canShow && (
              <button
                type="button"
                onClick={pwa.promptInstall}
                aria-label="Instalar app KING"
                title="Instalar app KING"
                className="group flex h-11 w-11 items-center justify-center rounded-full bg-king-red text-king-bone shadow-[0_8px_28px_rgba(220,20,60,0.5)] transition hover:scale-105 hover:bg-king-glow md:h-12 md:w-12"
              >
                <HiOutlineDownload className="text-xl md:text-2xl" />
              </button>
            )}
            <img
              src={bendoFloat}
              alt=""
              aria-hidden="true"
              className="pointer-events-none h-16 w-auto opacity-80 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)] md:h-20"
            />
          </div>
        </div>
      </SmoothScroll>
    </>
  );
}

export default App;
