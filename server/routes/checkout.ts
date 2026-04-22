import { Router, type Request, type Response } from 'express';
import { getStripe } from '../lib/stripe.js';
import { handleQuote } from '../lib/superfrete.js';

const router = Router();

router.post('/shipping', handleQuote);

router.get('/config', (_req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISH_KEY ?? '',
  });
});

/**
 * Cria um PaymentIntent. O valor é recalculado aqui no servidor a partir de subtotal + shippingCost
 * (não confie no total vindo do cliente).
 */
router.post('/create-payment-intent', async (req: Request, res: Response) => {
  try {
    const {
      subtotal,
      shippingCost,
      currency = 'brl',
      metadata = {},
    } = (req.body ?? {}) as {
      subtotal?: number;
      shippingCost?: number;
      currency?: string;
      metadata?: Record<string, string>;
    };

    if (typeof subtotal !== 'number' || subtotal <= 0) {
      res.status(400).json({ error: 'subtotal inválido' });
      return;
    }
    if (typeof shippingCost !== 'number' || shippingCost < 0) {
      res.status(400).json({ error: 'shippingCost inválido' });
      return;
    }

    const amountCents = Math.round((subtotal + shippingCost) * 100);
    if (amountCents < 50) {
      res.status(400).json({ error: 'Valor mínimo não atingido' });
      return;
    }

    const intent = await getStripe().paymentIntents.create({
      amount: amountCents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        ...metadata,
        subtotal_brl: subtotal.toFixed(2),
        shipping_brl: shippingCost.toFixed(2),
      },
    });

    res.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: amountCents,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar PaymentIntent';
    console.error('[stripe] create-payment-intent error', msg);
    res.status(500).json({ error: msg });
  }
});

export default router;
