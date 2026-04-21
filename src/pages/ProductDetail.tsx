import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineShoppingCart,
  HiOutlineHeart,
  HiArrowNarrowLeft,
  HiOutlineSparkles,
  HiOutlinePencilAlt,
} from 'react-icons/hi';
import { Cross, Crown, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProductsStore } from '@/store/useProductsStore';
import { useCartStore } from '@/store/useCartStore';
import { formatBRL } from '@/utils/format';
import type { Product, ProductSize } from '@/services/products.service';
import { getProduct } from '@/services/products.service';
import { SEED_PRODUCTS } from '@/data/seedProducts';
import { cn } from '@/utils/cn';
import StampSelector from '@/components/products/StampSelector';
import MeasureGuideModal from '@/components/products/MeasureGuideModal';
import { STAMPS, type Stamp } from '@/assets/estampas';
import {
  getEffectiveBackStampIds,
  getEffectiveFrontStampIds,
  productAllowsBackStamps,
  productAllowsFrontStamps,
} from '@/utils/productStamps';
import {
  FRONT_LOGO_STAMPS,
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

  const stampCountLabel = useMemo(() => {
    if (!product) return `${STAMPS.length}+ opções exclusivas`;
    if (product.allowedBackStampIds === undefined)
      return `${STAMPS.length}+ opções exclusivas`;
    const n = getEffectiveBackStampIds(product).length;
    return `${n} opç${n === 1 ? 'ão' : 'ões'} nesta peça`;
  }, [product]);

  const allowsBackStamps = useMemo(
    () => (product ? productAllowsBackStamps(product) : false),
    [product]
  );
  const allowsFrontStamps = useMemo(
    () => (product ? productAllowsFrontStamps(product) : false),
    [product]
  );
  const frontOptions = useMemo(() => {
    if (!product) return FRONT_LOGO_STAMPS;
    const ids = getEffectiveFrontStampIds(product);
    return FRONT_LOGO_STAMPS.filter((o) => ids.includes(o.id));
  }, [product]);
  const backStampIdsForModal = useMemo(() => {
    if (!product) return undefined as string[] | undefined;
    if (product.allowedBackStampIds === undefined) return undefined;
    return getEffectiveBackStampIds(product);
  }, [product]);

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
        <h2 className="heading-display text-3xl text-king-bone">Peça não encontrada</h2>
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

  return (
    <main className="relative bg-king-black py-16">
      <div className="light-rays opacity-20" />
      <div className="container-king relative">
        <Link
          to="/produtos"
          className="mb-8 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver hover:text-king-red"
        >
          <HiArrowNarrowLeft /> Voltar à coleção
        </Link>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          {/* Gallery */}
          <div>
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
            {product.tag && (
              <span className="self-start bg-king-red/88 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.3em] text-king-bone">
                {product.tag}
              </span>
            )}

            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver">
              {product.category.replace('-', ' ')}
            </p>

            <h1 className="mt-2 heading-display text-4xl md:text-6xl leading-[0.95] text-king-bone">
              {product.name}
            </h1>

            <div className="mt-6 flex items-baseline gap-4">
              <span className="heading-display text-3xl text-king-bone">
                {formatBRL(product.price)}
              </span>
              {product.oldPrice && (
                <span className="font-mono text-sm text-king-silver/50 line-through">
                  {formatBRL(product.oldPrice)}
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.25em] text-king-silver/70">
              Em até 6x de {formatBRL(product.price / 6)} sem juros
            </p>

            <div className="my-8 h-px w-full bg-gradient-to-r from-king-red/22 to-transparent" />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-serif text-base leading-relaxed text-king-silver/90 md:text-lg"
            >
              {product.description}
            </motion.p>

            {allowsBackStamps && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6"
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
                    <span className="heading-display text-base text-king-bone md:text-lg">
                      {stamp.name}
                    </span>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setStampOpen(true)}
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver transition hover:text-king-bone"
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
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStampOpen(true)}
                  className="group flex w-full items-center justify-between gap-4 border border-white/15 bg-king-black/30 p-4 text-left transition hover:border-king-red hover:bg-king-red/[0.05]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-king-red/40 text-king-red transition group-hover:bg-king-red group-hover:text-king-bone">
                      <HiOutlineSparkles className="text-lg" />
                    </span>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-bone">
                        Selecionar estampa (costas)
                      </p>
                      <p className="mt-0.5 font-serif italic text-xs text-king-silver/70">
                        Arte no verso da peça. {stampCountLabel}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver transition group-hover:text-king-red">
                    Abrir →
                  </span>
                </motion.button>
              )}
            </motion.div>
            )}

            {allowsFrontStamps && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5"
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver">
                Estampa frente
              </p>
              <p className="mt-1 font-serif italic text-xs text-king-silver/70">
                Logo oficial KING —{' '}
                {frontOptions.length === FRONT_LOGO_STAMPS.length
                  ? 'escolha uma das três cores para o peito.'
                  : `${frontOptions.length} opç${frontOptions.length === 1 ? 'ão' : 'ões'} disponí${frontOptions.length === 1 ? 'vel' : 'veis'} nesta peça.`}
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

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver">
                  Tamanho
                </p>
                <button
                  type="button"
                  onClick={() => setMeasureGuideOpen(true)}
                  className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-red hover:underline"
                >
                  Guia de medidas
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={cn(
                      'h-12 min-w-[52px] border px-4 font-mono text-sm uppercase tracking-[0.25em] transition',
                      size === s
                        ? 'border-king-red bg-king-red text-king-bone shadow-glow-red'
                        : 'border-white/15 text-king-silver hover:border-king-red hover:text-king-bone'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver">
                Quantidade
              </p>
              <div className="inline-flex items-center border border-white/15">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-11 w-11 text-king-silver hover:text-king-red"
                >
                  −
                </button>
                <span className="min-w-[52px] text-center font-display text-base text-king-bone">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="h-11 w-11 text-king-silver hover:text-king-red"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
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
                className="flex h-14 w-14 items-center justify-center border border-white/15 text-king-silver transition hover:border-king-red hover:text-king-red"
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
                  className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-king-glow"
                >
                  ⚡ Apenas {product.stock} peças em estoque
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mt-10 grid grid-cols-3 gap-3 border-t border-white/5 pt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/80 sm:gap-4">
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
