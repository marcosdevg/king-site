import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Crown, MessageCircle, X } from 'lucide-react';
import { formatBRL } from '@/utils/format';
import { WHATSAPP_NUMBER } from '@/utils/whatsapp';

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
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

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
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-king-ash/40 bg-king-jet shadow-[0_24px_100px_rgba(0,0,0,0.75)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-king-silver hover:border-king-red hover:text-king-fg"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-b from-king-red/15 via-transparent to-transparent p-8 pt-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-king-red/40 bg-king-red/10">
            <Crown className="h-7 w-7 text-king-red" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-king-red">
            Pedido confirmado
          </p>
          <h2 className="heading-display mt-3 text-3xl tracking-[0.1em] text-king-fg">
            A realeza agradece
          </h2>
          <p className="mt-3 font-serif italic text-sm text-king-silver/80">
            Pedido{' '}
            <span className="font-mono not-italic text-king-fg">#{shortId}</span> registrado.
            Nossa equipe vai preparar a encomenda com devoção real.
          </p>
        </div>

        <div className="space-y-2 border-t border-white/5 px-6 py-5 text-sm text-king-silver">
          <div className="flex justify-between">
            <span>Total pago</span>
            <span className="font-display text-king-fg">{formatBRL(total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Frete</span>
            <span className="text-king-fg">{shippingName}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/5 bg-king-black/40 p-6">
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
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver hover:text-king-fg"
          >
            Ir para meus pedidos →
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
