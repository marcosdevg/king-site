import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineShoppingCart,
  HiOutlineHeart,
  HiArrowNarrowLeft,
  HiOutlinePencilAlt,
} from 'react-icons/hi';
import { Cross, Crown, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProductsStore } from '@/store/useProductsStore';
import { useCartStore } from '@/store/useCartStore';
import { useStampsStore } from '@/store/useStampsStore';
import { formatBRL } from '@/utils/format';
import type { Product, ProductSize } from '@/services/products.service';
import { getProduct } from '@/services/products.service';
import { SEED_PRODUCTS } from '@/data/seedProducts';
import { cn } from '@/utils/cn';
import StampSelector from '@/components/products/StampSelector';
import MeasureGuideModal from '@/components/products/MeasureGuideModal';
import type { Stamp } from '@/assets/estampas';
import {
  getEffectiveBackStampIds,
  getEffectiveFrontStampIds,
  productAllowsBackStamps,
  productAllowsFrontStamps,
} from '@/utils/productStamps';
import {
  FRONT_LOGO_PRETO_ID,
  kingLogoPretoOnDarkImgClass,
  type FrontLogoStamp,
} from '@/assets/logos';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const storeProducts = useProductsStore((s) => s.products);
  const fetchStore = useProductsStore((s) => s.fetch);
  const fetched = useProductsStore((s) => s.fetched);
  const add = useCartStore((s) => s.add);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [size, setSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [stampFront, setStampFront] = useState<FrontLogoStamp | null>(null);
  const [stampOpen, setStampOpen] = useState(false);
  const [measureGuideOpen, setMeasureGuideOpen] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);

  const mergedFront = useStampsStore((s) => s.mergedFront);

  const allowsBackStamps = useMemo(
    () => (product ? productAllowsBackStamps(product) : false),
    [product]
  );
  const allowsFrontStamps = useMemo(
    () => (product ? productAllowsFrontStamps(product) : false),
    [product]
  );
  const frontOptions = useMemo(() => {
    if (!product) return mergedFront;
    const ids = getEffectiveFrontStampIds(product);
    return mergedFront.filter((o) => ids.includes(o.id));
  }, [product, mergedFront]);
  const backStampIdsForModal = useMemo(() => {
    if (!product) return undefined as string[] | undefined;
    if (product.allowedBackStampIds === undefined) return undefined;
    return getEffectiveBackStampIds(product);
  }, [product]);

  const mobileSteps = useMemo(() => {
    const steps: Array<'info' | 'back' | 'front'> = ['info'];
    if (allowsBackStamps) steps.push('back');
    if (allowsFrontStamps) steps.push('front');
    return steps;
  }, [allowsBackStamps, allowsFrontStamps]);
  const totalMobileSteps = mobileSteps.length;
  const currentStepKey = mobileSteps[mobileStep - 1] ?? 'info';
  const isLastMobileStep = mobileStep >= totalMobileSteps;

  useEffect(() => {
    setMobileStep(1);
  }, [product?.id]);

  useEffect(() => {
    if (mobileStep > totalMobileSteps) setMobileStep(1);
  }, [mobileStep, totalMobileSteps]);

  useEffect(() => {
    if (!product) return;
    const backs = getEffectiveBackStampIds(product);
    setStamp((prev) => (prev && !backs.includes(prev.id) ? null : prev));
    const fronts = getEffectiveFrontStampIds(product);
    setStampFront((prev) => (prev && !fronts.includes(prev.id) ? null : prev));
  }, [product]);

  useEffect(() => {
    if (!fetched) fetchStore();
  }, [fetched, fetchStore]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const local = storeProducts.find((p) => p.id === id);
      if (local) {
        setProduct(local);
        setLoading(false);
        return;
      }
      try {
        const remote = await getProduct(id);
        if (remote) {
          setProduct(remote);
        } else {
          const seed = SEED_PRODUCTS.find((p) => p.id === id);
          if (seed) setProduct(seed);
        }
      } catch {
        const seed = SEED_PRODUCTS.find((p) => p.id === id);
        if (seed) setProduct(seed);
      }
      setLoading(false);
    };
    load();
  }, [id, storeProducts]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="spinner-crown" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h2 className="heading-display text-3xl text-king-fg">Peça não encontrada</h2>
        <Link to="/produtos" className="font-mono text-xs uppercase tracking-[0.3em] text-king-red">
          ← Voltar para a coleção
        </Link>
      </main>
    );
  }

  const buildCartItem = () => ({
    productId: product!.id,
    name: product!.name,
    price: product!.price,
    image: product!.images[0],
    size: size as ProductSize,
    quantity,
    stamp: stamp
      ? { id: stamp.id, name: stamp.name, src: stamp.src }
      : null,
    stampFront: stampFront
      ? { id: stampFront.id, name: stampFront.name, src: stampFront.src }
      : null,
  });

  const addToCart = () => {
    if (!size) {
      toast.error('Selecione um tamanho');
      return;
    }
    add(buildCartItem());
    const bits: string[] = [];
    if (stamp) bits.push(`costas: ${stamp.name}`);
    if (stampFront) bits.push(`frente: ${stampFront.name}`);
    toast.success(
      bits.length > 0 ? `Adicionado (${bits.join(' · ')})` : 'Adicionado à sacola real'
    );
  };

  const buyNow = () => {
    if (!size) {
      toast.error('Selecione um tamanho');
      return;
    }
    add(buildCartItem());
    navigate('/checkout');
  };

  const scrollStepTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const goNextMobileStep = () => {
    if (currentStepKey === 'info' && !size) {
      toast.error('Selecione um tamanho');
      return;
    }
    setMobileStep((s) => Math.min(totalMobileSteps, s + 1));
    scrollStepTop();
  };
  const goPrevMobileStep = () => {
    setMobileStep((s) => Math.max(1, s - 1));
    scrollStepTop();
  };

  return (
    <main className="relative bg-king-black py-8 md:py-16">
      <div className="light-rays opacity-20" />
      <div className="container-king relative">
        <Link
          to="/produtos"
          className="mb-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver hover:text-king-red md:mb-8 md:text-[11px] md:tracking-[0.3em]"
        >
          <HiArrowNarrowLeft /> Voltar à coleção
        </Link>

        {totalMobileSteps > 1 && (
          <div className="md:hidden mb-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              {mobileSteps.map((_, i) => {
                const n = i + 1;
                const isCurrent = n === mobileStep;
                const isDone = n < mobileStep;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[12px] font-semibold transition-all',
                        isCurrent
                          ? 'border-king-red bg-king-red text-king-bone shadow-glow-red'
                          : isDone
                          ? 'border-king-red/60 bg-king-red/20 text-king-red'
                          : 'border-white/20 bg-transparent text-king-silver'
                      )}
                    >
                      {n}
                    </span>
                    {n < totalMobileSteps && (
                      <span
                        className={cn(
                          'h-[2px] w-6 transition-all',
                          isDone ? 'bg-king-red/60' : 'bg-white/15'
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
              Passo {mobileStep} de {totalMobileSteps}
              {' · '}
              {currentStepKey === 'info'
                ? 'Peça & tamanho'
                : currentStepKey === 'back'
                ? 'Estampa costas'
                : 'Estampa frente'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
          {/* Gallery */}
          <div className={cn(currentStepKey !== 'info' && 'hidden md:block')}>
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative aspect-[3/4] overflow-hidden bg-king-graphite"
            >
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 shadow-inner-glow pointer-events-none" />
            </motion.div>

            {product.images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      'aspect-square overflow-hidden border transition',
                      selectedImage === i
                        ? 'border-king-red shadow-glow-red'
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    )}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col"
          >
            <div
              className={cn(
                'flex flex-col',
                currentStepKey !== 'info' && 'hidden md:flex'
              )}
            >
              {product.tag && (
                <span className="self-start bg-king-red/88 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-king-bone">
                  {product.tag}
                </span>
              )}

              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver md:mt-4 md:text-[11px] md:tracking-[0.3em]">
                {product.category.replace('-', ' ')}
              </p>

              <h1 className="mt-1 heading-display text-2xl leading-[0.95] text-king-fg md:mt-2 md:text-6xl">
                {product.name}
              </h1>

              <div className="mt-3 flex items-baseline gap-3 md:mt-6 md:gap-4">
                <span className="heading-display text-xl text-king-fg md:text-3xl">
                  {formatBRL(product.price)}
                </span>
                {product.oldPrice && (
                  <span className="font-mono text-xs text-king-silver/50 line-through md:text-sm">
                    {formatBRL(product.oldPrice)}
                  </span>
                )}
              </div>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-king-silver/70 md:text-[11px] md:tracking-[0.25em]">
                Em até 6x de {formatBRL(product.price / 6)} sem juros
              </p>

              <div className="my-4 h-px w-full bg-gradient-to-r from-king-red/22 to-transparent md:my-8" />

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="font-serif text-sm leading-relaxed text-king-silver/90 md:text-lg"
              >
                {product.description}
              </motion.p>
            </div>

            {allowsBackStamps && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'mt-6',
                currentStepKey !== 'back' && 'hidden md:block'
              )}
            >
              {stamp ? (
                <motion.div
                  layout
                  className="flex items-center gap-4 border border-king-red/40 bg-king-red/[0.06] p-3 md:p-4"
                >
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden bg-king-black/60 md:h-24 md:w-24">
                    <img
                      src={stamp.src}
                      alt={stamp.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-red">
                      Estampa costas
                    </span>
                    <span className="heading-display text-base text-king-fg md:text-lg">
                      {stamp.name}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setStampOpen(true)}
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver transition hover:text-king-fg"
                      >
                        <HiOutlinePencilAlt /> Trocar
                      </button>
                      <button
                        onClick={() => setStamp(null)}
                        className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/70 transition hover:text-king-red"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="pdp-stamp-cta-sweep">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStampOpen(true)}
                    className="group flex w-full items-center justify-between gap-4 rounded-md border border-white/10 bg-king-black/92 p-4 text-left shadow-inner transition hover:border-king-red/40 hover:bg-king-red/[0.06] md:p-5"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <Crown
                        className={cn(
                          'h-7 w-7 shrink-0 transition md:h-8 md:w-8',
                          'text-white [html.light_&]:text-king-ink',
                          'group-hover:text-white [html.light_&]:group-hover:text-white'
                        )}
                        strokeWidth={1.35}
                        aria-hidden
                      />
                      <p className="font-mono text-sm uppercase leading-snug tracking-[0.22em] text-king-fg sm:text-base md:text-lg">
                        Selecionar estampa (costas)
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs uppercase tracking-[0.28em] text-king-silver transition group-hover:text-king-red sm:text-sm">
                      Abrir →
                    </span>
                  </motion.button>
                </div>
              )}
            </motion.div>
            )}

            {allowsFrontStamps && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'mt-5',
                currentStepKey !== 'front' && 'hidden md:block'
              )}
            >
              <p className="font-mono text-sm uppercase tracking-[0.24em] text-king-fg sm:text-base md:text-lg">
                Estampa frente
              </p>
              <div
                className={cn(
                  'mt-3 grid gap-2 sm:gap-3',
                  frontOptions.length === 1 && 'grid-cols-1',
                  frontOptions.length === 2 && 'grid-cols-2',
                  frontOptions.length >= 3 && 'grid-cols-3'
                )}
              >
                {frontOptions.map((opt) => {
                  const active = stampFront?.id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStampFront(opt)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border bg-king-black/40 p-3 transition md:p-4',
                        active
                          ? 'border-king-red bg-king-red/[0.08]'
                          : 'border-white/10 hover:border-king-red/50'
                      )}
                    >
                      <div className="flex h-14 w-full items-center justify-center md:h-16">
                        <img
                          src={opt.src}
                          alt={opt.name}
                          className={cn(
                            'max-h-full max-w-[88%] object-contain',
                            opt.id === FRONT_LOGO_PRETO_ID && kingLogoPretoOnDarkImgClass
                          )}
                        />
                      </div>
                      <span className="text-center font-mono text-[9px] uppercase leading-tight tracking-[0.18em] text-king-silver">
                        {opt.name.replace(/^KING · /, '')}
                      </span>
                    </button>
                  );
                })}
              </div>
              {stampFront && (
                <button
                  type="button"
                  onClick={() => setStampFront(null)}
                  className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/70 transition hover:text-king-red"
                >
                  Remover logo da frente
                </button>
              )}
            </motion.div>
            )}

            <div
              className={cn(
                currentStepKey !== 'info' && 'hidden md:block'
              )}
            >
              <div className="mt-5 md:mt-8">
                <div className="mb-2 flex items-center justify-between md:mb-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver md:text-[11px] md:tracking-[0.3em]">
                    Tamanho
                  </p>
                  <button
                    type="button"
                    onClick={() => setMeasureGuideOpen(true)}
                    className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-red hover:underline md:text-[11px] md:tracking-[0.3em]"
                  >
                    Guia de medidas
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={cn(
                        'h-9 min-w-[40px] border px-3 font-mono text-xs uppercase tracking-[0.2em] transition md:h-12 md:min-w-[52px] md:px-4 md:text-sm md:tracking-[0.25em]',
                        size === s
                          ? 'border-king-red bg-king-red text-king-bone shadow-glow-red'
                          : 'border-white/15 text-king-silver [html.light_&]:border-king-ink/25 [html.light_&]:text-king-ink/80 hover:border-king-red hover:text-king-fg [html.light_&]:hover:border-king-red [html.light_&]:hover:text-king-ink'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 md:mt-6">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver md:mb-3 md:text-[11px] md:tracking-[0.3em]">
                  Quantidade
                </p>
                <div className="inline-flex items-center border border-white/15 [html.light_&]:border-king-ink/25">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-9 w-9 text-king-silver hover:text-king-red md:h-11 md:w-11 [html.light_&]:text-king-ink/70 [html.light_&]:hover:text-king-red"
                  >
                    −
                  </button>
                  <span className="min-w-[40px] text-center font-display text-sm text-king-fg md:min-w-[52px] md:text-base">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="h-9 w-9 text-king-silver hover:text-king-red md:h-11 md:w-11 [html.light_&]:text-king-ink/70 [html.light_&]:hover:text-king-red"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-10 hidden flex-col gap-3 sm:flex-row md:flex">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={addToCart}
                className="btn-king flex-1 group"
              >
                <HiOutlineShoppingCart /> Adicionar à sacola
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={buyNow}
                className="btn-ghost flex-1"
              >
                Comprar agora
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="flex h-14 w-14 items-center justify-center border border-white/15 text-king-silver transition hover:border-king-red hover:text-king-red [html.light_&]:border-king-ink/25 [html.light_&]:text-king-ink/70"
                aria-label="Favoritar"
              >
                <HiOutlineHeart className="text-lg" />
              </motion.button>
            </div>

            <AnimatePresence>
              {product.stock <= 10 && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-king-glow',
                    currentStepKey !== 'info' && 'hidden md:block'
                  )}
                >
                  ⚡ Apenas {product.stock} peças em estoque
                </motion.p>
              )}
            </AnimatePresence>

            <div
              className={cn(
                'mt-10 hidden grid-cols-3 gap-3 border-t border-white/5 pt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/80 sm:gap-4 md:grid'
              )}
            >
              {[
                { Icon: Cross, text: 'Envio em 24h' },
                { Icon: Crown, text: 'Trocas em 30 dias' },
                { Icon: Lock, text: 'Pagamento seguro' },
              ].map(({ Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center justify-center gap-2 text-center"
                >
                  <Icon
                    className="h-4 w-4 shrink-0 text-king-silver/90"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Mobile step navigation */}
        <div className="md:hidden mt-8 flex gap-3">
          {mobileStep > 1 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={goPrevMobileStep}
              className="btn-ghost flex-1"
            >
              ← Voltar
            </motion.button>
          )}
          {!isLastMobileStep ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={goNextMobileStep}
              className="btn-king flex-1"
            >
              Próximo →
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={addToCart}
              className="btn-king flex-1"
            >
              Adicionar à sacola
            </motion.button>
          )}
        </div>

        {/* Mobile "Comprar agora" on last step */}
        {isLastMobileStep && (
          <div className="md:hidden mt-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={buyNow}
              className="btn-ghost w-full"
            >
              Comprar agora
            </motion.button>
          </div>
        )}
      </div>

      <StampSelector
        open={stampOpen}
        onClose={() => setStampOpen(false)}
        selectedId={stamp?.id ?? null}
        onSelect={(s) => setStamp(s)}
        headingNote="Verso da peça (costas)"
        allowedStampIds={backStampIdsForModal}
      />

      <MeasureGuideModal
        open={measureGuideOpen}
        onClose={() => setMeasureGuideOpen(false)}
      />
    </main>
  );
}
