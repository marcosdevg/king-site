import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  MessageCircle,
  Printer,
  MapPin,
  Package,
  CreditCard,
  Tag,
} from 'lucide-react';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
  type Order,
  type OrderStatus,
} from '@/services/orders.service';
import { formatBRL, formatDate } from '@/utils/format';
import { openShippingLabel } from '@/utils/printLabel';
import { cn } from '@/utils/cn';
import OrderItemVisualRow from '@/components/orders/OrderItemVisualRow';

function onlyDigits(v: string): string {
  return (v || '').replace(/\D/g, '');
}

function waPhone(phone: string): string {
  const d = onlyDigits(phone);
  if (d.length === 0) return '';
  if (d.startsWith('55')) return d;
  return `55${d}`;
}

type Props = {
  order: Order;
  onStatusChange: (id: string, status: OrderStatus) => void;
  /** Quando definido, permite alinhar o Firestore ao estorno/recusa do gateway (remarketing nos KPIs). */
  onPaymentStatusChange?: (id: string, paymentStatus: Order['paymentStatus']) => void;
  /** Habilita checkbox de seleção (modo bulk no admin). */
  selected?: boolean;
  onSelectChange?: () => void;
};

const PAYMENT_STATUS_SELECT: { value: NonNullable<Order['paymentStatus']>; label: string }[] = [
  { value: 'pending', label: 'Pagamento pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'failed', label: 'Recusado' },
  { value: 'refunded', label: 'Estornado' },
];

export default function OrderCard({
  order,
  onStatusChange,
  onPaymentStatusChange,
  selected,
  onSelectChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const short = order.id.slice(0, 10).toUpperCase();
  const phone = waPhone(order.shipping.phone);
  const waText = encodeURIComponent(
    `Olá ${order.shipping.fullName}! Aqui é da KING 👑 sobre seu pedido #${short}.`
  );
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${waText}` : '';

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass overflow-hidden"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          {onSelectChange && (
            <input
              type="checkbox"
              aria-label="Selecionar pedido"
              checked={!!selected}
              onChange={onSelectChange}
              className="mt-1 h-4 w-4 shrink-0 accent-king-red"
            />
          )}
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
              #{short}
            </p>
            <PaymentBadge
              status={order.paymentStatus}
              method={order.paymentMethod}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/60">
              {formatDate(order.createdAt)}
            </span>
          </div>
          <h3 className="mt-1 heading-display text-base text-king-fg">
            {order.shipping.fullName}
          </h3>
          <p className="font-serif italic text-xs text-king-silver/70">
            {order.userEmail}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/70">
            <span className="flex items-center gap-1.5">
              <Package className="h-3 w-3" /> {order.items.length} itens
            </span>
            <span>{formatBRL(order.total)}</span>
            {order.shippingService && (
              <span className="text-king-silver/60">
                {order.shippingService.name}
              </span>
            )}
            {order.coupon && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-king-red/40 bg-king-red/10 px-2 py-0.5 text-king-red">
                <Tag className="h-3 w-3" />#{order.coupon.code} −
                {order.coupon.discountPercent}%
              </span>
            )}
          </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={order.status}
            onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
            className="select-king-dark font-mono text-[10px] uppercase tracking-[0.25em]"
          >
            {ORDER_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {onPaymentStatusChange && (
            <select
              value={order.paymentStatus ?? 'pending'}
              onChange={(e) =>
                onPaymentStatusChange(
                  order.id,
                  e.target.value as NonNullable<Order['paymentStatus']>
                )
              }
              title="Alinhar com o painel Mercado Pago (estorno, chargeback, falha)"
              className="select-king-dark max-w-[11rem] font-mono text-[10px] uppercase tracking-[0.2em]"
            >
              {PAYMENT_STATUS_SELECT.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Falar com cliente no WhatsApp"
              className="flex h-9 items-center gap-2 rounded-sm bg-[#25D366] px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-black transition hover:brightness-110"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={() => openShippingLabel(order)}
            title="Imprimir etiqueta A4"
            className="flex h-9 items-center gap-2 rounded-sm border border-king-red/60 bg-king-red/10 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-king-red transition hover:bg-king-red hover:text-king-bone"
          >
            <Printer className="h-3.5 w-3.5" />
            Etiqueta
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 text-king-silver transition',
              open && 'border-king-red text-king-fg'
            )}
            aria-label={open ? 'Fechar detalhes' : 'Ver detalhes'}
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
            />
          </button>
        </div>
      </header>

      {open && (
        <div className="grid grid-cols-1 gap-6 border-t border-white/5 bg-king-black/30 p-5 lg:grid-cols-[1fr_1fr]">
          <section>
            <h4 className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-king-red">
              <MapPin className="h-3.5 w-3.5" />
              Endereço de entrega
            </h4>
            <address className="space-y-1 font-serif text-sm not-italic text-king-silver">
              <p className="text-king-fg">{order.shipping.fullName}</p>
              <p>
                {order.shipping.address}, {order.shipping.number}
                {order.shipping.complement ? ` — ${order.shipping.complement}` : ''}
              </p>
              <p>
                {order.shipping.city} / {order.shipping.state}
              </p>
              <p className="font-mono text-sm tracking-[0.1em] text-king-fg">
                CEP: {order.shipping.zip}
              </p>
              <p>Tel: {order.shipping.phone}</p>
            </address>

            <h4 className="mt-6 mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-king-red">
              <CreditCard className="h-3.5 w-3.5" />
              Pagamento
            </h4>
            <dl className="space-y-1 font-mono text-xs text-king-silver">
              <div className="flex justify-between">
                <dt>Método</dt>
                <dd className="uppercase text-king-fg">
                  {order.paymentMethod}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Status</dt>
                <dd className="uppercase text-king-fg">
                  {order.paymentStatus ?? '—'}
                </dd>
              </div>
              {(order.mpPaymentId || order.paymentIntentId) && (
                <div className="flex justify-between">
                  <dt>{order.mpPaymentId ? 'Mercado Pago' : 'Stripe ID'}</dt>
                  <dd className="text-king-fg">
                    …{String(order.mpPaymentId ?? order.paymentIntentId ?? '').slice(-10)}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section>
            <h4 className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-king-red">
              <Package className="h-3.5 w-3.5" />
              Itens do pedido
            </h4>
            <ul className="space-y-3">
              {order.items.map((i, idx) => (
                <li
                  key={`${i.productId}-${idx}`}
                  className="flex items-start gap-3 border-b border-white/5 pb-3 last:border-b-0"
                >
                  <OrderItemVisualRow item={i} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="heading-display text-sm text-king-fg">{i.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-king-silver/70">
                      {i.size} · {i.quantity}x · {formatBRL(i.price)}
                    </p>
                    {(i.stamp || i.stampFront) && (
                      <p className="mt-1 font-mono text-[9px] uppercase leading-snug tracking-[0.16em] text-king-silver/75">
                        {i.stamp && (
                          <span className="text-king-red/90">Costas: {i.stamp.name}</span>
                        )}
                        {i.stamp && i.stampFront && <span className="text-king-silver/40"> · </span>}
                        {i.stampFront && <span>Frente: {i.stampFront.name}</span>}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 self-start font-display text-sm text-king-fg">
                    {formatBRL(i.price * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-white/10 pt-3 font-mono text-xs text-king-silver">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatBRL(order.subtotal)}</dd>
              </div>
              {order.coupon && (order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <dt>
                    Cupom #{order.coupon.code} (−{order.coupon.discountPercent}%)
                  </dt>
                  <dd>− {formatBRL(order.discount ?? 0)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Frete</dt>
                <dd>
                  {order.shippingCost === 0
                    ? 'Grátis'
                    : formatBRL(order.shippingCost)}
                </dd>
              </div>
              <div className="mt-1 flex justify-between border-t border-white/10 pt-2 text-sm text-king-fg">
                <dt>Total</dt>
                <dd className="font-display">{formatBRL(order.total)}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </motion.article>
  );
}

function PaymentBadge({
  status,
  method,
}: {
  status?: Order['paymentStatus'];
  method?: Order['paymentMethod'];
}) {
  const label = status ?? 'pending';
  const color =
    label === 'paid'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : label === 'failed'
        ? 'border-red-500/40 bg-red-500/10 text-red-300'
        : label === 'refunded'
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          : 'border-white/15 bg-white/5 text-king-silver';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em]',
        color
      )}
    >
      {method ? method.toUpperCase() : '—'} · {label}
    </span>
  );
}
