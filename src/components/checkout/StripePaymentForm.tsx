import { useEffect, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Appearance, StripeElementsOptions } from '@stripe/stripe-js';
import { HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import GlowButton from '@/components/ui/GlowButton';
import { getStripe } from '@/lib/stripe';
import { createPaymentIntent } from '@/services/checkout.api';
import { formatBRL } from '@/utils/format';

const appearance: Appearance = {
  theme: 'night',
  labels: 'floating',
  variables: {
    colorPrimary: '#c1121f',
    colorBackground: '#0b0b0d',
    colorText: '#eeeae2',
    colorDanger: '#ff5c6c',
    fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, monospace',
    spacingUnit: '4px',
    borderRadius: '6px',
  },
  rules: {
    '.Input': {
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: 'none',
    },
    '.Input:focus': {
      border: '1px solid #c1121f',
      boxShadow: '0 0 0 1px #c1121f',
    },
    '.Label': {
      fontSize: '10px',
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
    },
  },
};

type OnPaid = (paymentIntentId: string) => void | Promise<void>;

type Props = {
  subtotal: number;
  shippingCost: number;
  total: number;
  onPaid: OnPaid;
  metadata?: Record<string, string>;
  disabled?: boolean;
};

export default function StripePaymentForm(props: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    const metadataKey = JSON.stringify(props.metadata ?? {});
    setLoading(true);
    createPaymentIntent({
      subtotal: props.subtotal,
      shippingCost: props.shippingCost,
      metadata: props.metadata,
    })
      .then((r) => {
        if (cancel) return;
        setClientSecret(r.clientSecret);
        setPaymentIntentId(r.paymentIntentId);
      })
      .catch((e: Error) => {
        if (cancel) return;
        setError(e.message);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.subtotal, props.shippingCost]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-king-silver">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="font-mono text-[11px] uppercase tracking-[0.25em]">
          Preparando pagamento seguro…
        </span>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="space-y-3 rounded border border-king-red/40 bg-king-red/10 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-king-red">
          Não foi possível iniciar o pagamento
        </p>
        <p className="font-serif text-xs italic text-king-silver">
          {error ?? 'Tente novamente em instantes.'}
        </p>
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance,
    locale: 'pt-BR',
  };

  return (
    <Elements stripe={getStripe()} options={options}>
      <InnerForm
        total={props.total}
        paymentIntentId={paymentIntentId!}
        onPaid={props.onPaid}
        disabled={props.disabled}
      />
    </Elements>
  );
}

function InnerForm({
  total,
  paymentIntentId,
  onPaid,
  disabled,
}: {
  total: number;
  paymentIntentId: string;
  onPaid: OnPaid;
  disabled?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const pay = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/checkout?return=1`,
        },
      });

      if (error) {
        toast.error(error.message ?? 'Falha no pagamento');
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        await onPaid(paymentIntent.id);
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        toast('Pagamento em análise. Acompanhe em seus pedidos.');
        await onPaid(paymentIntent.id);
      } else if (paymentIntent) {
        toast.error(`Pagamento não concluído (${paymentIntent.status})`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado no pagamento';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PaymentElement
        options={{
          layout: { type: 'tabs', defaultCollapsed: false },
        }}
      />

      <div className="flex flex-wrap items-center gap-4 text-xs font-mono uppercase tracking-[0.25em] text-king-silver/70">
        <span className="flex items-center gap-2">
          <HiOutlineLockClosed /> Dados criptografados
        </span>
        <span className="flex items-center gap-2">
          <HiOutlineShieldCheck /> Processado por Stripe
        </span>
        <span className="flex items-center gap-2 opacity-70">
          PI: {paymentIntentId.slice(-6)}
        </span>
      </div>

      <div className="flex justify-end">
        <GlowButton onClick={pay} disabled={disabled || submitting || !stripe || !elements}>
          {submitting ? 'Processando…' : `Pagar ${formatBRL(total)}`}
        </GlowButton>
      </div>
    </div>
  );
}
