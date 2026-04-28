import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi';
import { Loader2 } from 'lucide-react';
import GlowButton from '@/components/ui/GlowButton';
import { auth } from '@/services/firebase';
import { getMercadoPago, type MpCardFormInstance } from '@/services/mp';
import { formatBRL } from '@/utils/format';
import { cn } from '@/utils/cn';

interface Props {
  /** Total final em BRL — passado pra API e ao SDK pra calcular parcelas. */
  amount: number;
  /** Pedido já criado em Firestore (paymentStatus 'pending'). */
  orderId: string | null;
  /** Iniciar criação do pedido (chamado quando o cliente entra na aba Cartão). */
  ensureOrder: () => Promise<string | null>;
  payerCpf?: string;
  payerFirstName?: string;
  payerLastName?: string;
  /** Disparado quando o pagamento é aprovado pela MP. */
  onPaid: () => void;
  disabled?: boolean;
}

const FORM_ID = 'king-mp-card-form';

export default function MPCardForm(props: Props) {
  const {
    amount,
    orderId,
    ensureOrder,
    payerCpf,
    payerFirstName,
    payerLastName,
    onPaid,
    disabled,
  } = props;

  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cardFormRef = useRef<MpCardFormInstance | null>(null);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const ensureOrderRef = useRef(ensureOrder);
  ensureOrderRef.current = ensureOrder;
  const payerRef = useRef({ payerCpf, payerFirstName, payerLastName });
  payerRef.current = { payerCpf, payerFirstName, payerLastName };

  // Cria o pedido em background assim que o componente monta.
  useEffect(() => {
    if (!orderId) {
      void ensureOrderRef.current();
    }
  }, [orderId]);

  // Monta o cardForm do SDK MP.
  useEffect(() => {
    let cancelled = false;
    let cardForm: MpCardFormInstance | null = null;
    (async () => {
      try {
        const mp = await getMercadoPago();
        if (cancelled) return;
        cardForm = mp.cardForm({
          amount: amount.toFixed(2),
          iframe: false,
          form: {
            id: FORM_ID,
            cardNumber: { id: 'mp-cardNumber', placeholder: '0000 0000 0000 0000' },
            expirationDate: { id: 'mp-expirationDate', placeholder: 'MM/AA' },
            securityCode: { id: 'mp-securityCode', placeholder: 'CVV' },
            cardholderName: { id: 'mp-cardholderName', placeholder: 'Nome impresso' },
            issuer: { id: 'mp-issuer', placeholder: 'Banco emissor' },
            installments: { id: 'mp-installments', placeholder: 'Parcelas' },
            identificationType: { id: 'mp-identificationType', placeholder: 'Tipo' },
            identificationNumber: { id: 'mp-identificationNumber', placeholder: '000.000.000-00' },
            cardholderEmail: { id: 'mp-cardholderEmail', placeholder: 'email@exemplo.com' },
          },
          callbacks: {
            onFormMounted: (err: unknown) => {
              if (err) {
                console.error('[mp] form mount error', err);
                setSdkError('Falha ao carregar o formulário do Mercado Pago.');
              } else if (!cancelled) {
                setSdkReady(true);
              }
            },
            onSubmit: async (event: Event) => {
              event.preventDefault();
              if (!cardForm) return;
              const data = cardForm.getCardFormData();
              if (!data.token) {
                toast.error('Cartão inválido. Confira os dados.');
                return;
              }
              setSubmitting(true);
              try {
                const oid = orderId ?? (await ensureOrderRef.current());
                if (!oid) {
                  toast.error('Não foi possível registrar o pedido.');
                  return;
                }
                const u = auth.currentUser;
                if (!u) {
                  toast.error('Sessão expirada — entre novamente.');
                  return;
                }
                const idToken = await u.getIdToken();
                const res = await fetch('/api/mp/card', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                  },
                  body: JSON.stringify({
                    orderId: oid,
                    amount: Number(amount.toFixed(2)),
                    token: data.token,
                    paymentMethodId: data.paymentMethodId,
                    issuerId: data.issuerId,
                    installments: Number(data.installments),
                    description: `Pedido KING ${oid}`.slice(0, 50),
                    payerFirstName: payerRef.current.payerFirstName,
                    payerLastName: payerRef.current.payerLastName,
                    payerCpf: payerRef.current.payerCpf || data.identificationNumber,
                  }),
                });
                if (!res.ok) {
                  const errBody = (await res.json().catch(() => ({}))) as { error?: string };
                  throw new Error(errBody.error || `HTTP ${res.status}`);
                }
                const result = (await res.json()) as {
                  status: string;
                  statusDetail?: string;
                  paymentStatus?: string;
                };
                if (result.paymentStatus === 'paid' || result.status === 'approved') {
                  toast.success('Pagamento aprovado!');
                  onPaidRef.current();
                } else if (result.status === 'in_process' || result.status === 'pending') {
                  toast(
                    'Pagamento em análise pelo emissor. Você receberá uma confirmação em instantes.',
                    { icon: '⏳', duration: 6000 }
                  );
                } else {
                  toast.error(
                    `Pagamento não aprovado${result.statusDetail ? `: ${result.statusDetail}` : '.'}`
                  );
                }
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'Erro inesperado';
                toast.error(msg);
              } finally {
                setSubmitting(false);
              }
            },
            onFetching: (_resource: string) => {
              // hooks de loading internos do SDK — ignorado
            },
          },
        });
        cardFormRef.current = cardForm;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao iniciar SDK MP';
        if (!cancelled) setSdkError(msg);
      }
    })();
    return () => {
      cancelled = true;
      try {
        cardForm?.unmount();
      } catch {
        // ignore
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza valor (parcelas) caso amount mude.
  useEffect(() => {
    cardFormRef.current?.update?.({ amount: amount.toFixed(2) });
  }, [amount]);

  if (sdkError) {
    return (
      <div className="rounded-md border border-red-500/40 bg-red-500/[0.06] p-5 font-serif italic text-sm text-red-200">
        {sdkError}
      </div>
    );
  }

  return (
    <motion.form
      id={FORM_ID}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      {!sdkReady && (
        <div className="flex items-center justify-center gap-3 py-8 font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando formulário seguro…
        </div>
      )}

      <div className={cn('grid grid-cols-1 gap-4', !sdkReady && 'hidden')}>
        <KField label="Número do cartão" inputId="mp-cardNumber" />
        <div className="grid grid-cols-2 gap-4">
          <KField label="Validade (MM/AA)" inputId="mp-expirationDate" />
          <KField label="CVV" inputId="mp-securityCode" />
        </div>
        <KField label="Nome impresso no cartão" inputId="mp-cardholderName" />

        <div className="grid grid-cols-2 gap-4">
          <KSelect label="Banco emissor" inputId="mp-issuer" />
          <KSelect label="Parcelas" inputId="mp-installments" />
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-4">
          <KSelect label="Tipo doc." inputId="mp-identificationType" />
          <KField label="CPF do titular" inputId="mp-identificationNumber" />
        </div>

        <KField label="E-mail" inputId="mp-cardholderEmail" inputType="email" />

        <div className="mt-2 flex items-center gap-3 rounded-md border border-white/10 bg-king-black/30 px-4 py-3 text-king-silver">
          <HiOutlineLockClosed className="h-4 w-4 text-king-red" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
            Dados criptografados pelo SDK do Mercado Pago — nunca chegam ao nosso servidor.
          </span>
        </div>

        <GlowButton type="submit" disabled={disabled || submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processando…
            </>
          ) : (
            <>
              <HiOutlineShieldCheck /> Pagar {formatBRL(amount)}
            </>
          )}
        </GlowButton>
      </div>
    </motion.form>
  );
}

function KField({
  label,
  inputId,
  inputType = 'text',
}: {
  label: string;
  inputId: string;
  inputType?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
        {label}
      </span>
      <input
        id={inputId}
        type={inputType}
        className="input-king-panel font-mono"
      />
    </label>
  );
}

function KSelect({ label, inputId }: { label: string; inputId: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-king-silver">
        {label}
      </span>
      <select id={inputId} className="select-king-dark font-mono" />
    </label>
  );
}
