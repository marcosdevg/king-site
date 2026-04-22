import './env.js';
import express from 'express';
import cors from 'cors';
import checkoutRouter from './routes/checkout.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

/** Em serverless (Vercel), o path interno pode diferir do URL público — restaura para o Express. */
app.use((req, _res, next) => {
  const h = req.headers;
  const orig =
    (h['x-vercel-original-path'] as string | undefined) ||
    (h['x-invoke-path'] as string | undefined) ||
    (h['x-forwarded-uri'] as string | undefined)?.split('?')[0];
  if (typeof orig === 'string' && orig.startsWith('/api')) {
    req.url = orig;
  }
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    superfrete: Boolean(process.env.SUPER_FRETE_API),
    time: new Date().toISOString(),
  });
});

app.use('/api/checkout', checkoutRouter);

export default app;
