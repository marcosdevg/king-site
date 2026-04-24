import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineShoppingCart,
  HiOutlineHeart,
  HiArrowNarrowLeft,
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
  const [measureGuideOpen, setMeasureGuideOpen] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);

  const mergedFront = useStampsStore((s) => s.mergedFront);
  const mergedBack = useStampsStore((s) => s.mergedBack);

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
  const backOptions = useMemo(() => {
    if (!product) return mergedBack;
    const ids = getEffectiveBackStampIds(product);
    return mergedBack.filter((o) => ids.includes(o.id));
  }, [product, mergedBack]);

  const preview = useMemo(() => {
    const fallback = product?.images[selectedImage] ?? '';
    if (!product) return { main: fallback, cornerOverlay: null as string | null };
    const crossings = product.stampCrossings ?? [];
    const baseImageId = product.imageIds?.[selectedImage];

    const findMatch = (side: 'back' | 'front', stampId: string) => {
      // Tenta match exato (base image + stamp) primeiro.
      if (baseImageId) {
        const exact = crossings.find(
          (c) => c.side === side && c.stampId === stampId && c.productImageId === baseImageId
        );
        if (exact?.overlayImageUrl) return exact;
      }
      // Fallback: qualquer cruzamento pra essa estampa (produto sem imageIds, etc.)
      return (
        crossings.find(
          (c) => c.side === side && c.stampId === stampId && c.overlayImageUrl
        ) ?? null
      );
    };

    const backMatch = stamp ? findMatch('back', stamp.id) : null;
    const frontMatch = stampFront ? findMatch('front', stampFront.id) : null;

    if (backMatch) {
      return {
        main: backMatch.overlayImageUrl,
        cornerOverlay: frontMatch?.overlayImageUrl ?? null,
      };
    }
    if (frontMatch) {
      return { main: frontMatch.overlayImageUrl, cornerOverlay: null };
    }
    return { main: fallback, cornerOverlay: null };
  }, [product, selectedImage, stamp, stampFront]);

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
              className="relative aspect-[3/4] overflow-hidden"
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={preview.main}
                  src={preview.main}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
              <AnimatePresence>
                {preview.cornerOverlay && (
                  <motion.div
                    key={preview.cornerOverlay}
                    initial={{ opacity: 0, scale: 0.85, x: 10, y: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-3 top-3 z-[2] aspect-square w-24 overflow-hidden rounded-md border border-king-red/50 bg-king-black/80 shadow-[0_6px_24px_rgba(220,20,60,0.35)] md:w-32"
                    aria-label="Preview estampa frente"
                  >
                    <img
                      src={preview.cornerOverlay}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-king-black/85 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-king-red">
                      Frente
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
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
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm uppercase tracking-[0.24em] text-king-fg sm:text-base md:text-lg">
                  Estampa costas
                </p>
                {stamp && (
                  <button
                    type="button"
                    onClick={() => setStamp(null)}
                    className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/70 transition hover:text-king-red"
                  >
                    Remover
                  </button>
                )}
              </div>
              {backOptions.length === 0 ? (
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/60">
                  Nenhuma estampa cadastrada ainda.
                </p>
              ) : (
                <>
                  {/* Desktop: grid com scroll interno */}
                  <div
                    data-lenis-prevent
                    className="mt-3 hidden max-h-80 overflow-y-auto overscroll-y-contain rounded-md border border-white/10 bg-king-black/40 p-3 [html.light_&]:border-king-ink/15 [html.light_&]:bg-king-ink/5 md:block"
                  >
                    <div className="grid grid-cols-4 gap-3">
                      {backOptions.map((opt) => {
                        const active = stamp?.id === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setStamp(active ? null : opt)}
                            className={cn(
                              'group flex flex-col items-center gap-1.5 overflow-hidden rounded-md border p-2 transition',
                              active
                                ? 'border-king-red bg-king-red/[0.08] ring-1 ring-king-red/40'
                                : 'border-white/10 bg-king-black/30 hover:border-king-red/50 [html.light_&]:border-king-ink/15 [html.light_&]:bg-white'
                            )}
                            title={opt.name}
                          >
                            <div className="flex h-20 w-full items-center justify-center">
                              <img
                                src={opt.src}
                                alt={opt.name}
                                loading="lazy"
                                className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-[1.04]"
                              />
                            </div>
                            <span className="line-clamp-2 w-full text-center font-mono text-[9px] uppercase leading-tight tracking-[0.18em] text-king-silver">
                              {opt.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile: carrossel 3 por página + preview embaixo */}
                  <div className="mt-3 md:hidden">
                    <StampCarousel
                      items={backOptions.map((o) => ({ id: o.id, name: o.name, src: o.src }))}
                      selectedId={stamp?.id ?? null}
                      onSelect={(picked) => {
                        if (!picked) return setStamp(null);
                        const target = backOptions.find((o) => o.id === picked.id);
                        if (!target) return;
                        setStamp(stamp?.id === target.id ? null : target);
                      }}
                      pageSize={3}
                    />
                    <MobileStampPreview
                      main={preview.main}
                      productName={product.name}
                      label={stamp ? 'Visualização com estampa' : 'Visualização atual'}
                    />
                  </div>
                </>
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
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm uppercase tracking-[0.24em] text-king-fg sm:text-base md:text-lg">
                  Estampa frente
                </p>
                {stampFront && (
                  <button
                    type="button"
                    onClick={() => setStampFront(null)}
                    className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/70 transition hover:text-king-red md:hidden"
                  >
                    Remover
                  </button>
                )}
              </div>

              {/* Desktop: grid normal */}
              <div
                className={cn(
                  'mt-3 hidden gap-3 md:grid',
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

              {/* Mobile: carrossel 2 por página + preview combinado embaixo */}
              <div className="mt-3 md:hidden">
                <StampCarousel
                  items={frontOptions.map((o) => ({
                    id: o.id,
                    name: o.name.replace(/^KING · /, ''),
                    src: o.src,
                    imgExtraClass: o.id === FRONT_LOGO_PRETO_ID ? kingLogoPretoOnDarkImgClass : undefined,
                  }))}
                  selectedId={stampFront?.id ?? null}
                  onSelect={(picked) => {
                    if (!picked) return setStampFront(null);
                    const target = frontOptions.find((o) => o.id === picked.id);
                    if (!target) return;
                    setStampFront(stampFront?.id === target.id ? null : target);
                  }}
                  pageSize={2}
                />
                <MobileStampPreview
                  main={preview.main}
                  cornerOverlay={preview.cornerOverlay}
                  productName={product.name}
                  label={
                    stamp && stampFront
                      ? 'Costas + frente'
                      : stampFront
                      ? 'Visualização com logo'
                      : stamp
                      ? 'Visualização costas'
                      : 'Visualização atual'
                  }
                />
              </div>

              {stampFront && (
                <button
                  type="button"
                  onClick={() => setStampFront(null)}
                  className="mt-3 hidden font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/70 transition hover:text-king-red md:inline-block"
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

      <MeasureGuideModal
        open={measureGuideOpen}
        onClose={() => setMeasureGuideOpen(false)}
      />
    </main>
  );
}

type CarouselItem = { id: string; name: string; src: string; imgExtraClass?: string };

function StampCarousel({
  items,
  selectedId,
  onSelect,
  pageSize,
}: {
  items: CarouselItem[];
  selectedId: string | null;
  onSelect: (item: CarouselItem | null) => void;
  pageSize: number;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page >= totalPages) setPage(0);
  }, [page, totalPages]);

  useEffect(() => {
    if (!selectedId) return;
    const idx = items.findIndex((i) => i.id === selectedId);
    if (idx < 0) return;
    const targetPage = Math.floor(idx / pageSize);
    if (targetPage !== page) setPage(targetPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const start = page * pageSize;
  const visible = items.slice(start, start + pageSize);

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => canPrev && setPage((p) => p - 1)}
          disabled={!canPrev}
          aria-label="Anterior"
          className={cn(
            'flex w-10 shrink-0 items-center justify-center rounded-md border transition',
            canPrev
              ? 'border-king-red/50 bg-king-red/10 text-king-red active:scale-95'
              : 'border-white/10 text-king-silver/30'
          )}
        >
          <HiArrowNarrowLeft className="text-lg" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.22 }}
            className={cn(
              'grid flex-1 gap-2',
              pageSize === 2 && 'grid-cols-2',
              pageSize === 3 && 'grid-cols-3',
              pageSize === 4 && 'grid-cols-4'
            )}
          >
            {visible.map((opt) => {
              const active = selectedId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelect(active ? null : opt)}
                  className={cn(
                    'group flex flex-col items-center gap-1.5 overflow-hidden rounded-md border p-2 transition',
                    active
                      ? 'border-king-red bg-king-red/[0.08] ring-1 ring-king-red/40'
                      : 'border-white/10 bg-king-black/30 active:scale-[0.98] [html.light_&]:border-king-ink/15 [html.light_&]:bg-white'
                  )}
                  title={opt.name}
                >
                  <div className="flex h-16 w-full items-center justify-center">
                    <img
                      src={opt.src}
                      alt={opt.name}
                      loading="lazy"
                      className={cn(
                        'max-h-full max-w-[88%] object-contain',
                        opt.imgExtraClass
                      )}
                    />
                  </div>
                  <span className="line-clamp-2 w-full text-center font-mono text-[9px] uppercase leading-tight tracking-[0.18em] text-king-silver">
                    {opt.name}
                  </span>
                </button>
              );
            })}
            {/* placeholders pra manter grid alinhado quando última página tem menos itens */}
            {visible.length < pageSize &&
              Array.from({ length: pageSize - visible.length }).map((_, i) => (
                <div key={`ph-${i}`} aria-hidden className="invisible" />
              ))}
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => canNext && setPage((p) => p + 1)}
          disabled={!canNext}
          aria-label="Próximo"
          className={cn(
            'flex w-10 shrink-0 items-center justify-center rounded-md border transition',
            canNext
              ? 'border-king-red/50 bg-king-red/10 text-king-red active:scale-95'
              : 'border-white/10 text-king-silver/30'
          )}
        >
          <HiArrowNarrowLeft className="rotate-180 text-lg" />
        </button>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Página ${i + 1}`}
              onClick={() => setPage(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === page ? 'w-6 bg-king-red' : 'w-2 bg-white/20'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileStampPreview({
  main,
  cornerOverlay,
  productName,
  label,
}: {
  main: string;
  cornerOverlay?: string | null;
  productName: string;
  label: string;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-king-silver">
        {label}
      </span>
      <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-md border border-white/10 [html.light_&]:border-king-ink/15">
        <AnimatePresence mode="wait">
          <motion.img
            key={main}
            src={main}
            alt={productName}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <AnimatePresence>
          {cornerOverlay && (
            <motion.div
              key={cornerOverlay}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.3 }}
              className="absolute right-2 top-2 aspect-square w-16 overflow-hidden rounded-md border border-king-red/50 bg-king-black/80 shadow-[0_4px_16px_rgba(220,20,60,0.35)]"
            >
              <img
                src={cornerOverlay}
                alt=""
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0.5 left-0.5 rounded bg-king-black/85 px-1 font-mono text-[7px] uppercase tracking-[0.2em] text-king-red">
                Frente
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
