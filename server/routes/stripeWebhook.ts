import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { getStripe } from '../lib/stripe.js';
import { notifyWhatsapp, postToN8n } from '../lib/n8nNotify.js';

/**
 * Webhook Stripe → valida assinatura → POST no n8n (ex.: notificar WhatsApp).
 * O corpo tem de ser RAW (não passar por express.json) para o `constructEvent` funcionar.
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET ausente — defina no .env e no Stripe Dashboard');
    res.status(501).type('text/plain').send('Webhook signing secret not configured');
    return;
  }

  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    res.status(400).type('text/plain').send('Missing Stripe-Signature');
    return;
  }

  const raw = req.body as Buffer | string | undefined;
  const buf = Buffer.isBuffer(raw)
    ? raw
    : typeof raw === 'string'
      ? Buffer.from(raw, 'utf8')
      : Buffer.from('', 'utf8');
  if (!buf.length) {
    res.status(400).type('text/plain').send('Empty body');
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(buf, sig, whSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid signature';
    console.error('[stripe-webhook] assinatura inválida:', msg);
    res.status(400).type('text/plain').send(`Webhook Error: ${msg}`);
    return;
  }

  /** Só dispara n8n em venda concluída (cartão, boleto pago, etc.). */
  if (event.type !== 'payment_intent.succeeded') {
    res.json({ received: true, ignored: event.type });
    return;
  }

  const pi = event.data.object as Stripe.PaymentIntent;
  const amountCents = typeof pi.amount_received === 'number' ? pi.amount_received : pi.amount;
  const amountBrl = amountCents / 100;

  const payload = {
    source: 'king-stripe-webhook',
    stripeEvent: event.type,
    /** Número para o fluxo n8n enviar WhatsApp (E.164 sem +). */
    whatsapp: notifyWhatsapp(),
    paymentIntentId: pi.id,
    amountBrl,
    currency: pi.currency,
    metadata: pi.metadata ?? {},
    /** Texto pronto se o n8n só repassar à API de WhatsApp */
    message: `Nova venda KING — ${amountBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · PI ${pi.id}`,
  };

  try {
    await postToN8n(payload);
    res.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] falha ao chamar n8n:', msg);
    res.status(500).json({ error: 'n8n notify failed', detail: msg });
  }
}
