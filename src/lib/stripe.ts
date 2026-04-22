import { loadStripe, type Stripe } from '@stripe/stripe-js';

const key = import.meta.env.VITE_STRIPE_PUBLISH_KEY as string | undefined;

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!key) {
    console.warn('[stripe] VITE_STRIPE_PUBLISH_KEY ausente no .env');
    return Promise.resolve(null);
  }
  /**
   * Chave `pk_test_*` em produção: o Stripe.js mostra o widget “para programadores”
   * (atalhos de teste). **Não expõe `sk_*`** (só existe no servidor). Para clientes não verem
   * isso, usa `pk_live_*` + `sk_live_*` nas variáveis **Production** da Vercel.
   */
  if (import.meta.env.PROD && key.startsWith('pk_test_')) {
    console.warn(
      '[stripe] Modo TESTE no ar: o canto “Stripe / Desenvolvedores” é normal com pk_test. Troca para pk_live na Vercel (Production).'
    );
  }
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}
