import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { formatBRL } from '@/utils/format';
import { WHATSAPP_NUMBER } from '@/utils/whatsapp';
import KingLogo from '@/components/ui/KingLogo';
import { cn } from '@/utils/cn';
import { useThemeStore } from '@/store/useThemeStore';

type Props = {
  orderId: string;
  total: number;
  shippingName: string;
  customerName?: string;
  onClose: () => void;
};

export default function PostCheckoutModal({
  orderId,
  total,
  shippingName,
  customerName,
  onClose,
}: Props) {
  const theme = useThemeStore((s) => s.theme);
  const isLight = theme === 'light';

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const shortId = orderId.slice(0, 10).toUpperCase();
  const waText = [
    'Olá KING 👑!',
    customerName ? `Aqui é ${customerName}.` : undefined,
    `Fiz um pedido e gostaria de acompanhamento.`,
    `• Pedido: #${shortId}`,
    `• Frete: ${shippingName}`,
    `• Total: ${formatBRL(total)}`,
  ]
    .filter(Boolean)
    .join('\n');

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;

  return createPortal(
    <div
      data-king-modal
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.25 }}
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full max-w-md overflow-hidden rounded-2xl border shadow-[0_24px_100px_rgba(0,0,0,0.75)]',
          isLight
            ? 'border-black/10 bg-white text-king-fg'
            : 'border-king-ash/40 bg-king-jet text-king-fg'
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className={cn(
            'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border transition',
            isLight
              ? 'border-black/10 text-king-silver hover:border-king-red hover:text-king-red'
              : 'border-white/10 text-king-silver hover:border-king-red hover:text-king-fg'
          )}
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={cn(
            'bg-gradient-to-b via-transparent to-transparent p-8 pt-10 text-center',
            isLight ? 'from-king-red/10' : 'from-king-red/15'
          )}
        >
          <div className="mx-auto mb-5 flex justify-center">
            <KingLogo
              variant="auto"
              className="h-14 w-auto max-w-[200px] object-contain"
              alt="KING"
            />
          </div>
          <p
            className={cn(
              'font-mono text-[10px] uppercase tracking-[0.4em]',
              isLight ? 'text-king-red' : 'text-king-red'
            )}
          >
            Pedido confirmado
          </p>
          <h2 className="heading-display mt-3 text-3xl tracking-[0.1em]">
            Obrigado por confiar em nós!
          </h2>
          <p
            className={cn(
              'mt-3 font-serif italic text-sm',
              isLight ? 'text-king-silver' : 'text-king-silver/80'
            )}
          >
            Pedido{' '}
            <span className="font-mono not-italic font-semibold">#{shortId}</span> registrado.
            Nossa equipe vai preparar a encomenda com devoção real.
          </p>
        </div>

        <div
          className={cn(
            'space-y-2 border-t px-6 py-5 text-sm',
            isLight ? 'border-black/10 text-king-silver' : 'border-white/5 text-king-silver'
          )}
        >
          <div className="flex justify-between">
            <span>Total pago</span>
            <span className="font-display font-semibold">{formatBRL(total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Frete</span>
            <span className="font-medium">{shippingName}</span>
          </div>
        </div>

        <div
          className={cn(
            'flex flex-col gap-3 border-t p-6',
            isLight ? 'border-black/10 bg-stone-50' : 'border-white/5 bg-king-black/40'
          )}
        >
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-3 rounded-md bg-[#25D366] px-6 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-black transition hover:brightness-110"
          >
            <MessageCircle className="h-5 w-5" />
            Falar com a KING
          </a>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'font-mono text-[10px] uppercase tracking-[0.3em] transition',
              isLight ? 'text-king-silver hover:text-king-red' : 'text-king-silver hover:text-king-fg'
            )}
          >
            Ir para meus pedidos →
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
