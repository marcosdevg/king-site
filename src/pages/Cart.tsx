import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineMinus,
  HiArrowNarrowRight,
} from 'react-icons/hi';
import { useCartStore } from '@/store/useCartStore';
import { FRONT_LOGO_PRETO_ID, kingLogoPretoOnDarkImgClass } from '@/assets/logos';
import { cn } from '@/utils/cn';
import { formatBRL } from '@/utils/format';
import GlowButton from '@/components/ui/GlowButton';
import KingLogo from '@/components/ui/KingLogo';

export default function Cart() {
  const { items, updateQty, remove, subtotal, clear } = useCartStore();
  const navigate = useNavigate();
  const total = subtotal();
  const shipping = total >= 299 || total === 0 ? 0 : 29.9;
  const finalTotal = total + shipping;

  return (
    <main className="relative min-h-screen bg-king-black py-16">
      <div className="light-rays opacity-20" />
      <div className="container-king relative">
        <div className="mb-10 flex flex-col items-start gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-king-red">
            Seu reino
          </span>
          <h1 className="heading-display text-5xl md:text-7xl text-king-bone">
            SACOLA <span className="text-gradient-red">REAL</span>
          </h1>
        </div>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-5 py-28 text-center"
          >
            <KingLogo variant="bordo" className="h-24 w-auto opacity-35 sm:h-28" />
            <h2 className="heading-display text-2xl text-king-bone">Sua sacola está vazia</h2>
            <p className="max-w-md font-serif italic text-king-silver/70">
              Um rei não anda sem suas vestes. Vá até a coleção e encontre a peça que te pertence.
            </p>
            <Link to="/produtos">
              <GlowButton>
                Explorar coleção <HiArrowNarrowRight />
              </GlowButton>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              <AnimatePresence>
                {items.map((item) => {
                  const stampId = item.stamp?.id ?? undefined;
                  const stampFrontId = item.stampFront?.id ?? undefined;
                  return (
                  <motion.div
                    layout
                    key={`${item.productId}-${item.size}-${item.stamp?.id ?? 'nostamp'}-${item.stampFront?.id ?? 'nofront'}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    className="glass group flex flex-col gap-4 p-4 sm:flex-row sm:gap-6 sm:p-5"
                  >
                    <Link
                      to={`/produtos/${item.productId}`}
                      className="relative h-40 w-full shrink-0 overflow-hidden sm:h-40 sm:w-32"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />
                      {item.stampFront && (
                        <span className="absolute left-1 top-1 flex h-10 w-10 items-center justify-center rounded-sm border border-white/25 bg-king-black/80">
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
                        <span className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-sm border border-king-red/50 bg-king-black/80">
                          <img
                            src={item.stamp.src}
                            alt=""
                            className="max-h-full max-w-full object-contain"
                          />
                        </span>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <Link
                          to={`/produtos/${item.productId}`}
                          className="heading-display text-xl text-king-bone transition hover:text-king-glow"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver/70">
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
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="inline-flex items-center border border-white/10">
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
                            className="h-10 w-10 text-king-silver hover:text-king-red"
                          >
                            <HiOutlineMinus className="mx-auto text-sm" />
                          </button>
                          <span className="min-w-[40px] text-center font-display text-sm text-king-bone">
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
                            className="h-10 w-10 text-king-silver hover:text-king-red"
                          >
                            <HiOutlinePlus className="mx-auto text-sm" />
                          </button>
                        </div>
                        <div className="flex items-center gap-6">
                          <p className="heading-display text-xl text-king-bone">
                            {formatBRL(item.price * item.quantity)}
                          </p>
                          <button
                            onClick={() =>
                              remove(item.productId, item.size, stampId, stampFrontId)
                            }
                            className="text-king-silver/70 transition hover:text-king-red"
                            aria-label="Remover"
                          >
                            <HiOutlineTrash className="text-lg" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  );
                })}
              </AnimatePresence>

              <div className="flex items-center justify-between pt-4">
                <Link
                  to="/produtos"
                  className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver hover:text-king-red"
                >
                  ← Continuar comprando
                </Link>
                <button
                  onClick={clear}
                  className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver hover:text-king-red"
                >
                  Limpar sacola
                </button>
              </div>
            </div>

            <motion.aside
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass h-fit p-6 lg:sticky lg:top-28"
            >
              <h3 className="heading-display mb-5 text-lg tracking-[0.25em] text-king-bone">
                RESUMO
              </h3>
              <div className="space-y-3 border-b border-white/10 pb-5 text-sm">
                <div className="flex justify-between text-king-silver">
                  <span>Subtotal</span>
                  <span>{formatBRL(total)}</span>
                </div>
                <div className="flex justify-between text-king-silver">
                  <span>Frete</span>
                  <span>{shipping === 0 ? 'Grátis' : formatBRL(shipping)}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-[11px] font-mono uppercase tracking-[0.25em] text-king-glow">
                    Faltam {formatBRL(299 - total)} para frete grátis
                  </p>
                )}
              </div>
              <div className="mt-5 flex items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver">
                  Total
                </span>
                <span className="heading-display text-3xl text-king-bone">
                  {formatBRL(finalTotal)}
                </span>
              </div>
              <p className="mt-1 text-right font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/60">
                Em até 6x de {formatBRL(finalTotal / 6)}
              </p>
              <GlowButton
                fullWidth
                className="mt-6"
                onClick={() => navigate('/checkout')}
              >
                Ir ao checkout <HiArrowNarrowRight />
              </GlowButton>
              <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/60">
                🔒 Checkout seguro & criptografado
              </p>
            </motion.aside>
          </div>
        )}
      </div>
    </main>
  );
}
