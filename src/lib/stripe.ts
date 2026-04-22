import { loadStripe, type Stripe } from '@stripe/stripe-js';

const key = import.meta.env.VITE_STRIPE_PUBLISH_KEY as string | undefined;

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!key) {
    console.warn('[stripe] VITE_STRIPE_PUBLISH_KEY ausente no .env');
    return Promise.resolve(null);
  }
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}
