/**
 * Entrada serverless na Vercel — encaminha /api/* para o Express em `server/app.ts`.
 * Variáveis: STRIPE_SECRET_KEY, STRIPE_PUBLISH_KEY, STRIPE_WEBHOOK_SECRET, SUPER_FRETE_API (Vercel).
 */
import app from '../server/app.js';

export default app;
