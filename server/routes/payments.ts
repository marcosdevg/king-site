import { Router, type Request, type Response } from 'express';
import {
  createCardPayment,
  createPixPayment,
  getPayment,
} from '../lib/mercadoPago.js';
import { getAdminFirestore } from '../lib/firebaseAdmin.js';
import { getEmailFromFirebaseIdToken } from '../lib/verifyAdminToken.js';
import { notifyWhatsapp, postToN8n } from '../lib/n8nNotify.js';
import { applyInventoryDeduction } from '../lib/kingInventory.js';

const router = Router();

function buildNotificationUrl(req: Request): string | undefined {
  const explicit = process.env.MERCADO_PAGO_NOTIFY_BASE;
  if (explicit) return `${explicit.replace(/\/+$/, '')}/api/mp/webhook`;
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = req.headers.host as string | undefined;
  if (host) return `${proto}://${host}/api/mp/webhook`;
  return undefined;
}

async function deductInventoryIfPaid(
  orderRef: FirebaseFirestore.DocumentReference,
  payment: { id: number; status: string }
): Promise<void> {
  const db = orderRef.firestore;
  if (payment.status !== 'approved') return;
  const snap = await orderRef.get();
  if (!snap.exists) return;
  const order = snap.data() as Record<string, unknown> | undefined;
  if (!order) return;
  if (order.inventoryDeducted === true) return;
  const linesJson = typeof order.inventoryLines === 'string' ? order.inventoryLines : null;
  if (!linesJson) return;
  const result = await applyInventoryDeduction(db, `mp_${payment.id}`, linesJson);
  if (result.ok) {
    await orderRef.update({ inventoryDeducted: true });
  } else {
    console.error('[mp] baixa de estoque falhou:', result.error);
  }
}

async function notifySaleApproved(orderId: string, paymentId: number, totalBrl: number) {
  try {
    await postToN8n({
      source: 'king-mp-webhook',
      stripeEvent: 'payment.approved',
      whatsapp: notifyWhatsapp(),
      paymentIntentId: `mp_${paymentId}`,
      amountBrl: totalBrl,
      currency: 'brl',
      metadata: {
        orderId,
        mpPaymentId: String(paymentId),
        gateway: 'mercadopago',
      },
      message: `Nova venda KING — ${totalBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · pedido ${orderId}`,
    });
  } catch (err) {
    console.error('[mp] notify n8n failed:', err);
  }
}

/* =========================================================================
 * /config — devolve a Public Key para o frontend inicializar o SDK MP.
 * ========================================================================= */
router.get('/config', (_req, res) => {
  res.json({ publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY ?? '' });
});

/* =========================================================================
 * /pix/create — cria um pagamento PIX e amarra ao pedido existente.
 * O pedido já foi criado pelo cliente em paymentStatus 'pending'.
 * ========================================================================= */
router.post('/pix/create', async (req: Request, res: Response) => {
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
      res.status(500).json({
        error: 'Servidor sem acesso ao Firestore (configure FIREBASE_SERVICE_ACCOUNT_JSON).',
      });
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

    const existingMpId = (order.mpPaymentId ?? null) as number | string | null;
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
    console.error('[mp/pix/create]', msg);
    res.status(500).json({ error: msg });
  }
});

/* =========================================================================
 * /pix/status — reconciliação ativa (polling) caso o webhook MP não chegue.
 * ========================================================================= */
router.get('/pix/status', async (req: Request, res: Response) => {
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
      await deductInventoryIfPaid(orderRef, payment);
      const total =
        typeof order.total === 'number'
          ? order.total
          : payment.transaction_amount ?? 0;
      await notifySaleApproved(orderId, payment.id, total);
    }

    res.json({
      paymentStatus: updates.paymentStatus ?? order.paymentStatus ?? 'pending',
      mpStatus: payment.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao consultar status';
    console.error('[mp/pix/status]', msg);
    res.status(500).json({ error: msg });
  }
});

/* =========================================================================
 * /card — cria pagamento por cartão de crédito (one-step).
 * Cliente já tokenizou o cartão via SDK e tem orderId.
 * ========================================================================= */
router.post('/card', async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization;
    const m = auth?.match(/^Bearer\s+(.+)$/i);
    const idToken = m?.[1]?.trim();
    if (!idToken) {
      res.status(401).json({ error: 'Faça login para finalizar.' });
      return;
    }
    const email = await getEmailFromFirebaseIdToken(idToken);
    if (!email) {
      res.status(401).json({ error: 'Sessão inválida.' });
      return;
    }

    const {
      orderId,
      amount,
      token,
      paymentMethodId,
      issuerId,
      installments,
      description,
      payerFirstName,
      payerLastName,
      payerCpf,
    } = (req.body || {}) as Record<string, unknown>;

    if (!orderId || typeof orderId !== 'string') {
      res.status(400).json({ error: 'orderId obrigatório.' });
      return;
    }
    const amt = typeof amount === 'number' ? amount : Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      res.status(400).json({ error: 'Valor inválido.' });
      return;
    }
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Token do cartão ausente.' });
      return;
    }
    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      res.status(400).json({ error: 'paymentMethodId obrigatório.' });
      return;
    }
    const inst = typeof installments === 'number' ? installments : Number(installments);
    if (!Number.isFinite(inst) || inst <= 0) {
      res.status(400).json({ error: 'installments inválido.' });
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

    const notificationUrl = buildNotificationUrl(req);

    const payment = await createCardPayment({
      amount: Number(amt.toFixed(2)),
      token,
      paymentMethodId,
      installments: Math.floor(inst),
      issuerId: typeof issuerId === 'string' ? issuerId : undefined,
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

    const updates: Record<string, unknown> = {
      paymentMethod: 'card',
      mpPaymentId: payment.id,
      mpStatus: payment.status,
      mpStatusDetail: payment.statusDetail ?? null,
      installments: payment.installments ?? Math.floor(inst),
    };
    if (payment.status === 'approved') {
      updates.paymentStatus = 'paid';
      updates.status = 'confirmado';
      updates.paidAt = new Date().toISOString();
    } else if (payment.status === 'in_process' || payment.status === 'pending') {
      updates.paymentStatus = 'pending';
    } else {
      updates.paymentStatus = 'failed';
    }
    await orderRef.update(updates);

    if (payment.status === 'approved') {
      await deductInventoryIfPaid(orderRef, { id: payment.id, status: 'approved' });
      const total = typeof order.total === 'number' ? order.total : amt;
      await notifySaleApproved(orderId, payment.id, total);
    }

    res.json({
      id: payment.id,
      status: payment.status,
      statusDetail: payment.statusDetail ?? null,
      paymentStatus: updates.paymentStatus,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Falha ao processar cartão';
    console.error('[mp/card]', msg);
    res.status(500).json({ error: msg });
  }
});

/* =========================================================================
 * /webhook — recebe notificações do Mercado Pago (PIX ou cartão).
 * Confirmamos via GET /v1/payments/{id} antes de atualizar — anti-spoof.
 * ========================================================================= */
router.post('/webhook', async (req: Request, res: Response) => {
  res.status(200).json({ received: true });

  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const data = (body.data || {}) as Record<string, unknown>;
    const queryId = (req.query['data.id'] || req.query.id) as string | undefined;
    const paymentId =
      typeof data.id === 'string' || typeof data.id === 'number' ? data.id : queryId;
    const type = (body.type || body.action || req.query.topic || '').toString();
    const isPayment = type.includes('payment');
    if (!paymentId || !isPayment) return;

    const payment = await getPayment(paymentId);
    if (!payment.external_reference) return;

    const db = getAdminFirestore();
    if (!db) {
      console.warn('[mp/webhook] Firestore admin indisponível — pulando.');
      return;
    }
    const orderRef = db.collection('orders').doc(payment.external_reference);
    const snap = await orderRef.get();
    if (!snap.exists) {
      console.warn('[mp/webhook] order não encontrada:', payment.external_reference);
      return;
    }
    const order = snap.data() as Record<string, unknown> | undefined;

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

    if (payment.status === 'approved' && order?.paymentStatus !== 'paid') {
      await deductInventoryIfPaid(orderRef, { id: payment.id, status: 'approved' });
      const total =
        typeof order?.total === 'number'
          ? order.total
          : payment.transaction_amount ?? 0;
      await notifySaleApproved(payment.external_reference, payment.id, total);
    }
  } catch (err) {
    console.error('[mp/webhook]', err);
  }
});

export default router;
