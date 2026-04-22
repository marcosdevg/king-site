import app from './app.js';
const PORT = Number(process.env.SERVER_PORT ?? 4000);
app.listen(PORT, () => {
    console.log(`[king-server] listening on http://localhost:${PORT}`);
    if (!process.env.STRIPE_SECRET_KEY) {
        console.warn('[king-server] STRIPE_SECRET_KEY missing — payments disabled');
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.warn('[king-server] STRIPE_WEBHOOK_SECRET missing — Stripe não consegue notificar n8n/WhatsApp (veja .env.example)');
    }
    if (!process.env.SUPER_FRETE_API) {
        console.warn('[king-server] SUPER_FRETE_API missing — shipping quotes disabled');
    }
});
