import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineAdjustments, HiOutlineX } from 'react-icons/hi';
import { Layers } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import SectionHeading from '@/components/ui/SectionHeading';
import { useProductsStore } from '@/store/useProductsStore';
import { useCategoriesStore } from '@/store/useCategoriesStore';
import { useCollectionsStore } from '@/store/useCollectionsStore';
import type { ProductSize } from '@/services/products.service';
import type { ProductCollection } from '@/services/collections.service';
import { cn } from '@/utils/cn';

const SIZES: ProductSize[] = ['P', 'M', 'G', 'GG', 'XGG'];

type Filter =
  | { type: 'all' }
  | { type: 'collections' }
  | { type: 'collection'; id: string }
  | { type: 'category'; id: string };

function parseFilterFromSearch(params: URLSearchParams): Filter {
  const col = params.get('collection');
  if (col) return { type: 'collection', id: col };
  if (params.get('tab') === 'collections') return { type: 'collections' };
  const cat = params.get('cat');
  if (cat) return { type: 'category', id: cat };
  return { type: 'all' };
}

export default function Products() {
  const products = useProductsStore((s) => s.products);
  const fetchProducts = useProductsStore((s) => s.fetch);
  const fetched = useProductsStore((s) => s.fetched);
  const loading = useProductsStore((s) => s.loading);

  const categories = useCategoriesStore((s) => s.categories);
  const fetchCategories = useCategoriesStore((s) => s.fetch);

  const collections = useCollectionsStore((s) => s.collections);
  const fetchCollections = useCollectionsStore((s) => s.fetch);

  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>(() => parseFilterFromSearch(params));
  const [size, setSize] = useState<ProductSize | 'all'>('all');
  const [sort, setSort] = useState<'recent' | 'price-asc' | 'price-desc'>('recent');
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    if (!fetched) void fetchProducts();
  }, [fetched, fetchProducts]);

  useEffect(() => {
    void fetchCategories();
    void fetchCollections();
  }, [fetchCategories, fetchCollections]);

  useEffect(() => {
    setFilter(parseFilterFromSearch(params));
  }, [params]);

  const chips = useMemo<Array<{ key: string; label: string; active: boolean; onClick: () => void }>>(
    () => {
      const items: Array<{ key: string; label: string; active: boolean; onClick: () => void }> = [];
      items.push({
        key: 'all',
        label: 'Todas',
        active: filter.type === 'all',
        onClick: () => applyFilter({ type: 'all' }),
      });
      items.push({
        key: 'collections',
        label: 'Coleções',
        active: filter.type === 'collections' || filter.type === 'collection',
        onClick: () => applyFilter({ type: 'collections' }),
      });
      for (const c of categories) {
        items.push({
          key: `cat-${c.id}`,
          label: c.name,
          active: filter.type === 'category' && filter.id === c.id,
          onClick: () => applyFilter({ type: 'category', id: c.id }),
        });
      }
      return items;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories, filter]
  );

  const applyFilter = (f: Filter) => {
    setFilter(f);
    const next = new URLSearchParams(params);
    next.delete('cat');
    next.delete('tab');
    next.delete('collection');
    if (f.type === 'category') next.set('cat', f.id);
    else if (f.type === 'collections') next.set('tab', 'collections');
    else if (f.type === 'collection') next.set('collection', f.id);
    setParams(next);
  };

  const activeCollection = useMemo<ProductCollection | null>(() => {
    if (filter.type !== 'collection') return null;
    return collections.find((c) => c.id === filter.id) ?? null;
  }, [filter, collections]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (filter.type === 'category') {
      list = list.filter((p) => p.category === filter.id);
    } else if (filter.type === 'collection' && activeCollection) {
      const ids = new Set(activeCollection.productIds);
      list = list.filter((p) => ids.has(p.id));
    }
    if (size !== 'all') list = list.filter((p) => p.sizes.includes(size));
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, filter, size, sort, activeCollection]);

  const showingCollectionCards = filter.type === 'collections';

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
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={c.onClick}
                className={cn(
                  'rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.25em] transition',
                  c.active
                    ? 'border-king-red bg-king-red text-king-bone shadow-glow-red'
                    : 'border-white/10 text-king-silver hover:border-king-red hover:text-king-fg'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          {!showingCollectionCards && (
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
          )}
        </div>

        {!showingCollectionCards && (
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
                    : 'border-white/10 text-king-silver hover:border-king-red hover:text-king-fg'
                )}
              >
                {s === 'all' ? 'Todos' : s}
              </button>
            ))}
          </div>
        )}

        {/* Mobile chips (Todas, Coleções, categorias) */}
        <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-3 md:hidden">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={c.onClick}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] transition',
                c.active
                  ? 'border-king-red bg-king-red text-king-bone'
                  : 'border-white/10 text-king-silver'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between md:hidden">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
            {showingCollectionCards ? `${collections.length} coleções` : `${filtered.length} peças`}
          </span>
          {!showingCollectionCards && (
            <button
              onClick={() => setMobileFilters(true)}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.3em] text-king-fg"
            >
              <HiOutlineAdjustments /> Filtros
            </button>
          )}
        </div>

        {/* Active collection breadcrumb */}
        {filter.type === 'collection' && activeCollection && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => applyFilter({ type: 'collections' })}
              className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver hover:text-king-red"
            >
              ← Todas as coleções
            </button>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/40">
              ·
            </span>
            <span className="heading-display text-lg text-king-fg">
              {activeCollection.name}
            </span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="spinner-crown" />
          </div>
        )}

        {/* Collection cards grid */}
        {showingCollectionCards ? (
          collections.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-28 text-center">
              <Layers className="h-12 w-12 text-king-silver/30" aria-hidden />
              <p className="heading-display text-2xl text-king-fg">
                Sem coleções por enquanto
              </p>
              <p className="max-w-md font-serif italic text-king-silver/70">
                O admin ainda não montou nenhuma coleção.
              </p>
            </div>
          ) : (
            <motion.div
              layout
              className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {collections.map((col) => (
                <CollectionCardPublic
                  key={col.id}
                  collection={col}
                  products={products}
                  onOpen={() => applyFilter({ type: 'collection', id: col.id })}
                />
              ))}
            </motion.div>
          )
        ) : (
          <>
            <motion.div
              layout
              className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 md:gap-7"
            >
              <AnimatePresence>
                {filtered.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </AnimatePresence>
            </motion.div>

            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-28 text-center">
                <p className="heading-display text-2xl text-king-fg">
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
          </>
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
                <h3 className="heading-display text-lg text-king-fg">Filtros</h3>
                <button onClick={() => setMobileFilters(false)}>
                  <HiOutlineX className="text-xl" />
                </button>
              </div>
              <div className="space-y-6">
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
                <div>
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
                    Ordenar
                  </p>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                    className="select-king-dark w-full font-mono text-[11px] uppercase tracking-[0.25em]"
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="price-asc">Menor preço</option>
                    <option value="price-desc">Maior preço</option>
                  </select>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

function CollectionCardPublic({
  collection,
  products,
  onOpen,
}: {
  collection: ProductCollection;
  products: Array<{ id: string; images: string[] }>;
  onOpen: () => void;
}) {
  const items = products.filter((p) => collection.productIds.includes(p.id));
  const preview = items.slice(0, 3);
  return (
    <motion.button
      layout
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group flex w-full flex-col overflow-hidden border border-white/10 bg-king-jet/40 text-left transition hover:border-king-red/60"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {preview.length > 0 ? (
          <div className="grid h-full w-full grid-cols-3 gap-[2px]">
            {preview.map((p) => (
              <img
                key={p.id}
                src={p.images[0]}
                alt=""
                className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-king-silver/30">
            <Layers className="h-14 w-14" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-king-black/85 via-king-black/20 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver">
          <span>{items.length} peça(s)</span>
          <span className="text-king-red transition group-hover:translate-x-1">Ver →</span>
        </div>
      </div>
      <div className="flex items-center justify-between p-4">
        <h3 className="heading-display text-lg text-king-fg">{collection.name}</h3>
      </div>
    </motion.button>
  );
}
