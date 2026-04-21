import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HiOutlineX } from 'react-icons/hi';
import medidasWebp from '@/assets/medidas.webp';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MeasureGuideModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="measure-guide"
          role="dialog"
          aria-modal="true"
          aria-label="Guia de medidas"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/92 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[90vh] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-king-black/80 text-king-bone backdrop-blur-sm transition hover:border-king-red hover:text-king-red md:-right-2 md:-top-2"
              aria-label="Fechar guia de medidas"
            >
              <HiOutlineX className="text-xl" />
            </button>
            <img
              src={medidasWebp}
              alt="Guia de medidas KING Oversized"
              className="mx-auto max-h-[88vh] w-full object-contain"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
