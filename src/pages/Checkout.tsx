import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineLockClosed, HiOutlineShieldCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatBRL } from '@/utils/format';
import GlowButton from '@/components/ui/GlowButton';
import { createOrder, type Shipping } from '@/services/orders.service';
import { openWhatsApp, buildOrderMessage } from '@/utils/whatsapp';
import { cn } from '@/utils/cn';

export default function Checkout() {
  const { items, subtotal, clear } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'boleto'>('pix');

  const [shipping, setShipping] = useState<Shipping>({
    fullName: user?.displayName ?? '',
    phone: '',
    address: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    zip: '',
  });

  const total = subtotal();
  const shippingCost = total >= 299 ? 0 : 29.9;
  const final = total + shippingCost;

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-king-black">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="heading-display text-3xl text-king-bone">Sacola vazia</h2>
          <button
            onClick={() => navigate('/produtos')}
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-red"
          >
            ← Ir para a coleção
          </button>
        </div>
      </main>
    );
  }

  const onField = (k: keyof Shipping, v: string) =>
    setShipping((s) => ({ ...s, [k]: v }));

  const finish = async () => {
    if (!user) {
      toast.error('Entre para finalizar');
      navigate('/login');
      return;
    }
    setSubmitting(true);
    try {
      const orderId = await createOrder({
        userId: user.uid,
        userEmail: user.email ?? '',
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          image: i.image,
          size: i.size,
          quantity: i.quantity,
          stamp: i.stamp ?? undefined,
          stampFront: i.stampFront ?? undefined,
        })),
        subtotal: total,
        shippingCost,
        total: final,
        status: 'pendente',
        shipping,
        paymentMethod,
      });

      toast.success('Pedido confirmado! A realeza agradece.');
      clear();
      openWhatsApp(buildOrderMessage(orderId, final, shipping.fullName));
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar o pedido. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-king-black py-16">
      <div className="light-rays opacity-20" />
      <div className="container-king relative">
        <div className="mb-10">
          <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-king-red">
            Finalizar compra
          </span>
          <h1 className="mt-2 heading-display text-5xl md:text-6xl text-king-bone">
            CHECKOUT
          </h1>
        </div>

        {/* Steps */}
        <div className="mb-10 flex items-center gap-4">
          {[1, 2].map((n) => (
            <button
              key={n}
              onClick={() => setStep(n as 1 | 2)}
              className={cn(
                'flex items-center gap-3 border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.3em] transition',
                step === n
                  ? 'border-king-red bg-king-red text-king-bone'
                  : 'border-white/10 text-king-silver hover:border-king-red'
              )}
            >
              <span className="heading-display text-sm">0{n}</span>
              {n === 1 ? 'Endereço' : 'Pagamento'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass p-6 md:p-8"
          >
            {step === 1 && (
              <>
                <h3 className="heading-display mb-6 text-xl text-king-bone">
                  Endereço de entrega
                </h3>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field label="Nome completo" value={shipping.fullName} onChange={(v) => onField('fullName', v)} />
                  <Field label="Telefone" value={shipping.phone} onChange={(v) => onField('phone', v)} />
                  <Field label="CEP" value={shipping.zip} onChange={(v) => onField('zip', v)} />
                  <Field label="Cidade" value={shipping.city} onChange={(v) => onField('city', v)} />
                  <Field label="Estado" value={shipping.state} onChange={(v) => onField('state', v)} />
                  <Field label="Endereço" value={shipping.address} onChange={(v) => onField('address', v)} />
                  <Field label="Número" value={shipping.number} onChange={(v) => onField('number', v)} />
                  <Field
                    label="Complemento (opcional)"
                    value={shipping.complement ?? ''}
                    onChange={(v) => onField('complement', v)}
                  />
                </div>
                <div className="mt-8 flex justify-end">
                  <GlowButton onClick={() => setStep(2)}>Continuar para pagamento</GlowButton>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h3 className="heading-display mb-6 text-xl text-king-bone">
                  Forma de pagamento
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {(
                    [
                      { id: 'pix', label: 'PIX', desc: '5% de desconto' },
                      { id: 'credit', label: 'Cartão', desc: 'Até 6x sem juros' },
                      { id: 'boleto', label: 'Boleto', desc: 'Vence em 3 dias' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPaymentMethod(p.id)}
                      className={cn(
                        'flex flex-col items-start gap-1 border p-4 text-left transition',
                        paymentMethod === p.id
                          ? 'border-king-red bg-king-red/5 shadow-glow-red'
                          : 'border-white/10 hover:border-king-red'
                      )}
                    >
                      <span className="heading-display text-sm tracking-[0.25em] text-king-bone">
                        {p.label}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/70">
                        {p.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {paymentMethod === 'credit' && (
                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <Field label="Nome no cartão" value="" onChange={() => {}} />
                    <Field label="Número do cartão" value="" onChange={() => {}} placeholder="0000 0000 0000 0000" />
                    <Field label="Validade" value="" onChange={() => {}} placeholder="MM/AA" />
                    <Field label="CVV" value="" onChange={() => {}} placeholder="000" />
                  </div>
                )}

                <div className="mt-8 flex flex-wrap gap-3 text-xs font-mono uppercase tracking-[0.25em] text-king-silver/70">
                  <span className="flex items-center gap-2">
                    <HiOutlineLockClosed /> Dados criptografados
                  </span>
                  <span className="flex items-center gap-2">
                    <HiOutlineShieldCheck /> Stripe-ready
                  </span>
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver hover:text-king-red"
                  >
                    ← Voltar
                  </button>
                  <GlowButton onClick={finish} disabled={submitting}>
                    {submitting ? 'Processando...' : `Pagar ${formatBRL(final)}`}
                  </GlowButton>
                </div>
              </>
            )}
          </motion.div>

          <aside className="glass h-fit p-6 lg:sticky lg:top-28">
            <h3 className="heading-display mb-5 text-lg tracking-[0.25em] text-king-bone">
              SEU PEDIDO
            </h3>
            <ul className="mb-5 space-y-4 max-h-64 overflow-y-auto pr-2">
              {items.map((i) => (
                <li
                  key={`${i.productId}-${i.size}-${i.stamp?.id ?? 'n'}-${i.stampFront?.id ?? 'nf'}`}
                  className="flex gap-3"
                >
                  <div className="h-16 w-14 overflow-hidden bg-king-graphite">
                    <img src={i.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="heading-display text-xs text-king-bone">
                      {i.name}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/70">
                      {i.size} · {i.quantity}x
                    </span>
                    {i.stamp && (
                      <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-king-red/90">
                        Costas: {i.stamp.name}
                      </span>
                    )}
                    {i.stampFront && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-king-silver/80">
                        Frente: {i.stampFront.name}
                      </span>
                    )}
                    <span className="mt-auto font-display text-xs text-king-bone">
                      {formatBRL(i.price * i.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-white/10 pt-4 text-sm text-king-silver">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatBRL(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Frete</span>
                <span>{shippingCost === 0 ? 'Grátis' : formatBRL(shippingCost)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver">
                Total
              </span>
              <span className="heading-display text-3xl text-king-bone">
                {formatBRL(final)}
              </span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver/80">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-king"
      />
    </label>
  );
}
