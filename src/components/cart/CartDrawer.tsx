import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineX, HiOutlinePlus, HiOutlineMinus, HiOutlineTrash } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { useCartStore } from '@/store/useCartStore';
import { FRONT_LOGO_PRETO_ID, kingLogoPretoOnDarkImgClass } from '@/assets/logos';
import { useThemeStore } from '@/store/useThemeStore';
import { cn } from '@/utils/cn';
import { formatBRL } from '@/utils/format';
import GlowButton from '@/components/ui/GlowButton';
import KingLogo from '@/components/ui/KingLogo';

export default function CartDrawer() {
  const theme = useThemeStore((s) => s.theme);
  const { isOpen, close, items, updateQty, remove, subtotal } = useCartStore();
  const total = subtotal();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'fixed right-0 top-0 z-[71] flex h-full w-full max-w-md flex-col border-l bg-king-jet',
              theme === 'light' ? 'border-king-coal/15' : 'border-white/5'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-between px-6 py-5',
                theme === 'light' ? 'border-b border-king-coal/15' : 'border-b border-white/5'
              )}
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-red">
                  Sua sacola
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <KingLogo variant="auto" className="h-6 w-auto" />
                  <span
                    className={cn(
                      'heading-display text-xs tracking-[0.35em]',
                      theme === 'light' ? 'text-king-silver' : 'text-king-silver/80'
                    )}
                  >
                    CART
                  </span>
                </div>
              </div>
              <button
                onClick={close}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-king-silver transition hover:border-king-red hover:text-king-fg"
              >
                <HiOutlineX className="text-lg" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
                  <KingLogo variant="bordo" className="h-16 w-auto opacity-40" />
                  <p className="heading-display text-lg text-king-fg">Sua sacola está vazia</p>
                  <p className="font-serif italic text-sm text-king-silver/60">
                    Sem peças. Sem reinado.
                  </p>
                  <Link to="/produtos" onClick={close}>
                    <GlowButton>Explorar coleção</GlowButton>
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col gap-5">
                  {items.map((item) => {
                    const stampId = item.stamp?.id ?? undefined;
                    const stampFrontId = item.stampFront?.id ?? undefined;
                    return (
                    <motion.li
                      layout
                      key={`${item.productId}-${item.size}-${item.stamp?.id ?? 'nostamp'}-${item.stampFront?.id ?? 'nofront'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      className="group flex gap-4 border-b border-white/5 pb-5"
                    >
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                        />
                        {item.stampFront && (
                          <span
                            className="absolute left-1 top-1 flex h-8 w-8 items-center justify-center rounded-sm border border-white/25 bg-king-black/80"
                            title={`Frente: ${item.stampFront.name}`}
                          >
                            <img
                              src={item.stampFront.src}
                              alt=""
                              className={cn(
                                'max-h-full max-w-full object-contain p-0.5',
                                item.stampFront.id === FRONT_LOGO_PRETO_ID &&
                                  kingLogoPretoOnDarkImgClass
                              )}
                            />
                          </span>
                        )}
                        {item.stamp && (
                          <span
                            className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-sm border border-king-red/50 bg-king-black/80"
                            title={`Costas: ${item.stamp.name}`}
                          >
                            <img
                              src={item.stamp.src}
                              alt=""
                              className="max-h-full max-w-full object-contain"
                            />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <p className="heading-display text-sm text-king-fg">
                            {item.name}
                          </p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/70">
                            Tamanho {item.size}
                          </p>
                          {item.stamp && (
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-king-red">
                              Costas: {item.stamp.name}
                            </p>
                          )}
                          {item.stampFront && (
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver">
                              Frente: {item.stampFront.name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center border border-white/10">
                            <button
                              onClick={() =>
                                updateQty(
                                  item.productId,
                                  item.size,
                                  item.quantity - 1,
                                  stampId,
                                  stampFrontId
                                )
                              }
                              className="px-2 py-1 text-king-silver hover:text-king-red"
                            >
                              <HiOutlineMinus className="text-xs" />
                            </button>
                            <span className="px-3 font-mono text-xs text-king-fg">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQty(
                                  item.productId,
                                  item.size,
                                  item.quantity + 1,
                                  stampId,
                                  stampFrontId
                                )
                              }
                              className="px-2 py-1 text-king-silver hover:text-king-red"
                            >
                              <HiOutlinePlus className="text-xs" />
                            </button>
                          </div>
                          <p className="font-display text-sm text-king-fg">
                            {formatBRL(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          remove(item.productId, item.size, stampId, stampFrontId)
                        }
                        className="self-start text-king-silver/50 hover:text-king-red"
                      >
                        <HiOutlineTrash />
                      </button>
                    </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-white/5 bg-king-black/50 px-6 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver">
                    Subtotal
                  </span>
                  <span className="heading-display text-xl text-king-fg">
                    {formatBRL(total)}
                  </span>
                </div>
                <p className="mb-4 text-center font-serif italic text-xs text-king-silver/60">
                  Frete e impostos calculados no checkout
                </p>
                <Link to="/checkout" onClick={close} className="block">
                  <GlowButton fullWidth>Finalizar compra</GlowButton>
                </Link>
                <Link to="/carrinho" onClick={close} className="mt-3 block text-center font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver hover:text-king-red">
                  Ver sacola completa
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
