/**
 * Mercado Pago — wrapper mínimo da API REST.
 * Variáveis de ambiente:
 *  - MERCADO_PAGO_ACCESS_TOKEN  (obrigatório)
 *  - MERCADO_PAGO_NOTIFY_BASE   (opcional, ex.: https://kingoversized.vercel.app)
 */

const MP_BASE = 'https://api.mercadopago.com';

export interface CreatePixInput {
  amount: number;
  description: string;
  externalReference: string;
  payerEmail: string;
  payerFirstName?: string;
  payerLastName?: string;
  payerCpf?: string;
  notificationUrl?: string;
}

export interface CreatePixResult {
  id: number;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl?: string;
  expiresAt?: string;
}

function getAccessToken(): string {
  const t = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!t) throw new Error('MERCADO_PAGO_ACCESS_TOKEN ausente nas variáveis de ambiente');
  return t;
}

export async function createPixPayment(input: CreatePixInput): Promise<CreatePixResult> {
  const token = getAccessToken();

  const body: Record<string, unknown> = {
    transaction_amount: Number(input.amount.toFixed(2)),
    payment_method_id: 'pix',
    description: input.description.slice(0, 256),
    external_reference: input.externalReference,
    payer: {
      email: input.payerEmail || 'cliente@king.com',
      first_name: (input.payerFirstName || 'Cliente').slice(0, 50),
      last_name: (input.payerLastName || 'KING').slice(0, 50),
    },
  };
  const cpf = (input.payerCpf || '').replace(/\D/g, '');
  if (cpf.length === 11) {
    (body.payer as Record<string, unknown>).identification = {
      type: 'CPF',
      number: cpf,
    };
  }
  if (input.notificationUrl) {
    body.notification_url = input.notificationUrl;
  }

  const res = await fetch(`${MP_BASE}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `${input.externalReference}-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`MercadoPago [${res.status}]: ${txt || res.statusText}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const poi = (data.point_of_interaction || {}) as Record<string, unknown>;
  const tx = (poi.transaction_data || {}) as Record<string, unknown>;

  return {
    id: Number(data.id),
    status: typeof data.status === 'string' ? data.status : 'pending',
    qrCode: typeof tx.qr_code === 'string' ? tx.qr_code : '',
    qrCodeBase64: typeof tx.qr_code_base64 === 'string' ? tx.qr_code_base64 : '',
    ticketUrl: typeof tx.ticket_url === 'string' ? tx.ticket_url : undefined,
    expiresAt: typeof data.date_of_expiration === 'string' ? data.date_of_expiration : undefined,
  };
}

export interface CreateCardInput {
  amount: number;
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string;
  description: string;
  externalReference: string;
  payerEmail: string;
  payerFirstName?: string;
  payerLastName?: string;
  payerCpf?: string;
  notificationUrl?: string;
}

export interface CreateCardResult {
  id: number;
  status: string;
  statusDetail?: string;
  installments?: number;
}

export async function createCardPayment(input: CreateCardInput): Promise<CreateCardResult> {
  const token = getAccessToken();

  const body: Record<string, unknown> = {
    transaction_amount: Number(input.amount.toFixed(2)),
    token: input.token,
    description: input.description.slice(0, 256),
    installments: Math.max(1, Math.floor(input.installments)),
    payment_method_id: input.paymentMethodId,
    external_reference: input.externalReference,
    payer: {
      email: input.payerEmail || 'cliente@king.com',
      first_name: (input.payerFirstName || 'Cliente').slice(0, 50),
      last_name: (input.payerLastName || 'KING').slice(0, 50),
    },
  };
  if (input.issuerId) body.issuer_id = input.issuerId;
  if (input.notificationUrl) body.notification_url = input.notificationUrl;
  const cpf = (input.payerCpf || '').replace(/\D/g, '');
  if (cpf.length === 11) {
    (body.payer as Record<string, unknown>).identification = {
      type: 'CPF',
      number: cpf,
    };
  }

  const res = await fetch(`${MP_BASE}/v1/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `${input.externalReference}-card-${Date.now()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`MercadoPago [${res.status}]: ${txt || res.statusText}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  return {
    id: Number(data.id),
    status: typeof data.status === 'string' ? data.status : 'pending',
    statusDetail: typeof data.status_detail === 'string' ? data.status_detail : undefined,
    installments:
      typeof data.installments === 'number' ? data.installments : input.installments,
  };
}

export interface MpPayment {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  date_approved?: string | null;
  payment_method_id?: string;
}

export async function getPayment(id: number | string): Promise<MpPayment> {
  const token = getAccessToken();
  const res = await fetch(`${MP_BASE}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`MercadoPago [${res.status}]: ${txt || res.statusText}`);
  }
  const data = (await res.json()) as Record<string, unknown>;
  return {
    id: Number(data.id),
    status: typeof data.status === 'string' ? data.status : 'unknown',
    status_detail: typeof data.status_detail === 'string' ? data.status_detail : undefined,
    external_reference:
      typeof data.external_reference === 'string' ? data.external_reference : undefined,
    transaction_amount:
      typeof data.transaction_amount === 'number' ? data.transaction_amount : undefined,
    date_approved: typeof data.date_approved === 'string' ? data.date_approved : null,
    payment_method_id:
      typeof data.payment_method_id === 'string' ? data.payment_method_id : undefined,
  };
}
