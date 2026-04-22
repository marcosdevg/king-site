const DEFAULT_N8N_URL = 'https://n8n.iacodenxt.online/webhook/King-notificar';
const DEFAULT_WHATSAPP = '5579999062401';
export function n8nUrl() {
    return (process.env.N8N_NOTIFY_WEBHOOK_URL ?? DEFAULT_N8N_URL).trim();
}
export function notifyWhatsapp() {
    return (process.env.N8N_NOTIFY_WHATSAPP ?? DEFAULT_WHATSAPP).replace(/\D/g, '') || DEFAULT_WHATSAPP;
}
export async function postToN8n(payload) {
    const url = n8nUrl();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(payload),
            signal: ctrl.signal,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`n8n HTTP ${res.status}: ${text.slice(0, 300)}`);
        }
    }
    finally {
        clearTimeout(t);
    }
}
/** Mesmo formato do webhook Stripe → n8n, para o fluxo n8n reconhecer. */
export async function sendN8nTestNotification() {
    const amountBrl = 99.9;
    await postToN8n({
        source: 'king-admin-test',
        stripeEvent: 'payment_intent.succeeded',
        whatsapp: notifyWhatsapp(),
        paymentIntentId: `pi_teste_admin_${Date.now()}`,
        amountBrl,
        currency: 'brl',
        metadata: { test: 'true', origin: 'admin_kpi_button' },
        message: `🧪 Teste KING Admin — ${amountBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · webhook n8n/WhatsApp (sem venda real)`,
    });
}
