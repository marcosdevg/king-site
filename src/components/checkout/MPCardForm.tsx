import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi';
import { Loader2 } from 'lucide-react';
import GlowButton from '@/components/ui/GlowButton';
import KingLogo from '@/components/ui/KingLogo';
import { auth } from '@/services/firebase';
import { getMercadoPago, type MpCardFormInstance } from '@/services/mp';
import { formatBRL } from '@/utils/format';
import { cn } from '@/utils/cn';

interface Props {
  amount: number;
  orderId: string | null;
  ensureOrder: () => Promise<string | null>;
  payerCpf?: string;
  payerFirstName?: string;
  payerLastName?: string;
  onPaid: () => void;
  disabled?: boolean;
}

const FORM_ID = 'king-mp-card-form';
const FIELD_IDS = {
  cardNumber: 'mp-cardNumber',
  expirationDate: 'mp-expirationDate',
  securityCode: 'mp-securityCode',
  cardholderName: 'mp-cardholderName',
  issuer: 'mp-issuer',
  installments: 'mp-installments',
  identificationType: 'mp-identificationType',
  identificationNumber: 'mp-identificationNumber',
  cardholderEmail: 'mp-cardholderEmail',
};

const onlyDigits = (v: string) => (v || '').replace(/\D/g, '');

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
  const [cardFilled, setCardFilled] = useState(false);
  const cardFormRef = useRef<MpCardFormInstance | null>(null);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const ensureOrderRef = useRef(ensureOrder);
  ensureOrderRef.current = ensureOrder;
  const payerRef = useRef({ payerCpf, payerFirstName, payerLastName });
  payerRef.current = { payerCpf, payerFirstName, payerLastName };

  useEffect(() => {
    if (!orderId) void ensureOrderRef.current();
  }, [orderId]);

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
            cardNumber: { id: FIELD_IDS.cardNumber, placeholder: '0000 0000 0000 0000' },
            expirationDate: { id: FIELD_IDS.expirationDate, placeholder: '00/00' },
            securityCode: { id: FIELD_IDS.securityCode, placeholder: '000' },
            cardholderName: { id: FIELD_IDS.cardholderName, placeholder: 'NOME COMO NO CARTÃO' },
            issuer: { id: FIELD_IDS.issuer, placeholder: 'Banco emissor' },
            installments: { id: FIELD_IDS.installments, placeholder: 'Parcelas' },
            identificationType: { id: FIELD_IDS.identificationType, placeholder: 'Tipo' },
            identificationNumber: {
              id: FIELD_IDS.identificationNumber,
              placeholder: '000.000.000-00',
            },
            cardholderEmail: { id: FIELD_IDS.cardholderEmail, placeholder: 'email@exemplo.com' },
          },
          callbacks: {
            onFormMounted: (err: unknown) => {
              if (err) console.error('[mp] form mount error', err);
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
            onFetching: () => {
              // hooks de loading internos do SDK — ignorado
            },
          },
        });
        cardFormRef.current = cardForm;
        if (!cancelled) setSdkReady(true);
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

  // Pré-preenche campos escondidos: email (Firebase) + tipo doc (CPF).
  useEffect(() => {
    if (!sdkReady) return;
    const emailEl = document.getElementById(FIELD_IDS.cardholderEmail) as HTMLInputElement | null;
    if (emailEl && auth.currentUser?.email) {
      emailEl.value = auth.currentUser.email;
      emailEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // Tipo doc é populado pelo MP de forma assíncrona — força CPF assim que disponível.
    const trySetCpf = (attempt = 0) => {
      const sel = document.getElementById(
        FIELD_IDS.identificationType
      ) as HTMLSelectElement | null;
      if (!sel) return;
      const hasCpf = Array.from(sel.options).some((o) => o.value === 'CPF');
      if (hasCpf) {
        sel.value = 'CPF';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (attempt < 20) {
        setTimeout(() => trySetCpf(attempt + 1), 250);
      }
    };
    trySetCpf();
  }, [sdkReady]);

  // Formatadores + detecção de cartão preenchido.
  useEffect(() => {
    if (!sdkReady) return;
    const numberEl = document.getElementById(FIELD_IDS.cardNumber) as HTMLInputElement | null;
    const expEl = document.getElementById(FIELD_IDS.expirationDate) as HTMLInputElement | null;
    const cvvEl = document.getElementById(FIELD_IDS.securityCode) as HTMLInputElement | null;
    const nameEl = document.getElementById(FIELD_IDS.cardholderName) as HTMLInputElement | null;
    if (!numberEl || !expEl || !cvvEl || !nameEl) return;

    const formatNumber = () => {
      const digits = onlyDigits(numberEl.value).slice(0, 19);
      const groups = digits.match(/.{1,4}/g) ?? [];
      const formatted = groups.join(' ');
      if (formatted !== numberEl.value) {
        numberEl.value = formatted;
      }
    };
    const formatExpiry = () => {
      const digits = onlyDigits(expEl.value).slice(0, 4);
      let v = digits;
      if (digits.length >= 3) v = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      else if (digits.length >= 1) v = digits;
      if (v !== expEl.value) {
        expEl.value = v;
      }
    };
    const formatCvv = () => {
      const v = onlyDigits(cvvEl.value).slice(0, 4);
      if (v !== cvvEl.value) cvvEl.value = v;
    };

    const check = () => {
      const num = onlyDigits(numberEl.value);
      const exp = onlyDigits(expEl.value);
      const cvv = onlyDigits(cvvEl.value);
      const name = nameEl.value.trim();
      setCardFilled(num.length >= 13 && exp.length >= 4 && cvv.length >= 3 && name.length >= 3);
    };

    const onNumberInput = () => {
      formatNumber();
      check();
    };
    const onExpInput = () => {
      formatExpiry();
      check();
    };
    const onCvvInput = () => {
      formatCvv();
      check();
    };
    const onNameInput = () => check();

    numberEl.addEventListener('input', onNumberInput);
    expEl.addEventListener('input', onExpInput);
    cvvEl.addEventListener('input', onCvvInput);
    nameEl.addEventListener('input', onNameInput);
    check();

    return () => {
      numberEl.removeEventListener('input', onNumberInput);
      expEl.removeEventListener('input', onExpInput);
      cvvEl.removeEventListener('input', onCvvInput);
      nameEl.removeEventListener('input', onNameInput);
    };
  }, [sdkReady]);

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
      className="flex flex-col gap-6"
    >
      {!sdkReady && (
        <div className="flex items-center justify-center gap-3 py-8 font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando formulário seguro…
        </div>
      )}

      <div className={cn(!sdkReady && 'hidden', 'flex flex-col gap-6')}>
        {/* CARTÃO VISUAL — só os 4 campos principais */}
        <div className="mx-auto w-full max-w-[440px]">
          <div className="relative aspect-[1.586/1] overflow-hidden rounded-2xl border border-purple-400/30 bg-gradient-to-br from-[#5b1a8e] via-[#3d106a] to-[#1f0640] p-6 shadow-[0_24px_60px_rgba(130,42,180,0.45)]">
            {/* fundo decorativo */}
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/30 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-purple-300/15 blur-2xl" />
            <div className="pointer-events-none absolute right-8 top-8 h-32 w-32 rounded-full bg-violet-400/20 blur-2xl" />

            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between">
                <div className="h-9 w-12 rounded-md bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-inner" />
                <KingLogo variant="white" className="h-5 w-auto opacity-95" />
              </div>

              <div className="mt-5">
                <CardLabel>Número do cartão</CardLabel>
                <input
                  id={FIELD_IDS.cardNumber}
                  inputMode="numeric"
                  className="mt-1 w-full border-b border-white/15 bg-transparent pb-1 font-mono text-xl tracking-[0.18em] !text-white placeholder-white/65 caret-white outline-none transition focus:border-white/40 focus:placeholder-white/45 sm:text-2xl"
                />
              </div>

              <div className="mt-auto grid grid-cols-[1fr_auto_auto] gap-4 pt-4">
                <div className="min-w-0">
                  <CardLabel>Nome impresso</CardLabel>
                  <input
                    id={FIELD_IDS.cardholderName}
                    autoCapitalize="characters"
                    className="mt-1 w-full truncate border-b border-white/15 bg-transparent pb-1 font-mono text-sm uppercase tracking-[0.18em] !text-white placeholder-white/65 caret-white outline-none transition focus:border-white/40 sm:text-base"
                  />
                </div>
                <div>
                  <CardLabel>Validade</CardLabel>
                  <input
                    id={FIELD_IDS.expirationDate}
                    inputMode="numeric"
                    className="mt-1 w-[80px] border-b border-white/15 bg-transparent pb-1 font-mono text-sm tracking-[0.16em] !text-white placeholder-white/65 caret-white outline-none transition focus:border-white/40 sm:text-base"
                  />
                </div>
                <div>
                  <CardLabel>CVV</CardLabel>
                  <input
                    id={FIELD_IDS.securityCode}
                    inputMode="numeric"
                    className="mt-1 w-[60px] border-b border-white/15 bg-transparent pb-1 font-mono text-sm tracking-[0.16em] !text-white placeholder-white/65 caret-white outline-none transition focus:border-white/40 sm:text-base"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/*
          Campos invisíveis ao usuário, mas sempre montados pra o SDK do MP achar os IDs:
          - Banco emissor → MP detecta automaticamente pelo número do cartão
          - Tipo doc → forçamos "CPF"
          - Email → preenchido com o email da conta logada
        */}
        <div className="sr-only" aria-hidden="true">
          <select id={FIELD_IDS.issuer} />
          <select id={FIELD_IDS.identificationType} />
          <input id={FIELD_IDS.cardholderEmail} type="email" />
        </div>

        {/*
          Campos visíveis após preencher o cartão: só CPF e Parcelas.
        */}
        <div
          aria-hidden={!cardFilled}
          className={cn(
            'overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            cardFilled
              ? 'pointer-events-auto max-h-[600px] opacity-100'
              : 'pointer-events-none max-h-0 opacity-0'
          )}
        >
          <div className="flex flex-col gap-4 pt-2">
            <KField label="CPF do titular" inputId={FIELD_IDS.identificationNumber} />
            <KSelect label="Parcelas" inputId={FIELD_IDS.installments} />
          </div>
        </div>

        {/* Sempre visíveis: aviso + botão (botão só ativo após preencher) */}
        <div className="flex items-center gap-3 rounded-md border border-white/10 bg-king-black/30 px-4 py-3 text-king-silver">
          <HiOutlineLockClosed className="h-4 w-4 text-king-red" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em]">
            Pagamento seguro!
          </span>
        </div>

        <GlowButton type="submit" disabled={disabled || submitting || !cardFilled}>
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

        {!cardFilled && (
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/60">
            Preencha os dados do cartão pra continuar
          </p>
        )}
      </div>
    </motion.form>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block font-mono text-[8px] uppercase tracking-[0.32em] text-white/75 sm:text-[9px]">
      {children}
    </span>
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
      <input id={inputId} type={inputType} className="input-king-panel font-mono" />
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
