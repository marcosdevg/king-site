import { Router, type Request, type Response } from 'express';
import { getStripe } from '../lib/stripe.js';
import { handleQuote } from '../lib/superfrete.js';
import { sendN8nTestNotification } from '../lib/n8nNotify.js';
import { getEmailFromFirebaseIdToken, isAdminEmail } from '../lib/verifyAdminToken.js';
import { getAdminFirestore } from '../lib/firebaseAdmin.js';
import {
  assertInventoryAvailable,
  attachInventoryToStripeMetadata,
  buildCompactLinesFromUnknown,
  serializeInventoryLines,
} from '../lib/kingInventory.js';

const router = Router();

router.post('/shipping', handleQuote);

router.get('/config', (_req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISH_KEY ?? '',
  });
});

/**
 * Admin (KPIs): envia payload de teste ao n8n, igual ao fluxo pós-venda (WhatsApp).
 * Requer `Authorization: Bearer <Firebase ID token>` do utilizador admin.
 */
router.post('/test-n8n-notify', async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization;
    const m = auth?.match(/^Bearer\s+(.+)$/i);
    const idToken = m?.[1]?.trim();
    if (!idToken) {
      res.status(401).json({ error: 'Token em falta. Entre no painel admin.' });
      return;
    }
    const email = await getEmailFromFirebaseIdToken(idToken);
    if (!email) {
      res.status(401).json({ error: 'Sessão inválida ou token expirado.' });
      return;
    }
    if (!isAdminEmail(email)) {
      res.status(403).json({ error: 'Apenas o e-mail admin pode testar o webhook.' });
      return;
    }
    await sendN8nTestNotification();
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao notificar n8n';
    console.error('[test-n8n-notify]', msg);
    res.status(500).json({ error: msg });
  }
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
      discount = 0,
      currency = 'brl',
      metadata = {},
      inventoryLines,
    } = (req.body ?? {}) as {
      subtotal?: number;
      shippingCost?: number;
      discount?: number;
      currency?: string;
      metadata?: Record<string, string>;
      /** Linhas de estoque: [[productId, qty, backStampId, frontStampId], …] */
      inventoryLines?: unknown;
    };

    if (typeof subtotal !== 'number' || subtotal <= 0) {
      res.status(400).json({ error: 'subtotal inválido' });
      return;
    }
    if (typeof shippingCost !== 'number' || shippingCost < 0) {
      res.status(400).json({ error: 'shippingCost inválido' });
      return;
    }
    const safeDiscount =
      typeof discount === 'number' && discount > 0 && discount < subtotal
        ? discount
        : 0;

    const payable = Math.max(0, subtotal - safeDiscount) + shippingCost;
    const amountCents = Math.round(payable * 100);
    if (amountCents < 50) {
      res.status(400).json({ error: 'Valor mínimo não atingido' });
      return;
    }

    const safeMeta: Record<string, string> = { ...metadata };
    for (const k of Object.keys(safeMeta)) {
      if (k === 'king_inv' || k.startsWith('king_inv_')) delete safeMeta[k];
    }

    let inventoryJson: string | null = null;
    if (inventoryLines !== undefined && inventoryLines !== null) {
      if (!Array.isArray(inventoryLines)) {
        res.status(400).json({ error: 'inventoryLines inválido' });
        return;
      }
      if (inventoryLines.length > 0) {
        const parsed = buildCompactLinesFromUnknown(inventoryLines);
        if (!parsed) {
          res.status(400).json({ error: 'Formato de inventoryLines inválido' });
          return;
        }
        const db = getAdminFirestore();
        if (db) {
          const check = await assertInventoryAvailable(db, parsed);
          if (check.ok === false) {
            res.status(409).json({ error: check.message });
            return;
          }
        } else {
          console.warn(
            '[checkout] FIREBASE_SERVICE_ACCOUNT_JSON ausente — não foi possível validar estoque antes do pagamento'
          );
        }
        inventoryJson = serializeInventoryLines(parsed);
      }
    }

    /**
     * Tipos explícitos + parcelas no cartão: com `automatic_payment_methods`, a Stripe
     * recomenda não definir `installments.enabled` (conflito com “dynamic payment methods”),
     * o que pode impedir o seletor de parcelas no Payment Element.
     * @see https://docs.stripe.com/payments/meses-sin-intereses/accept-a-payment (Payment Element + installments)
     */
    const intent = await getStripe().paymentIntents.create({
      amount: amountCents,
      currency,
      /** Sem `link` aqui: contas sem Link ativo falham com “payment method type link is invalid”. */
      payment_method_types: ['card', 'boleto'],
      payment_method_options: {
        card: {
          installments: {
            enabled: true,
          },
        },
      },
      metadata: attachInventoryToStripeMetadata(
        {
          ...safeMeta,
          subtotal_brl: subtotal.toFixed(2),
          shipping_brl: shippingCost.toFixed(2),
          discount_brl: safeDiscount.toFixed(2),
        },
        inventoryJson ?? '[]'
      ),
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
