import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY ausente no .env');
  }
  _stripe = new Stripe(secret, {
    apiVersion: '2026-03-25.dahlia',
    appInfo: {
      name: 'KING Oversized',
      version: '1.0.0',
    },
  });
  return _stripe;
}
