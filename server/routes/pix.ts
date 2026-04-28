import { Router, type Request, type Response } from 'express';
import { createPixPayment, getPayment } from '../lib/mercadoPago.js';
import { getAdminFirestore } from '../lib/firebaseAdmin.js';
import { getEmailFromFirebaseIdToken } from '../lib/verifyAdminToken.js';
import { notifyWhatsapp, postToN8n } from '../lib/n8nNotify.js';

const router = Router();

function buildNotificationUrl(req: Request): string | undefined {
  const explicit = process.env.MERCADO_PAGO_NOTIFY_BASE;
  if (explicit) return `${explicit.replace(/\/+$/, '')}/api/pix/webhook`;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host as string | undefined;
  if (host) return `${proto}://${host}/api/pix/webhook`;
  return undefined;
}

/**
 * Cliente já criou o pedido no Firestore (paymentStatus 'pending').
 * Chama isto para gerar o QR PIX no Mercado Pago e ligar o pedido ao pagamento MP.
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization;
    const m = auth?.match(/^Bearer\s+(.+)$/i);
    const idToken = m?.[1]?.trim();
    if (!idToken) {
      res.status(401).json({ error: 'Faça login para gerar o PIX.' });
      return;
    }
    const email = await getEmailFromFirebaseIdToken(idToken);
    if (!email) {
      res.status(401).json({ error: 'Sessão inválida.' });
      return;
    }

    const { orderId, amount, description, payerFirstName, payerLastName, payerCpf } =
      (req.body || {}) as Record<string, unknown>;

    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({ error: 'orderId obrigatório.' });
      return;
    }
    const amt = typeof amount === 'number' ? amount : Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      res.status(400).json({ error: 'Valor inválido.' });
      return;
    }

    const db = getAdminFirestore();
    if (!db) {
      res.status(500).json({ error: 'Servidor sem acesso ao Firestore (configure FIREBASE_SERVICE_ACCOUNT_JSON).' });
      return;
    }

    // Verifica se o pedido existe e pertence ao usuário (ou recém criado).
    const orderRef = db.collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }
    const order = snap.data() as Record<string, unknown>;
    if (order.userEmail && order.userEmail !== email) {
      res.status(403).json({ error: 'Pedido pertence a outro usuário.' });
      return;
    }

    // Reutiliza pagamento se já criado e ainda válido.
    const existingMpId =
      typeof order.mpPaymentId === 'number' || typeof order.mpPaymentId === 'string'
        ? order.mpPaymentId
        : null;
    const existingQr =
      typeof order.mpQrCode === 'string' && order.mpQrCode ? order.mpQrCode : null;
    const existingQrB64 =
      typeof order.mpQrCodeBase64 === 'string' && order.mpQrCodeBase64
        ? order.mpQrCodeBase64
        : null;
    if (existingMpId && existingQr) {
      res.json({
        id: existingMpId,
        qrCode: existingQr,
        qrCodeBase64: existingQrB64 ?? '',
        reused: true,
      });
      return;
    }

    const notificationUrl = buildNotificationUrl(req);

    const mp = await createPixPayment({
      amount: Number(amt.toFixed(2)),
      description:
        typeof description === 'string' && description.trim()
          ? description.trim()
          : `Pedido KING ${orderId}`,
      externalReference: orderId,
      payerEmail: email,
      payerFirstName: typeof payerFirstName === 'string' ? payerFirstName : undefined,
      payerLastName: typeof payerLastName === 'string' ? payerLastName : undefined,
      payerCpf: typeof payerCpf === 'string' ? payerCpf : undefined,
      notificationUrl,
    });

    await orderRef.update({
      paymentMethod: 'pix',
      paymentStatus: mp.status === 'approved' ? 'paid' : 'pending',
      mpPaymentId: mp.id,
      mpStatus: mp.status,
      mpQrCode: mp.qrCode,
      mpQrCodeBase64: mp.qrCodeBase64,
      mpExpiresAt: mp.expiresAt ?? null,
    });

    res.json({
      id: mp.id,
      qrCode: mp.qrCode,
      qrCodeBase64: mp.qrCodeBase64,
      status: mp.status,
      ticketUrl: mp.ticketUrl,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao gerar PIX';
    console.error('[pix/create]', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * Reconciliação ativa — chamado pelo frontend a cada poucos segundos enquanto
 * o cliente espera o PIX cair. Garante atualização mesmo se o webhook MP falhar.
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization;
    const m = auth?.match(/^Bearer\s+(.+)$/i);
    const idToken = m?.[1]?.trim();
    if (!idToken) {
      res.status(401).json({ error: 'Sessão necessária.' });
      return;
    }
    const email = await getEmailFromFirebaseIdToken(idToken);
    if (!email) {
      res.status(401).json({ error: 'Sessão inválida.' });
      return;
    }

    const orderId = (req.query.orderId as string | undefined)?.trim();
    if (!orderId) {
      res.status(400).json({ error: 'orderId obrigatório.' });
      return;
    }

    const db = getAdminFirestore();
    if (!db) {
      res.status(500).json({ error: 'Firestore admin indisponível.' });
      return;
    }

    const orderRef = db.collection('orders').doc(orderId);
    const snap = await orderRef.get();
    if (!snap.exists) {
      res.status(404).json({ error: 'Pedido não encontrado.' });
      return;
    }
    const order = snap.data() as Record<string, unknown>;
    if (order.userEmail && order.userEmail !== email) {
      res.status(403).json({ error: 'Pedido pertence a outro usuário.' });
      return;
    }

    const mpId = order.mpPaymentId;
    if (!mpId) {
      res.json({ paymentStatus: order.paymentStatus ?? 'pending', mpStatus: null });
      return;
    }

    if (order.paymentStatus === 'paid') {
      res.json({ paymentStatus: 'paid', mpStatus: order.mpStatus ?? 'approved' });
      return;
    }

    const payment = await getPayment(mpId as number | string);
    const updates: Record<string, unknown> = {
      mpStatus: payment.status,
      mpStatusDetail: payment.status_detail ?? null,
    };

    if (payment.status === 'approved') {
      updates.paymentStatus = 'paid';
      updates.status = 'confirmado';
      updates.paidAt = payment.date_approved ?? new Date().toISOString();
    } else if (payment.status === 'cancelled' || payment.status === 'rejected') {
      updates.paymentStatus = 'failed';
    } else if (payment.status === 'refunded' || payment.status === 'charged_back') {
      updates.paymentStatus = 'refunded';
    }

    await orderRef.update(updates);

    if (payment.status === 'approved' && order.paymentStatus !== 'paid') {
      const total =
        typeof order.total === 'number'
          ? order.total
          : payment.transaction_amount ?? 0;
      try {
        await postToN8n({
          source: 'king-pix-poll',
          stripeEvent: 'pix.approved',
          whatsapp: notifyWhatsapp(),
          paymentIntentId: `mp_${payment.id}`,
          amountBrl: total,
          currency: 'brl',
          metadata: {
            orderId,
            mpPaymentId: String(payment.id),
            channel: 'pix',
          },
          message: `Nova venda KING (PIX) — ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · pedido ${orderId}`,
        });
      } catch (err) {
        console.error('[pix/status] notify n8n failed:', err);
      }
    }

    res.json({
      paymentStatus: updates.paymentStatus ?? order.paymentStatus ?? 'pending',
      mpStatus: payment.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao consultar status';
    console.error('[pix/status]', msg);
    res.status(500).json({ error: msg });
  }
});

/**
 * Webhook do Mercado Pago. Confirmamos via GET /v1/payments/{id} pra evitar spoof.
 * Se status === 'approved', atualiza o pedido pra paid e dispara notificações.
 */
router.post('/webhook', async (req: Request, res: Response) => {
  // Sempre responde 200 rapidamente — MP reenvia em caso de erro mas spam exagerado se demorar.
  res.status(200).json({ received: true });

  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const data = (body.data || {}) as Record<string, unknown>;
    const queryId = (req.query['data.id'] || req.query.id) as string | undefined;
    const paymentId =
      (typeof data.id === 'string' || typeof data.id === 'number') ? data.id : queryId;

    const type = (body.type || body.action || '').toString();
    const isPayment = type.includes('payment');

    if (!paymentId || !isPayment) return;

    const payment = await getPayment(paymentId);
    if (!payment.external_reference) return;

    const db = getAdminFirestore();
    if (!db) {
      console.warn('[pix/webhook] Firestore admin indisponível — pulando.');
      return;
    }

    const orderRef = db.collection('orders').doc(payment.external_reference);
    const snap = await orderRef.get();
    if (!snap.exists) {
      console.warn('[pix/webhook] order não encontrada:', payment.external_reference);
      return;
    }

    const updates: Record<string, unknown> = {
      mpStatus: payment.status,
      mpStatusDetail: payment.status_detail ?? null,
    };

    if (payment.status === 'approved') {
      updates.paymentStatus = 'paid';
      updates.status = 'confirmado';
      updates.paidAt = payment.date_approved ?? new Date().toISOString();
    } else if (payment.status === 'cancelled' || payment.status === 'rejected') {
      updates.paymentStatus = 'failed';
    } else if (payment.status === 'refunded' || payment.status === 'charged_back') {
      updates.paymentStatus = 'refunded';
    }

    await orderRef.update(updates);

    if (payment.status === 'approved') {
      const order = snap.data() as Record<string, unknown> | undefined;
      const total =
        typeof order?.total === 'number'
          ? order.total
          : payment.transaction_amount ?? 0;
      try {
        await postToN8n({
          source: 'king-pix-webhook',
          stripeEvent: 'pix.approved',
          whatsapp: notifyWhatsapp(),
          paymentIntentId: `mp_${payment.id}`,
          amountBrl: total,
          currency: 'brl',
          metadata: {
            orderId: payment.external_reference,
            mpPaymentId: String(payment.id),
            channel: 'pix',
          },
          message: `Nova venda KING (PIX) — ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · pedido ${payment.external_reference}`,
        });
      } catch (err) {
        // não falha o webhook por erro de notificação
        console.error('[pix/webhook] notify n8n failed:', err);
      }
    }
  } catch (err) {
    console.error('[pix/webhook]', err);
  }
});

export default router;
