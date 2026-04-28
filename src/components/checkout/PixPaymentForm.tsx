import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineClipboardCopy, HiOutlineCheck } from 'react-icons/hi';
import { QRCodeSVG } from 'qrcode.react';
import { doc, onSnapshot } from 'firebase/firestore';
import { cn } from '@/utils/cn';
import { formatBRL } from '@/utils/format';
import { auth, db } from '@/services/firebase';

interface PixCreateResponse {
  id: number;
  qrCode: string;
  qrCodeBase64?: string;
  status?: string;
  ticketUrl?: string;
}

interface Props {
  /** Pedido já criado no Firestore com paymentStatus 'pending'. */
  orderId: string | null;
  total: number;
  description?: string;
  payerFirstName?: string;
  payerLastName?: string;
  payerCpf?: string;
  /** Disparado quando o webhook MP confirma o pagamento. */
  onPaid: () => void;
}

type Phase = 'idle' | 'creating' | 'awaiting' | 'paid' | 'error';

export default function PixPaymentForm({
  orderId,
  total,
  description,
  payerFirstName,
  payerLastName,
  payerCpf,
  onPaid,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pix, setPix] = useState<PixCreateResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  // 1) Cria o pagamento PIX no MP via /api/mp/pix/create.
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      setPhase('creating');
      setErrorMsg(null);
      try {
        const u = auth.currentUser;
        if (!u) throw new Error('Sessão expirada — entre novamente.');
        const idToken = await u.getIdToken();
        const res = await fetch('/api/mp/pix/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            orderId,
            amount: Number(total.toFixed(2)),
            description,
            payerFirstName,
            payerLastName,
            payerCpf,
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as PixCreateResponse;
        if (cancelled) return;
        if (!data.qrCode) throw new Error('Mercado Pago não retornou QR Code.');
        setPix(data);
        setPhase('awaiting');
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        setErrorMsg(msg);
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, total, description, payerFirstName, payerLastName, payerCpf]);

  // 2) Ouve a doc do pedido no Firestore — webhook atualiza pra paid.
  useEffect(() => {
    if (!orderId) return;
    if (phase !== 'awaiting' && phase !== 'creating') return;
    const unsub = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as Record<string, unknown>;
      const ps = data.paymentStatus;
      if (ps === 'paid') {
        setPhase('paid');
        onPaidRef.current();
      }
    });
    return () => unsub();
  }, [orderId, phase]);

  // 3) Polling fallback — caso o webhook MP não chegue, força a reconciliação
  //    pelo backend a cada 5s. Quando MP retornar 'approved', o backend marca
  //    o pedido como paid e o onSnapshot acima dispara onPaid.
  useEffect(() => {
    if (!orderId || phase !== 'awaiting') return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const u = auth.currentUser;
        if (!u) return;
        const idToken = await u.getIdToken();
        await fetch(`/api/mp/pix/status?orderId=${encodeURIComponent(orderId)}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
      } catch {
        // silencioso — só fallback
      }
    };
    void tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [orderId, phase]);

  const code = pix?.qrCode ?? '';

  const onCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Código PIX copiado');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error('Não foi possível copiar — selecione manualmente abaixo');
    }
  };

  const stateBlock = useMemo(() => {
    if (phase === 'creating') {
      return (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="spinner-crown" />
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
            Gerando QR Code seguro…
          </p>
        </div>
      );
    }
    if (phase === 'error') {
      return (
        <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-red-300">
            Erro ao gerar PIX
          </p>
          <p className="mt-2 font-serif text-sm italic text-red-200">
            {errorMsg ?? 'Tente novamente em instantes.'}
          </p>
        </div>
      );
    }
    if (phase === 'paid') {
      return (
        <div className="flex flex-col items-center gap-3 py-12">
          <HiOutlineCheck className="text-5xl text-emerald-400" />
          <p className="heading-display text-2xl text-king-fg">Pagamento confirmado!</p>
          <p className="font-serif italic text-king-silver/80">Finalizando seu pedido…</p>
        </div>
      );
    }
    return null;
  }, [phase, errorMsg]);

  if (stateBlock) return stateBlock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr]"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-lg bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
          <QRCodeSVG value={code} size={208} level="M" />
        </div>
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
          Aponte a câmera do app do banco
        </p>
        <p className="heading-display text-2xl text-king-fg">{formatBRL(total)}</p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-red">
            PIX copia e cola
          </p>
          <div className="mt-2 max-h-32 overflow-y-auto break-all rounded-md border border-white/10 bg-king-black/60 p-3 font-mono text-[11px] leading-relaxed text-king-silver">
            {code}
          </div>
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              'mt-2 inline-flex items-center gap-2 border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] transition',
              copied
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                : 'border-king-red/50 bg-king-red/10 text-king-red hover:bg-king-red/20'
            )}
          >
            {copied ? <HiOutlineCheck /> : <HiOutlineClipboardCopy />}
            {copied ? 'Copiado!' : 'Copiar código'}
          </button>
        </div>

        <ul className="flex flex-col gap-1.5 font-serif text-sm italic text-king-silver/85">
          <li>1. Abra o app do seu banco e escolha PIX.</li>
          <li>2. Escaneie o QR ou cole o "Pix copia e cola".</li>
          <li>
            3. Confirme o pagamento de{' '}
            <strong className="not-italic font-mono">{formatBRL(total)}</strong>.
          </li>
          <li>
            4. <strong className="not-italic">Pronto!</strong> Identificamos automaticamente quando
            cair na conta — você não precisa clicar em nada.
          </li>
        </ul>

        <div className="flex items-center gap-3 rounded-md border border-king-red/30 bg-king-red/[0.05] p-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-king-red/60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-king-red" />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver">
            Aguardando pagamento — esta tela atualiza sozinha
          </p>
        </div>
      </div>
    </motion.div>
  );
}
