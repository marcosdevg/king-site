import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineX, HiOutlineSearch, HiCheck } from 'react-icons/hi';
import { STAMPS, STAMP_CATEGORIES, type Stamp } from '@/assets/estampas';
import { cn } from '@/utils/cn';
import { getLenisRoot } from '@/lib/lenisRoot';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedId: string | null;
  onSelect: (stamp: Stamp | null) => void;
  /** Ex.: “Verso da peça (costas)” para distinguir da estampa da frente. */
  headingNote?: string;
  /**
   * `undefined`: todas as estampas do catálogo.
   * Array: apenas ids permitidos para esta peça (admin).
   */
  allowedStampIds?: string[] | null;
}

const ALL = '__all__';

export default function StampSelector({
  open,
  onClose,
  selectedId,
  onSelect,
  headingNote,
  allowedStampIds,
}: Props) {
  const [category, setCategory] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(selectedId);

  const catalogStamps = useMemo(() => {
    if (allowedStampIds === undefined || allowedStampIds === null) return STAMPS;
    if (allowedStampIds.length === 0) return [];
    const set = new Set(allowedStampIds);
    return STAMPS.filter((s) => set.has(s.id));
  }, [allowedStampIds]);

  const categoriesInCatalog = useMemo(() => {
    const set = new Set(catalogStamps.map((s) => s.category));
    return STAMP_CATEGORIES.filter((c) => set.has(c));
  }, [catalogStamps]);

  useEffect(() => {
    if (open) {
      setPendingId(selectedId);
      setQuery('');
    }
  }, [open, selectedId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    getLenisRoot()?.stop();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      getLenisRoot()?.start();
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogStamps.filter((s) => {
      const matchCat = category === ALL ? true : s.category === category;
      const matchQuery = q.length === 0 ? true : s.name.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [category, query, catalogStamps]);

  const confirm = () => {
    const chosen = catalogStamps.find((s) => s.id === pendingId) ?? null;
    onSelect(chosen);
    onClose();
  };

  const clearSelection = () => {
    setPendingId(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 top-[5vh] bottom-[5vh] z-[91] mx-auto flex max-w-5xl flex-col overflow-hidden rounded-xl border border-white/10 bg-king-jet md:inset-x-8"
            role="dialog"
            aria-modal="true"
            data-lenis-prevent
          >
            <div className="flex shrink-0 items-start justify-between gap-6 border-b border-white/5 px-6 py-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-red">
                  Personalização KING
                </p>
                <h2 className="mt-1 heading-display text-2xl text-king-bone md:text-3xl">
                  ESCOLHA SUA ESTAMPA
                </h2>
                {headingNote && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.28em] text-king-red/90">
                    {headingNote}
                  </p>
                )}
                <p className="mt-1 font-serif italic text-xs text-king-silver/70">
                  {catalogStamps.length} artes disponíveis. Escolha a que vai viver com você.
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-king-silver transition hover:border-king-red hover:text-king-bone"
                aria-label="Fechar"
              >
                <HiOutlineX className="text-lg" />
              </button>
            </div>

            <div className="flex shrink-0 flex-col gap-4 border-b border-white/5 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div className="relative max-w-xs">
                <HiOutlineSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-king-silver/60" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar estampa..."
                  className="w-full rounded-xl border border-white/10 bg-king-black/60 py-2.5 pl-9 pr-3 font-mono text-[11px] uppercase tracking-[0.2em] text-king-bone placeholder:text-king-silver/40 focus:border-king-red focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CategoryChip
                  label="Todas"
                  active={category === ALL}
                  onClick={() => setCategory(ALL)}
                />
                {categoriesInCatalog.map((c) => (
                  <CategoryChip
                    key={c}
                    label={c}
                    active={category === c}
                    onClick={() => setCategory(c)}
                  />
                ))}
              </div>
            </div>

            <div
              data-lenis-prevent
              className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-6 py-5"
            >
              {filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <p className="heading-display text-lg text-king-bone">Nenhuma estampa encontrada</p>
                  <p className="font-serif italic text-sm text-king-silver/60">
                    Tente outro termo ou categoria.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {filtered.map((stamp) => {
                    const isSelected = pendingId === stamp.id;
                    return (
                      <motion.button
                        key={stamp.id}
                        onClick={() => setPendingId(stamp.id)}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        className={cn(
                          'group relative flex aspect-square flex-col overflow-hidden rounded-xl border bg-king-black/50 p-3 text-left transition',
                          isSelected
                            ? 'border-king-red bg-king-red/[0.08]'
                            : 'border-white/10 hover:border-king-red/60'
                        )}
                      >
                        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
                          <img
                            src={stamp.src}
                            alt={stamp.name}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-king-silver">
                            {stamp.name}
                          </p>
                          {isSelected && (
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-king-red text-king-bone">
                              <HiCheck className="text-xs" />
                            </span>
                          )}
                        </div>
                        <span className="absolute left-2 top-2 rounded-md bg-king-black/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-king-red">
                          {stamp.category}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-white/5 bg-king-black/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={clearSelection}
                className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver transition hover:text-king-red"
              >
                Sem estampa
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-white/15 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver transition hover:border-king-red hover:text-king-bone"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirm}
                  className="rounded-xl bg-king-red px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.3em] text-king-bone transition hover:bg-king-red/90"
                >
                  Confirmar estampa
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] transition',
        active
          ? 'border-king-red bg-king-red text-king-bone'
          : 'border-white/10 text-king-silver hover:border-king-red hover:text-king-bone'
      )}
    >
      {label}
    </button>
  );
}
