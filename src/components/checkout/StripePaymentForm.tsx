import { useEffect, useMemo, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type {
  Appearance,
  StripeElementsOptions,
  StripePaymentElementOptions,
} from '@stripe/stripe-js';
import { HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import GlowButton from '@/components/ui/GlowButton';
import PaymentCardShell from '@/components/checkout/PaymentCardShell';
import { getStripe } from '@/lib/stripe';
import { createPaymentIntent } from '@/services/checkout.api';
import type { CompactInventoryLine } from '@/utils/checkoutInventory';
import { formatBRL } from '@/utils/format';
import { cn } from '@/utils/cn';
import { useMatchMedia } from '@/hooks/useMatchMedia';
import { useThemeStore } from '@/store/useThemeStore';

/**
 * Tema noite no Stripe para contraste com o cartão.
 * Fundo do iframe alinhado ao cartão: roxo profundo no modo claro (Nubank), grafite no escuro.
 */
function buildPaymentAppearance(siteTheme: 'light' | 'dark', narrow: boolean): Appearance {
  const su = narrow ? '3px' : '4px';
  const labelFs = narrow ? '8px' : '10px';
  const labelTrack = narrow ? '0.1em' : '0.28em';
  const colorBackground = siteTheme === 'light' ? '#2d0f42' : '#15101f';

  return {
    theme: 'night',
    labels: 'floating',
    variables: {
      colorPrimary: '#c1121f',
      colorBackground,
      colorText: '#eeeae2',
      colorDanger: '#ff5c6c',
      fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, monospace',
      spacingUnit: su,
      borderRadius: narrow ? '5px' : '6px',
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
        fontSize: labelFs,
        letterSpacing: labelTrack,
        textTransform: 'uppercase',
      },
    },
  };
}

type OnPaid = (paymentIntentId: string) => void | Promise<void>;

type Props = {
  subtotal: number;
  shippingCost: number;
  discount?: number;
  total: number;
  onPaid: OnPaid;
  metadata?: Record<string, string>;
  /** Sacola atual — o servidor valida estoque e grava no PaymentIntent para o webhook. */
  inventoryLines?: CompactInventoryLine[];
  disabled?: boolean;
};

export default function StripePaymentForm(props: Props) {
  const theme = useThemeStore((s) => s.theme);
  const narrowViewport = useMatchMedia('(max-width: 639px)');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appearance = useMemo(
    () => buildPaymentAppearance(theme, narrowViewport),
    [theme, narrowViewport]
  );

  const inventoryKey = useMemo(
    () => JSON.stringify(props.inventoryLines ?? []),
    [props.inventoryLines]
  );

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setClientSecret(null);
    setPaymentIntentId(null);
    setError(null);
    (async () => {
      try {
        const r = await createPaymentIntent({
          subtotal: props.subtotal,
          shippingCost: props.shippingCost,
          discount: props.discount ?? 0,
          metadata: props.metadata,
          inventoryLines: props.inventoryLines ?? [],
        });
        if (cancel) return;
        await getStripe();
        if (cancel) return;
        setClientSecret(r.clientSecret);
        setPaymentIntentId(r.paymentIntentId);
      } catch (e) {
        if (cancel) return;
        setError(e instanceof Error ? e.message : 'Erro ao iniciar pagamento');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.subtotal, props.shippingCost, props.discount, inventoryKey]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PaymentCardShell>
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 px-2 py-10 sm:min-h-[220px]">
            <Loader2 className="h-8 w-8 shrink-0 animate-spin text-white/85" aria-hidden />
            <p className="max-w-[280px] text-center font-mono text-[10px] uppercase leading-relaxed tracking-[0.26em] text-white/70 sm:max-w-none sm:text-[11px] sm:tracking-[0.28em]">
              A preparar pagamento seguro…
            </p>
          </div>
        </PaymentCardShell>
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
    <Elements
      key={`${clientSecret}-stripe-${theme}`}
      stripe={getStripe()}
      options={options}
    >
      <InnerForm
        total={props.total}
        paymentIntentId={paymentIntentId!}
        onPaid={props.onPaid}
        disabled={props.disabled}
        theme={theme}
        narrowViewport={narrowViewport}
      />
    </Elements>
  );
}

function InnerForm({
  total,
  paymentIntentId,
  onPaid,
  disabled,
  theme,
  narrowViewport,
}: {
  total: number;
  paymentIntentId: string;
  onPaid: OnPaid;
  disabled?: boolean;
  theme: 'light' | 'dark';
  narrowViewport: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  /** Só mostra o iframe do Stripe depois de montar e disparar `onReady` (evita “cartão partido”). */
  const [paymentUiReady, setPaymentUiReady] = useState(false);
  const stripeBooted = Boolean(stripe && elements);

  useEffect(() => {
    if (!stripeBooted) setPaymentUiReady(false);
  }, [stripeBooted]);

  const paymentLayout = useMemo<StripePaymentElementOptions['layout']>(() => {
    if (narrowViewport) {
      return {
        type: 'accordion',
        spacedAccordionItems: true,
        defaultCollapsed: false,
      };
    }
    return { type: 'tabs', defaultCollapsed: false };
  }, [narrowViewport]);

  const pay = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error: submitErr } = await elements.submit();
      if (submitErr) {
        toast.error(submitErr.message ?? 'Verifique os dados de pagamento');
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/checkout?return=1`,
          /** Obrigatório quando o país está oculto no Payment Element (`country: 'never'`). */
          payment_method_data: {
            billing_details: {
              address: {
                country: 'BR',
              },
            },
          },
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
      <PaymentCardShell>
        <div className="relative min-h-[200px] sm:min-h-[220px]">
          {!stripeBooted && (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-8 sm:min-h-[220px]">
              <Loader2 className="h-8 w-8 shrink-0 animate-spin text-white/85" aria-hidden />
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.26em] text-white/70 sm:text-[11px]">
                A ligar ao Stripe…
              </p>
            </div>
          )}
          {stripeBooted && (
            <>
              {!paymentUiReady && (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-md bg-[#15101f]/75 backdrop-blur-[3px] [html.light_&]:bg-[#2d0f42]/80"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <Loader2 className="h-7 w-7 shrink-0 animate-spin text-white/90" aria-hidden />
                  <span className="px-3 text-center font-mono text-[10px] uppercase tracking-[0.24em] text-white/80 sm:text-[11px]">
                    A carregar métodos de pagamento…
                  </span>
                </div>
              )}
              <div
                className={cn(
                  'transition-opacity duration-200',
                  paymentUiReady ? 'opacity-100' : 'pointer-events-none opacity-0'
                )}
              >
                <PaymentElement
                  onReady={() => setPaymentUiReady(true)}
                  options={{
                    layout: paymentLayout,
                    defaultValues: {
                      billingDetails: {
                        address: { country: 'BR' },
                      },
                    },
                    fields: {
                      billingDetails: {
                        address: {
                          country: 'never',
                        },
                      },
                    },
                    /** Google Pay / Apple Pay quando a conta e o domínio estão elegíveis na Stripe. */
                    wallets: {
                      applePay: 'auto',
                      googlePay: 'auto',
                    },
                  }}
                />
              </div>
            </>
          )}
        </div>
      </PaymentCardShell>

      <div
        className={cn(
          'flex flex-col gap-2 text-[10px] font-mono uppercase leading-snug tracking-[0.18em] sm:flex-row sm:flex-wrap sm:gap-4 sm:text-xs sm:tracking-[0.25em]',
          /** Tema claro: `king-coal` é cor de superfície clara no CSS — usar texto escuro (`fg` = ink). */
          theme === 'light' ? 'text-king-fg/80' : 'text-king-silver/70'
        )}
      >
        <span className="flex items-center gap-2">
          <HiOutlineLockClosed /> Dados criptografados
        </span>
        <span
          className={cn(
            'flex items-center gap-2',
            theme === 'light' ? 'text-king-fg/65' : 'opacity-70'
          )}
        >
          PI: {paymentIntentId.slice(-6)}
        </span>
      </div>
      <p
        className={cn(
          'font-serif text-[11px] italic leading-relaxed sm:text-xs',
          theme === 'light' ? 'text-king-fg/55' : 'text-king-silver/50'
        )}
      >
        O seletor de parcelas depende do cartão (BIN / emissor) e da configuração da loja na
        Stripe (conta com parcelamento ativo para Brasil). Em modo de teste, o Visa com emissão
        BR da documentação Stripe é{' '}
        <span className="whitespace-nowrap font-mono not-italic tracking-tight text-king-silver/70">
          4000&nbsp;0007&nbsp;6000&nbsp;0002
        </span>
        ; muitos outros cartões de teste só permitem pagamento à vista.
      </p>

      <div className="flex justify-end">
        <GlowButton
          onClick={pay}
          disabled={disabled || submitting || !stripe || !elements || !paymentUiReady}
        >
          {submitting ? 'Processando…' : `Pagar ${formatBRL(total)}`}
        </GlowButton>
      </div>
    </div>
  );
}
