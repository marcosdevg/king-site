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
  discount?: number;
  metadata?: Record<string, string>;
}): Promise<CreatePaymentIntentResponse> {
  return post('/api/checkout/create-payment-intent', payload);
}

/** Admin: envia payload de teste ao n8n (mesmo formato do webhook de venda). */
export async function testN8nNotify(idToken: string): Promise<{ ok: boolean }> {
  const res = await fetch('/api/checkout/test-n8n-notify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: '{}',
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return { ok: Boolean(data.ok) };
}
