import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineShoppingCart,
  HiOutlineUser,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineLogout,
  HiOutlineSearch,
} from 'react-icons/hi';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useThemeStore } from '@/store/useThemeStore';
import { logout } from '@/services/auth.service';
import { cn } from '@/utils/cn';
import KingLogo from '@/components/ui/KingLogo';

const NAV = [
  { to: '/', label: 'Início' },
  { to: '/produtos', label: 'Coleção' },
  { to: '/produtos?cat=colecao-sacra', label: 'Sagrado' },
  { to: '/dashboard', label: 'Minha Conta' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const openCart = useCartStore((s) => s.open);
  const cartCount = useCartStore((s) => s.count());
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUserMenu(false);
    navigate('/');
  };

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-500',
          scrolled
            ? 'backdrop-blur-xl bg-king-black/80 border-b border-white/5'
            : 'bg-transparent'
        )}
      >
        <div className="container-king flex h-20 items-center justify-between">
          <Link
            to="/"
            className="group flex items-center gap-2"
            data-cursor="hover"
          >
            <KingLogo
              variant="auto"
              className="h-7 w-auto opacity-95 transition-opacity duration-300 group-hover:opacity-100 sm:h-8"
            />
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative font-mono text-[12px] uppercase tracking-[0.3em] text-king-silver transition-colors hover:text-king-bone',
                    isActive && 'text-king-bone'
                  )
                }
                data-cursor="hover"
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute -bottom-2 left-0 right-0 mx-auto h-[2px] w-5 bg-king-red"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                className="flex items-center gap-2 rounded-full border border-king-red/25 bg-king-red/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-king-glow"
              >
                Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <button
              aria-label="Buscar"
              className="hidden items-center justify-center rounded-full p-2 text-king-silver transition hover:text-king-bone md:flex"
              data-cursor="hover"
            >
              <HiOutlineSearch className="text-xl" />
            </button>

            <button
              aria-label="Alternar tema"
              onClick={toggleTheme}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-king-silver transition hover:border-king-red hover:text-king-bone"
              data-cursor="hover"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute"
                >
                  {theme === 'dark' ? (
                    <HiOutlineSun className="text-lg" />
                  ) : (
                    <HiOutlineMoon className="text-lg" />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>

            <button
              aria-label="Carrinho"
              onClick={openCart}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-king-silver transition hover:border-king-red hover:text-king-bone"
              data-cursor="hover"
            >
              <HiOutlineShoppingCart className="text-lg" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-king-red text-[10px] font-bold text-king-bone shadow-glow-red"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <div className="relative hidden md:block">
              <button
                aria-label="Usuário"
                onClick={() => {
                  if (!user) navigate('/login');
                  else setUserMenu((v) => !v);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-king-silver transition hover:border-king-red hover:text-king-bone"
                data-cursor="hover"
              >
                <HiOutlineUser className="text-lg" />
              </button>
              <AnimatePresence>
                {userMenu && user && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="glass absolute right-0 top-12 w-56 overflow-hidden rounded-md p-2"
                  >
                    <div className="border-b border-white/10 p-3">
                      <p className="truncate font-mono text-[11px] text-king-silver">
                        {user.email}
                      </p>
                      <p className="truncate font-display text-sm text-king-bone">
                        {user.displayName ?? 'Rei'}
                      </p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setUserMenu(false)}
                      className="block rounded px-3 py-2 text-sm text-king-silver hover:bg-king-red/10 hover:text-king-bone"
                    >
                      Meus Pedidos
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setUserMenu(false)}
                        className="block rounded px-3 py-2 text-sm text-king-glow hover:bg-king-red/10"
                      >
                        Painel Admin
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-king-silver hover:bg-king-red/10 hover:text-king-bone"
                    >
                      <HiOutlineLogout /> Sair
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-king-silver md:hidden"
            >
              <HiOutlineMenu className="text-lg" />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[60] flex flex-col bg-king-black md:hidden"
          >
            <div className="light-rays opacity-25" />
            <div className="flex items-center justify-between px-6 py-6">
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center">
                <KingLogo variant="white" className="h-8 w-auto sm:h-9" />
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10"
              >
                <HiOutlineX className="text-xl" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col items-start gap-6 px-8 pt-10">
              {NAV.map((item, i) => (
                <motion.div
                  key={item.to}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                >
                  <NavLink
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="heading-display text-4xl text-king-bone"
                  >
                    {item.label}
                  </NavLink>
                </motion.div>
              ))}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="heading-display text-4xl text-king-glow"
                >
                  Admin
                </NavLink>
              )}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="mt-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-king-silver"
                >
                  <HiOutlineLogout /> Sair
                </button>
              ) : (
                <NavLink
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-king-red"
                >
                  Entrar / Cadastrar
                </NavLink>
              )}
            </nav>
            <p className="px-8 pb-10 font-serif italic text-sm text-king-silver/60">
              Vista-se com o rei.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
