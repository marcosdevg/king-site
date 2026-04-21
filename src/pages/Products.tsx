import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineAdjustments, HiOutlineX } from 'react-icons/hi';
import ProductCard from '@/components/products/ProductCard';
import SectionHeading from '@/components/ui/SectionHeading';
import { useProductsStore } from '@/store/useProductsStore';
import type { ProductCategory, ProductSize } from '@/services/products.service';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_SHOP_LABELS,
} from '@/config/productCategories';
import { cn } from '@/utils/cn';

const CATEGORIES: { id: ProductCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Todas' },
  ...PRODUCT_CATEGORIES.map((id) => ({
    id,
    label: PRODUCT_CATEGORY_SHOP_LABELS[id] ?? PRODUCT_CATEGORY_LABELS[id],
  })),
];

const SIZES: ProductSize[] = ['P', 'M', 'G', 'GG', 'XGG'];

export default function Products() {
  const products = useProductsStore((s) => s.products);
  const fetch = useProductsStore((s) => s.fetch);
  const fetched = useProductsStore((s) => s.fetched);
  const loading = useProductsStore((s) => s.loading);
  const [params, setParams] = useSearchParams();
  const initialCat = (params.get('cat') as ProductCategory | 'all') ?? 'all';

  const [category, setCategory] = useState<ProductCategory | 'all'>(initialCat);
  const [size, setSize] = useState<ProductSize | 'all'>('all');
  const [sort, setSort] = useState<'recent' | 'price-asc' | 'price-desc'>('recent');
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    if (!fetched) fetch();
  }, [fetched, fetch]);

  useEffect(() => {
    setCategory(initialCat);
  }, [initialCat]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (category !== 'all') list = list.filter((p) => p.category === category);
    if (size !== 'all') list = list.filter((p) => p.sizes.includes(size));
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, category, size, sort]);

  const updateCat = (c: ProductCategory | 'all') => {
    setCategory(c);
    if (c === 'all') params.delete('cat');
    else params.set('cat', c);
    setParams(params);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-king-black pt-10 pb-24">
      <div className="light-rays opacity-20" />
      <div className="container-king relative">
        <SectionHeading
          eyebrow="A Coleção"
          title="TODAS AS PEÇAS"
          subtitle="Oversized premium. Peças feitas para reinar em qualquer contexto."
          center
        />

        <div className="mt-16 hidden md:flex items-center justify-between gap-6 border-y border-white/5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => updateCat(c.id)}
                className={cn(
                  'rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.25em] transition',
                  category === c.id
                    ? 'border-king-red bg-king-red text-king-bone shadow-glow-red'
                    : 'border-white/10 text-king-silver hover:border-king-red hover:text-king-bone'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/70">
              Ordenar
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="select-king-dark font-mono text-[11px] uppercase tracking-[0.25em]"
            >
              <option value="recent">Mais recentes</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
          </div>
        </div>

        <div className="mt-6 hidden md:flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/70">
            Tamanho:
          </span>
          {(['all', ...SIZES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s as ProductSize | 'all')}
              className={cn(
                'h-9 min-w-[38px] rounded-full border px-2 font-mono text-[11px] uppercase tracking-[0.2em] transition',
                size === s
                  ? 'border-king-red bg-king-red text-king-bone'
                  : 'border-white/10 text-king-silver hover:border-king-red hover:text-king-bone'
              )}
            >
              {s === 'all' ? 'Todos' : s}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between md:hidden">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
            {filtered.length} peças
          </span>
          <button
            onClick={() => setMobileFilters(true)}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.3em] text-king-bone"
          >
            <HiOutlineAdjustments /> Filtros
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="spinner-crown" />
          </div>
        )}

        <motion.div layout className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 md:gap-7">
          <AnimatePresence>
            {filtered.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-28 text-center">
            <p className="heading-display text-2xl text-king-bone">
              {products.length === 0 ? 'Coleção ainda vazia' : 'Nenhuma peça por aqui'}
            </p>
            <p className="max-w-md font-serif italic text-king-silver/70">
              {products.length === 0 ? (
                <>
                  Nada cadastrado no Firebase. No painel Admin use &quot;Importar demonstrativos&quot; para
                  criar as peças de exemplo (editáveis) ou cadastre suas próprias camisas.
                </>
              ) : (
                <>Tente outros filtros ou volte em breve — um novo drop está vindo.</>
              )}
            </p>
            {products.length === 0 && (
              <Link
                to="/admin"
                className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-red hover:underline"
              >
                Abrir painel admin →
              </Link>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {mobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/70"
              onClick={() => setMobileFilters(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 z-[81] rounded-t-2xl bg-king-jet p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="heading-display text-lg text-king-bone">Filtros</h3>
                <button onClick={() => setMobileFilters(false)}>
                  <HiOutlineX className="text-xl" />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
                    Categoria
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => updateCat(c.id)}
                        className={cn(
                          'rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em]',
                          category === c.id
                            ? 'border-king-red bg-king-red text-king-bone'
                            : 'border-white/10 text-king-silver'
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
                    Tamanho
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['all', ...SIZES] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s as ProductSize | 'all')}
                        className={cn(
                          'h-10 min-w-[42px] rounded-full border px-3 font-mono text-[11px]',
                          size === s
                            ? 'border-king-red bg-king-red text-king-bone'
                            : 'border-white/10 text-king-silver'
                        )}
                      >
                        {s === 'all' ? 'Todos' : s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
