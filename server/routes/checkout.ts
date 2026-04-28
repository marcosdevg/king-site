import { Router, type Request, type Response } from 'express';
import { handleQuote } from '../lib/superfrete.js';
import { sendN8nTestNotification } from '../lib/n8nNotify.js';
import { getEmailFromFirebaseIdToken, isAdminEmail } from '../lib/verifyAdminToken.js';

const router = Router();

router.post('/shipping', handleQuote);

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

export default router;
