import './env.js';
import express from 'express';
import cors from 'cors';
import checkoutRouter from './routes/checkout.js';

const app = express();
const PORT = Number(process.env.SERVER_PORT ?? 4000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    superfrete: Boolean(process.env.SUPER_FRETE_API),
    time: new Date().toISOString(),
  });
});

app.use('/api/checkout', checkoutRouter);

app.listen(PORT, () => {
  console.log(`[king-server] listening on http://localhost:${PORT}`);
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('[king-server] STRIPE_SECRET_KEY missing — payments disabled');
  }
  if (!process.env.SUPER_FRETE_API) {
    console.warn('[king-server] SUPER_FRETE_API missing — shipping quotes disabled');
  }
});
