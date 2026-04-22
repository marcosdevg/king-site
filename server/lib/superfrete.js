/**
 * SuperFrete quote — chamada server-side com Bearer token.
 * Docs: https://docs.superfrete.com
 */
const SUPERFRETE_BASE = 'https://api.superfrete.com';
const DEFAULT_ORIGIN_CEP = '49680000';
const FREE_SHIPPING_CEPS = new Set(['49680000']);
export class SuperFreteHttpError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.name = 'SuperFreteHttpError';
        this.statusCode = statusCode;
    }
}
function onlyDigits(v) {
    return (v || '').replace(/\D/g, '');
}
function num(v) {
    if (typeof v === 'number')
        return v;
    if (typeof v === 'string') {
        const n = Number(v.replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}
function originCep() {
    const raw = (process.env.SUPERFRETE_ORIGIN_CEP ||
        process.env.SUPER_FRETE_ORIGIN_CEP ||
        DEFAULT_ORIGIN_CEP).replace(/\D/g, '');
    return raw.length === 8 ? raw : DEFAULT_ORIGIN_CEP;
}
function serviceIds() {
    const s = (process.env.SUPERFRETE_SERVICES ?? '1,2,17').trim();
    return s || '1,2,17';
}
/** CEP óbvio inválido antes de chamar APIs. */
function assertCepFormatPlausible(cep) {
    if (cep.length !== 8) {
        throw new SuperFreteHttpError(400, 'CEP deve ter 8 dígitos.');
    }
    if (/^0{8}$/.test(cep)) {
        throw new SuperFreteHttpError(400, 'CEP inválido.');
    }
}
/** ViaCEP: evita chamada à SuperFrete quando o CEP não existe na base dos Correios. */
async function assertCepExistsViaCep(cep) {
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        });
        clearTimeout(t);
        if (!res.ok)
            return;
        const data = (await res.json());
        if (data?.erro === true) {
            throw new SuperFreteHttpError(400, 'CEP não encontrado. Confirme os oito dígitos (ex.: 01310-100).');
        }
    }
    catch (e) {
        if (e instanceof SuperFreteHttpError)
            throw e;
        // falha de rede / timeout no ViaCEP: segue para a SuperFrete
    }
}
function friendlySuperFreteBody(status, body) {
    if (status !== 400) {
        return `SuperFrete ${status}: ${body.slice(0, 400)}`;
    }
    try {
        const j = JSON.parse(body);
        const errs = j.errors;
        const parts = [];
        const dest = errs?.['correios.destination_postcode'] ??
            errs?.['correios.destination_postal_code'];
        if (dest) {
            parts.push('O CEP de destino foi recusado pelos Correios (inválido ou fora do formato esperado). Verifique os 8 dígitos.');
        }
        if (errs?.['ms-freight-calculator.no_result']) {
            parts.push('Não há frete disponível para este CEP com os serviços configurados. Experimente outro CEP ou contacte a loja.');
        }
        if (parts.length) {
            return [...new Set(parts)].join(' ');
        }
        return j.message ?? `Não foi possível cotar o frete (${body.slice(0, 200)})`;
    }
    catch {
        return `SuperFrete ${status}: ${body.slice(0, 400)}`;
    }
}
/** A API às vezes devolve array na raiz ou dentro de `content` / `data` / etc. */
function normalizeCalculatorPayload(raw) {
    if (Array.isArray(raw)) {
        return raw;
    }
    if (raw && typeof raw === 'object') {
        const o = raw;
        for (const k of ['content', 'data', 'quotes', 'services', 'result', 'payload', 'items']) {
            const v = o[k];
            if (Array.isArray(v))
                return v;
        }
        const nested = o.data;
        if (nested && typeof nested === 'object') {
            const inner = nested;
            for (const k of ['quotes', 'content', 'services']) {
                const v = inner[k];
                if (Array.isArray(v))
                    return v;
            }
        }
    }
    return [];
}
export async function quoteShipping(opts) {
    const cep = onlyDigits(opts.destinationCep);
    assertCepFormatPlausible(cep);
    await assertCepExistsViaCep(cep);
    if (FREE_SHIPPING_CEPS.has(cep)) {
        return {
            freeByLocation: true,
            options: [
                {
                    id: 'local-pickup',
                    name: 'Entrega Grátis (Região KING)',
                    price: 0,
                    deliveryDays: 1,
                    carrier: 'KING',
                    free: true,
                },
            ],
        };
    }
    const token = (process.env.SUPER_FRETE_API ||
        process.env.SUPERFRETE_API ||
        process.env.SUPERFRETE_API_KEY ||
        '').trim();
    if (!token) {
        throw new Error('Chave SuperFrete ausente. Na Vercel define SUPER_FRETE_API (ou SUPERFRETE_API) em Environment Variables.');
    }
    const fromPostal = originCep();
    const weight = Math.max(0.3, Math.min(30, opts.totalWeightKg));
    const body = {
        from: { postal_code: fromPostal },
        to: { postal_code: cep },
        services: serviceIds(),
        options: {
            own_hand: false,
            receipt: false,
            insurance_value: 0,
            use_insurance_value: false,
        },
        package: {
            height: 4,
            width: 20,
            length: 30,
            weight,
        },
    };
    const res = await fetch(`${SUPERFRETE_BASE}/api/v0/calculator`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            /** Alguns gateways bloqueiam User-Agent “curto”; usar UA de browser reduz 403 em serverless. */
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KING-Site/1.0',
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    const txt = await res.text();
    if (!res.ok) {
        const friendly = friendlySuperFreteBody(res.status, txt);
        if (res.status === 400) {
            throw new SuperFreteHttpError(400, friendly);
        }
        throw new Error(friendly);
    }
    let raw;
    try {
        raw = JSON.parse(txt);
    }
    catch {
        throw new Error('SuperFrete devolveu resposta que não é JSON');
    }
    const data = normalizeCalculatorPayload(raw);
    if (!data.length) {
        throw new Error(`SuperFrete devolveu lista vazia ou formato desconhecido: ${JSON.stringify(raw).slice(0, 280)}`);
    }
    const options = data
        .filter((s) => !s.error && s.price !== undefined)
        .map((s) => {
        const price = num(s.discount ?? s.price);
        const days = s.delivery_time ?? s.delivery_range?.max ?? s.delivery_range?.min ?? 7;
        return {
            id: String(s.id),
            name: s.name ?? s.company?.name ?? `Serviço ${s.id}`,
            price,
            deliveryDays: days,
            carrier: s.company?.name ?? 'Correios',
        };
    })
        .filter((o) => o.price > 0);
    options.sort((a, b) => a.price - b.price);
    return { options, freeByLocation: false };
}
export function handleQuote(req, res) {
    const body = req.body;
    if (body == null || typeof body !== 'object' || Array.isArray(body)) {
        res.status(400).json({ error: 'JSON inválido no corpo do pedido' });
        return;
    }
    const { cep, itemsCount, totalWeightKg } = body;
    if (!cep) {
        res.status(400).json({ error: 'CEP obrigatório' });
        return;
    }
    const perItem = 0.35;
    const weight = typeof totalWeightKg === 'number' && totalWeightKg > 0
        ? totalWeightKg
        : Math.max(0.3, (itemsCount ?? 1) * perItem);
    quoteShipping({ destinationCep: cep, totalWeightKg: weight, itemsCount: itemsCount ?? 1 })
        .then((r) => res.json(r))
        .catch((err) => {
        console.error('[superfrete] quote error', err);
        if (err instanceof SuperFreteHttpError) {
            res.status(err.statusCode).json({ error: err.message });
            return;
        }
        const msg = err instanceof Error ? err.message : 'Erro ao cotar frete';
        res.status(500).json({ error: msg });
    });
}
