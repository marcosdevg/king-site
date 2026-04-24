import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineCheck,
} from 'react-icons/hi';
import { Layers } from 'lucide-react';
import { cn } from '@/utils/cn';
import GlowButton from '@/components/ui/GlowButton';
import {
  addProductToCollection,
  createCollection,
  deleteCollection,
  removeProductFromCollection,
  updateCollection,
  type ProductCollection,
} from '@/services/collections.service';
import { useCollectionsStore } from '@/store/useCollectionsStore';
import { useProductsStore } from '@/store/useProductsStore';
import { useThemeStore } from '@/store/useThemeStore';

export default function CollectionsTab() {
  const collections = useCollectionsStore((s) => s.collections);
  const invalidateCollections = useCollectionsStore((s) => s.invalidate);
  const products = useProductsStore((s) => s.products);
  const fetchProducts = useProductsStore((s) => s.fetch);
  const isLight = useThemeStore((s) => s.theme === 'light');

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [managing, setManaging] = useState<ProductCollection | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([invalidateCollections(), fetchProducts()]);
      } finally {
        setLoading(false);
      }
    })();
  }, [invalidateCollections, fetchProducts]);

  const reload = async () => {
    await invalidateCollections();
    const fresh = useCollectionsStore.getState().collections.find((c) => c.id === managing?.id);
    if (fresh) setManaging(fresh);
    else setManaging(null);
  };

  const onCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Informe um nome');
      return;
    }
    try {
      setCreating(true);
      await createCollection({
        name,
        order: collections.length,
      });
      toast.success('Coleção criada');
      setNewName('');
      await invalidateCollections();
    } catch {
      toast.error('Erro ao criar coleção');
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Apagar esta coleção? (produtos não são apagados)')) return;
    try {
      await deleteCollection(id);
      toast.success('Coleção removida');
      await invalidateCollections();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="spinner-crown" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-5 w-5 text-king-red" aria-hidden />
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver">
            {collections.length} coleção(ões)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCreate()}
            placeholder="Nome da nova coleção"
            className="input-king min-w-[220px]"
          />
          <GlowButton onClick={onCreate} disabled={creating}>
            <HiOutlinePlus /> {creating ? 'Criando…' : 'Criar coleção'}
          </GlowButton>
        </div>
      </div>

      {collections.length === 0 ? (
        <div
          className={cn(
            'border p-10 text-center font-serif italic',
            isLight
              ? 'border-black/[0.08] bg-white text-king-ink/70'
              : 'border-white/5 bg-king-jet/40 text-king-silver/70'
          )}
        >
          Nenhuma coleção criada ainda. Crie a primeira acima.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <CollectionCard
              key={c.id}
              collection={c}
              products={products}
              onManage={() => setManaging(c)}
              onDelete={() => onDelete(c.id)}
              isLight={isLight}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {managing && (
          <ManageCollectionModal
            collection={managing}
            allProducts={products}
            onClose={() => setManaging(null)}
            onChanged={reload}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CollectionCard({
  collection,
  products,
  onManage,
  onDelete,
  isLight,
}: {
  collection: ProductCollection;
  products: Array<{ id: string; name: string; images: string[] }>;
  onManage: () => void;
  onDelete: () => void;
  isLight: boolean;
}) {
  const itemsInCollection = useMemo(
    () => products.filter((p) => collection.productIds.includes(p.id)),
    [products, collection.productIds]
  );
  const preview = itemsInCollection.slice(0, 3);

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden border transition hover:border-king-red/50',
        isLight
          ? 'border-black/[0.08] bg-white shadow-sm'
          : 'border-white/5 bg-king-jet/40'
      )}
    >
      <div className="relative aspect-[4/3] ">
        {preview.length > 0 ? (
          <div className="grid h-full w-full grid-cols-3 gap-px">
            {preview.map((p) => (
              <img
                key={p.id}
                src={p.images[0]}
                alt=""
                className="h-full w-full object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-king-silver/40">
            <Layers className="h-12 w-12" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-king-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver">
            {itemsInCollection.length} produto(s)
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="heading-display text-lg text-king-fg">{collection.name}</h3>
        <div className="mt-auto flex gap-2">
          <button
            type="button"
            onClick={onManage}
            className="flex-1 border border-king-red/50 bg-king-red/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-king-fg transition hover:border-king-red hover:bg-king-red/20"
          >
            <HiOutlinePencil className="mr-1 inline" /> Gerenciar produtos
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Apagar coleção"
            className="flex h-9 w-9 items-center justify-center border border-white/10 text-king-silver hover:border-red-500 hover:text-red-500"
          >
            <HiOutlineTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageCollectionModal({
  collection,
  allProducts,
  onClose,
  onChanged,
}: {
  collection: ProductCollection;
  allProducts: Array<{ id: string; name: string; images: string[]; category: string }>;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const isLight = useThemeStore((s) => s.theme === 'light');
  const [search, setSearch] = useState('');
  const [name, setName] = useState(collection.name);
  const [savingName, setSavingName] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ids = collection.productIds;

  useEffect(() => {
    setName(collection.name);
  }, [collection.id, collection.name]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q)
    );
  }, [allProducts, search]);

  const toggle = async (productId: string) => {
    if (busy) return;
    setBusy(productId);
    try {
      if (ids.includes(productId)) {
        await removeProductFromCollection(collection.id, productId);
      } else {
        await addProductToCollection(collection.id, productId);
      }
      await onChanged();
    } catch {
      toast.error('Erro ao atualizar');
    } finally {
      setBusy(null);
    }
  };

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === collection.name) return;
    try {
      setSavingName(true);
      await updateCollection(collection.id, { name: trimmed });
      toast.success('Nome atualizado');
      await onChanged();
    } catch {
      toast.error('Erro ao renomear');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed left-1/2 top-1/2 z-[81] flex h-[min(85dvh,800px)] w-[90vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border',
          isLight
            ? 'border-black/10 bg-white shadow-xl'
            : 'border-neutral-900 bg-king-jet/95'
        )}
      >
        <header
          className={cn(
            'flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4',
            isLight ? 'border-black/10 bg-stone-50' : 'border-neutral-900 bg-king-black/40'
          )}
        >
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-red">
              Gerenciar coleção
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-king flex-1 heading-display text-lg"
              />
              {name.trim() !== collection.name && (
                <button
                  type="button"
                  onClick={saveName}
                  disabled={savingName}
                  className="flex h-10 w-10 items-center justify-center border border-king-red/50 bg-king-red/10 text-king-red hover:bg-king-red/20"
                  aria-label="Salvar nome"
                >
                  <HiOutlineCheck />
                </button>
              )}
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
              {ids.length} produto(s) na coleção
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-white/10 text-king-silver hover:border-king-red hover:text-king-fg"
            aria-label="Fechar"
          >
            <HiOutlineX />
          </button>
        </header>

        <div className="shrink-0 border-b border-white/5 px-5 py-3">
          <div className="relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-king-silver" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto por nome ou categoria"
              className="input-king pl-10"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {filtered.length === 0 ? (
            <p className="py-10 text-center font-serif italic text-king-silver/70">
              Nenhum produto encontrado.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filtered.map((p) => {
                const inCollection = ids.includes(p.id);
                const isBusy = busy === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => toggle(p.id)}
                      className={cn(
                        'flex w-full items-center gap-3 border p-3 text-left transition disabled:opacity-60',
                        inCollection
                          ? 'border-king-red/60 bg-king-red/[0.08]'
                          : isLight
                            ? 'border-black/10 bg-white hover:border-king-red/40'
                            : 'border-white/10 bg-king-black/40 hover:border-king-red/40'
                      )}
                    >
                      <div className="h-14 w-12 shrink-0 overflow-hidden ">
                        <img
                          src={p.images[0]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate heading-display text-sm text-king-fg">
                          {p.name}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/70">
                          {p.category}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs',
                          inCollection
                            ? 'border-king-red bg-king-red text-king-bone'
                            : 'border-white/20 text-king-silver'
                        )}
                      >
                        {inCollection ? <HiOutlineCheck /> : <HiOutlinePlus />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </motion.div>
    </>
  );
}
