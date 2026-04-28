import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatBRL } from '@/utils/format';
import GlowButton from '@/components/ui/GlowButton';
import {
  createOrder,
  type Shipping,
  type ShippingService,
} from '@/services/orders.service';
import { cn } from '@/utils/cn';
import ShippingQuoteBox from '@/components/checkout/ShippingQuoteBox';
import MPCardForm from '@/components/checkout/MPCardForm';
import PixPaymentForm from '@/components/checkout/PixPaymentForm';
import PostCheckoutModal from '@/components/checkout/PostCheckoutModal';
import CouponField, { type AppliedCoupon } from '@/components/checkout/CouponField';
import type { ShippingOption } from '@/services/checkout.api';
import { incrementCouponUsage } from '@/services/coupons.service';
import {
  readSavedShipping,
  writeSavedShipping,
} from '@/utils/savedCheckoutAddress';
import { cartLinesFromStoreItems } from '@/utils/checkoutInventory';

export default function Checkout() {
  const { items, subtotal, clear } = useCartStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [post, setPost] = useState<{
    orderId: string;
    total: number;
    shippingName: string;
  } | null>(null);

  const [shipping, setShipping] = useState<Shipping>({
    fullName: '',
    phone: '',
    address: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    zip: '',
  });
  /** Endereço vindo do localStorage: mostra card + frete + cupom em vez do formulário completo. */
  const [addressSummaryMode, setAddressSummaryMode] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setAddressSummaryMode(false);
      return;
    }
    const saved = readSavedShipping(user.uid);
    if (saved) {
      setShipping(saved);
      setAddressSummaryMode(true);
      setSelectedShipping(null);
    } else {
      setShipping({
        fullName: user.displayName ?? '',
        phone: '',
        address: '',
        number: '',
        complement: '',
        city: '',
        state: '',
        zip: '',
      });
      setAddressSummaryMode(false);
    }
  }, [user?.uid, user?.displayName]);

  const total = subtotal();
  const inventoryLines = useMemo(() => cartLinesFromStoreItems(items), [items]);
  const shippingCost = selectedShipping?.price ?? 0;
  const discountAmount = coupon
    ? Math.round(total * coupon.discountPercent) / 100
    : 0;
  const final = Math.max(0, total - discountAmount) + shippingCost;

  const addressComplete = useMemo(() => {
    const required: (keyof Shipping)[] = [
      'fullName',
      'phone',
      'address',
      'number',
      'city',
      'state',
      'zip',
    ];
    return required.every((k) => !!(shipping[k] ?? '').trim());
  }, [shipping]);

  if (items.length === 0 && !post) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-king-black">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="heading-display text-3xl text-king-fg">Sacola vazia</h2>
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

  const goPayment = () => {
    if (!user) {
      toast.error('Entre para finalizar');
      navigate('/login');
      return;
    }
    if (!addressComplete) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (!selectedShipping) {
      toast.error('Calcule e selecione uma opção de frete');
      return;
    }
    writeSavedShipping(user.uid, shipping);
    setStep(2);
  };

  const buildBaseOrder = () => {
    if (!selectedShipping) throw new Error('Sem frete selecionado');
    const shippingService: ShippingService = {
      id: selectedShipping.id,
      name: selectedShipping.name,
      carrier: selectedShipping.carrier,
      deliveryDays: selectedShipping.deliveryDays,
      free: selectedShipping.free ?? false,
    };
    const orderCoupon = coupon
      ? {
          id: coupon.id,
          code: coupon.code,
          discountPercent: coupon.discountPercent,
          discountAmount,
        }
      : null;
    return {
      shippingService,
      orderCoupon,
      items: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        image: i.image,
        size: i.size,
        quantity: i.quantity,
        stamp: i.stamp ?? null,
        stampFront: i.stampFront ?? null,
      })),
    };
  };

  /** Cria o pedido em Firestore com paymentStatus 'pending' (compartilhado por PIX e cartão). */
  const ensureOrder = async (method: 'card' | 'pix'): Promise<string | null> => {
    if (pendingOrderId) return pendingOrderId;
    if (!user || !selectedShipping) {
      toast.error('Faltam dados pra finalizar');
      return null;
    }
    setCreatingOrder(true);
    try {
      const { shippingService, orderCoupon, items: orderItems } = buildBaseOrder();
      const orderId = await createOrder({
        userId: user.uid,
        userEmail: user.email ?? '',
        items: orderItems,
        subtotal: total,
        shippingCost,
        discount: discountAmount,
        coupon: orderCoupon,
        total: final,
        status: 'pendente',
        shipping,
        shippingService,
        paymentMethod: method,
        paymentIntentId: null,
        paymentStatus: 'pending',
        inventoryLines: JSON.stringify(inventoryLines ?? []),
      });
      setPendingOrderId(orderId);
      return orderId;
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar pedido. Tente novamente.');
      return null;
    } finally {
      setCreatingOrder(false);
    }
  };

  /** Disparado quando o backend (cartão sync) ou listener (PIX/card pending) confirma pagamento. */
  const handlePaid = async () => {
    if (!pendingOrderId || !selectedShipping) return;
    if (coupon) {
      void incrementCouponUsage(coupon.id);
    }
    toast.success('Pagamento confirmado!');
    clear();
    setPost({
      orderId: pendingOrderId,
      total: final,
      shippingName: selectedShipping.name,
    });
    setPendingOrderId(null);
  };

  const closePost = () => {
    setPost(null);
    navigate('/dashboard');
  };

  return (
    <main className="relative min-h-screen bg-king-black py-16">
      <div className="light-rays opacity-20" />
      <div className="container-king relative">
        <div className="mb-10">
          <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-king-red">
            Finalizar compra
          </span>
          <h1 className="mt-2 heading-display text-5xl md:text-6xl text-king-fg">
            CHECKOUT
          </h1>
          <p className="mt-3 max-w-xl font-mono text-[10px] uppercase leading-relaxed tracking-[0.22em] text-king-silver/80 sm:text-[11px] sm:tracking-[0.26em]">
            Envio e venda apenas no Brasil · preços em real (BRL)
          </p>
        </div>

        <div className="mb-10 flex items-center gap-4">
          {[1, 2].map((n) => (
            <button
              key={n}
              onClick={() => {
                if (n === 2 && (!addressComplete || !selectedShipping)) {
                  toast.error('Preencha o endereço e escolha o frete primeiro.');
                  return;
                }
                setStep(n as 1 | 2);
              }}
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
                {addressSummaryMode && user ? (
                  <>
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="heading-display text-xl text-king-fg">
                          Teu endereço
                        </h3>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-king-silver/70">
                          Guardado neste dispositivo · CEP para cotar o frete · só Brasil
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressSummaryMode(false);
                          setSelectedShipping(null);
                        }}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-king-silver transition hover:border-king-red hover:text-king-red"
                        aria-label="Editar endereço"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>

                    <SavedAddressCard shipping={shipping} />

                    <div className="mt-8 grid gap-4">
                      <ShippingQuoteBox
                        cep={shipping.zip}
                        itemsCount={items.reduce((acc, i) => acc + i.quantity, 0)}
                        selected={selectedShipping}
                        onSelect={setSelectedShipping}
                      />
                      <CouponField
                        applied={coupon}
                        onApply={setCoupon}
                        onRemove={() => setCoupon(null)}
                      />
                    </div>

                    <div className="mt-8 flex justify-end">
                      <GlowButton onClick={goPayment}>Continuar para pagamento</GlowButton>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="heading-display text-xl text-king-fg">
                      Endereço de entrega
                    </h3>
                    <p className="mb-6 mt-1 font-serif text-sm italic text-king-silver/65">
                      Endereço nacional (CEP brasileiro) — não enviamos para o exterior.
                    </p>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                      <Field
                        label="Nome completo"
                        value={shipping.fullName}
                        onChange={(v) => onField('fullName', v)}
                      />
                      <Field
                        label="Telefone"
                        value={shipping.phone}
                        onChange={(v) => onField('phone', v)}
                      />
                      <Field
                        label="CEP"
                        value={shipping.zip}
                        onChange={(v) => onField('zip', maskCEP(v))}
                        placeholder="00000-000"
                      />
                      <Field
                        label="Cidade"
                        value={shipping.city}
                        onChange={(v) => onField('city', v)}
                      />
                      <Field
                        label="Estado"
                        value={shipping.state}
                        onChange={(v) => onField('state', v.toUpperCase().slice(0, 2))}
                        placeholder="SP"
                      />
                      <Field
                        label="Endereço"
                        value={shipping.address}
                        onChange={(v) => onField('address', v)}
                      />
                      <Field
                        label="Número"
                        value={shipping.number}
                        onChange={(v) => onField('number', v)}
                      />
                      <Field
                        label="Complemento (opcional)"
                        value={shipping.complement ?? ''}
                        onChange={(v) => onField('complement', v)}
                      />
                    </div>

                    <div className="mt-8 grid gap-4">
                      <ShippingQuoteBox
                        cep={shipping.zip}
                        itemsCount={items.reduce((acc, i) => acc + i.quantity, 0)}
                        selected={selectedShipping}
                        onSelect={setSelectedShipping}
                      />
                      <CouponField
                        applied={coupon}
                        onApply={setCoupon}
                        onRemove={() => setCoupon(null)}
                      />
                    </div>

                    <div className="mt-8 flex justify-end">
                      <GlowButton onClick={goPayment}>Continuar para pagamento</GlowButton>
                    </div>
                  </>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <h3 className="heading-display text-xl text-king-fg">
                  Forma de pagamento
                </h3>

                <div className="mt-5 flex gap-2">
                  {(['card', 'pix'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(m);
                        void ensureOrder(m);
                      }}
                      className={cn(
                        'flex-1 border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.3em] transition',
                        paymentMethod === m
                          ? 'border-king-red bg-king-red text-king-bone shadow-glow-red'
                          : 'border-white/10 text-king-silver hover:border-king-red'
                      )}
                    >
                      {m === 'card' ? 'Cartão' : 'PIX'}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  {creatingOrder && !pendingOrderId ? (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <div className="spinner-crown" />
                      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
                        Registrando pedido…
                      </p>
                    </div>
                  ) : paymentMethod === 'card' ? (
                    <MPCardForm
                      amount={final}
                      orderId={pendingOrderId}
                      ensureOrder={() => ensureOrder('card')}
                      payerFirstName={shipping.fullName.split(' ')[0]}
                      payerLastName={shipping.fullName.split(' ').slice(1).join(' ')}
                      onPaid={handlePaid}
                    />
                  ) : (
                    <PixPaymentForm
                      orderId={pendingOrderId}
                      total={final}
                      description={`Pedido KING ${shipping.fullName}`.slice(0, 50)}
                      payerFirstName={shipping.fullName.split(' ')[0]}
                      payerLastName={shipping.fullName.split(' ').slice(1).join(' ')}
                      onPaid={handlePaid}
                    />
                  )}
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver hover:text-king-red"
                  >
                    ← Voltar
                  </button>
                </div>
              </>
            )}
          </motion.div>

          <aside className="glass h-fit p-6 lg:sticky lg:top-28">
            <h3 className="heading-display mb-5 text-lg tracking-[0.25em] text-king-fg">
              SEU PEDIDO
            </h3>
            <ul className="mb-5 space-y-4 max-h-64 overflow-y-auto pr-2">
              {items.map((i) => (
                <li
                  key={`${i.productId}-${i.size}-${i.stamp?.id ?? 'n'}-${i.stampFront?.id ?? 'nf'}`}
                  className="flex gap-3"
                >
                  <div className="h-16 w-14 overflow-hidden">
                    <img src={i.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="heading-display text-xs text-king-fg">{i.name}</span>
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
                    <span className="mt-auto font-display text-xs text-king-fg">
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
              {coupon && discountAmount > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>
                    Cupom <span className="font-mono">#{coupon.code}</span> (−
                    {coupon.discountPercent}%)
                  </span>
                  <span>− {formatBRL(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Frete</span>
                <span>
                  {selectedShipping
                    ? shippingCost === 0
                      ? 'Grátis'
                      : formatBRL(shippingCost)
                    : '—'}
                </span>
              </div>
              {selectedShipping && (
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/60">
                  {selectedShipping.name} · {selectedShipping.deliveryDays}d
                </p>
              )}
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-king-silver">
                Total
              </span>
              <span className="heading-display text-3xl text-king-fg">
                {formatBRL(final)}
              </span>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {post && (
          <PostCheckoutModal
            orderId={post.orderId}
            total={post.total}
            shippingName={post.shippingName}
            customerName={shipping.fullName}
            onClose={closePost}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function SavedAddressCard({ shipping }: { shipping: Shipping }) {
  const line2 = [shipping.address, shipping.number].filter(Boolean).join(', ');
  const comp = (shipping.complement ?? '').trim();
  return (
    <div className="rounded-md border border-white/10 bg-king-black/30 p-4 sm:p-5">
      <p className="heading-display text-base text-king-fg sm:text-lg">{shipping.fullName}</p>
      <p className="mt-2 font-mono text-xs text-king-silver">{shipping.phone}</p>
      <p className="mt-3 font-serif text-sm italic leading-relaxed text-king-silver/90">
        {line2}
        {comp ? ` · ${comp}` : ''}
      </p>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-king-silver/80">
        {shipping.city} — {shipping.state} · CEP {shipping.zip}
      </p>
    </div>
  );
}

function maskCEP(v: string): string {
  const digits = v.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
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
