/**
 * Client wrapper para os endpoints /api/checkout do backend Express.
 * Em dev, Vite faz proxy /api → http://localhost:4000.
 */

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  deliveryDays: number;
  carrier: string;
  free?: boolean;
}

export interface QuoteResponse {
  options: ShippingOption[];
  freeByLocation: boolean;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function quoteShipping(payload: {
  cep: string;
  itemsCount: number;
  totalWeightKg?: number;
}): Promise<QuoteResponse> {
  return post('/api/checkout/shipping', payload);
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}

export function createPaymentIntent(payload: {
  subtotal: number;
  shippingCost: number;
  metadata?: Record<string, string>;
}): Promise<CreatePaymentIntentResponse> {
  return post('/api/checkout/create-payment-intent', payload);
}
