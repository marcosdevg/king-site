import './env.js';
import express from 'express';
import cors from 'cors';
import checkoutRouter from './routes/checkout.js';
import { handleStripeWebhook } from './routes/stripeWebhook.js';
const app = express();
app.use(cors({ origin: true, credentials: true }));
/** Stripe exige corpo bruto para validar `Stripe-Signature` — tem de vir antes de `express.json`. */
app.post('/api/checkout/stripe-webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
    void handleStripeWebhook(req, res).catch(next);
});
app.use(express.json({ limit: '1mb' }));
/** Em serverless (Vercel), o path interno pode diferir do URL público — restaura para o Express. */
app.use((req, _res, next) => {
    const h = req.headers;
    const orig = h['x-vercel-original-path'] ||
        h['x-invoke-path'] ||
        h['x-forwarded-uri']?.split('?')[0];
    if (typeof orig === 'string' && orig.startsWith('/api')) {
        req.url = orig;
    }
    next();
});
app.get('/api/health', (_req, res) => {
    res.json({
        ok: true,
        stripe: Boolean(process.env.STRIPE_SECRET_KEY),
        stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
        superfrete: Boolean(process.env.SUPER_FRETE_API),
        time: new Date().toISOString(),
    });
});
app.use('/api/checkout', checkoutRouter);
export default app;
