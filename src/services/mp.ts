/**
 * Wrapper do SDK Mercado Pago JS v2.
 * O `<script src="https://sdk.mercadopago.com/js/v2"></script>` está no index.html;
 * `window.MercadoPago` aparece após carregamento.
 */

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;
  }
}

export interface MercadoPagoInstance {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cardForm(options: any): MpCardFormInstance;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createCardToken(data: Record<string, any>): Promise<{ id: string }>;
}

export interface MpCardFormInstance {
  getCardFormData(): {
    paymentMethodId: string;
    issuerId?: string;
    cardholderEmail?: string;
    amount: string;
    token: string;
    installments: string;
    identificationNumber?: string;
    identificationType?: string;
  };
  unmount(): void;
  update?(opts: { amount?: string }): void;
}

let cachedInstance: MercadoPagoInstance | null = null;
let cachedPublicKey = '';
let publicKeyPromise: Promise<string> | null = null;

async function fetchPublicKey(): Promise<string> {
  if (publicKeyPromise) return publicKeyPromise;
  publicKeyPromise = (async () => {
    const res = await fetch('/api/mp/config');
    if (!res.ok) throw new Error('Falha ao carregar configuração de pagamento');
    const data = (await res.json()) as { publicKey?: string };
    if (!data.publicKey) throw new Error('Public key do Mercado Pago ausente no servidor');
    return data.publicKey;
  })();
  return publicKeyPromise;
}

function waitForSdk(timeoutMs = 8000): Promise<NonNullable<Window['MercadoPago']>> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.MercadoPago) {
      resolve(window.MercadoPago);
      return;
    }
    const start = Date.now();
    const timer = window.setInterval(() => {
      if (window.MercadoPago) {
        window.clearInterval(timer);
        resolve(window.MercadoPago);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        window.clearInterval(timer);
        reject(new Error('SDK do Mercado Pago não carregou'));
      }
    }, 80);
  });
}

export async function getMercadoPago(): Promise<MercadoPagoInstance> {
  const publicKey = await fetchPublicKey();
  if (cachedInstance && cachedPublicKey === publicKey) return cachedInstance;
  const Ctor = await waitForSdk();
  const inst = new Ctor(publicKey, { locale: 'pt-BR' });
  cachedInstance = inst;
  cachedPublicKey = publicKey;
  return inst;
}
