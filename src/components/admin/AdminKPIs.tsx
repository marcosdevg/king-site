import { useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Crown, ShoppingBag, TrendingUp, Wallet, Users, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Order } from '@/services/orders.service';
import { formatBRL, formatDate } from '@/utils/format';
import { useThemeStore } from '@/store/useThemeStore';

type Props = {
  orders: Order[];
};

function tsFromOrder(o: Order): number {
  const raw = o.createdAt as
    | { toDate?: () => Date; seconds?: number }
    | Date
    | string
    | undefined;
  if (!raw) return 0;
  if (raw instanceof Date) return raw.getTime();
  if (typeof raw === 'string') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (typeof raw === 'object' && raw) {
    if (typeof raw.toDate === 'function') return raw.toDate().getTime();
    if (typeof raw.seconds === 'number') return raw.seconds * 1000;
  }
  return 0;
}

function dayKey(ms: number): string {
  if (!ms) return 'sem-data';
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function dayLabel(key: string): string {
  if (key === 'sem-data') return '—';
  const [, mm, dd] = key.split('-');
  return `${dd}/${mm}`;
}

/** Vendas que entram em receita / gráficos: pagos e não cancelados nem reembolsados operacionalmente. */
function isPaidSale(o: Order): boolean {
  if (o.status === 'cancelado' || o.status === 'reembolsado') return false;
  const ps = o.paymentStatus ?? 'paid';
  return ps === 'paid';
}

/** Clientes para remarketing: falha no cartão, estorno na Stripe, pedido cancelado ou marcado reembolsado. */
function isRemarketingLead(o: Order): boolean {
  return (
    o.status === 'cancelado' ||
    o.status === 'reembolsado' ||
    o.paymentStatus === 'refunded' ||
    o.paymentStatus === 'failed'
  );
}

function remarketingTags(o: Order): string[] {
  const t: string[] = [];
  if (o.paymentStatus === 'failed') t.push('Pagamento recusado');
  if (o.paymentStatus === 'refunded') t.push('Estorno Stripe');
  if (o.status === 'reembolsado') t.push('Reembolsado (pedido)');
  if (o.status === 'cancelado') t.push('Pedido cancelado');
  return t;
}

function onlyDigits(v: string): string {
  return (v || '').replace(/\D/g, '');
}

function waDigits(phone: string): string {
  const d = onlyDigits(phone);
  if (d.length === 0) return '';
  if (d.startsWith('55')) return d;
  return `55${d}`;
}

function stripePaymentUrl(paymentIntentId: string): string {
  return `https://dashboard.stripe.com/payments/${encodeURIComponent(paymentIntentId)}`;
}

export default function AdminKPIs({ orders }: Props) {
  const siteTheme = useThemeStore((s) => s.theme);
  const chart = useMemo(() => {
    const light = siteTheme === 'light';
    return {
      grid: light ? 'rgba(28, 25, 23, 0.08)' : 'rgba(255,255,255,0.06)',
      axisStroke: light ? 'rgba(28, 25, 23, 0.35)' : 'rgba(255,255,255,0.4)',
      tickFill: light ? '#3d3429' : '#e8e4dc',
      tooltipBg: light ? '#faf7f2' : '#0b0b0d',
      tooltipBorder: light ? '1px solid rgba(28,25,23,0.14)' : '1px solid rgba(255,255,255,0.1)',
      tooltipLabel: light ? '#1c1917' : '#eeeae2',
      cursorFill: light ? 'rgba(193, 18, 31, 0.12)' : 'rgba(193, 18, 31, 0.1)',
    };
  }, [siteTheme]);

  const tickProps = useMemo(
    () => ({
      fontSize: 10,
      fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
      fill: chart.tickFill,
    }),
    [chart.tickFill]
  );

  const paid = useMemo(() => orders.filter(isPaidSale), [orders]);

  const remarketing = useMemo(() => {
    return orders
      .filter(isRemarketingLead)
      .sort((a, b) => tsFromOrder(b) - tsFromOrder(a));
  }, [orders]);

  const remarketingStats = useMemo(
    () => ({
      failed: orders.filter((o) => o.paymentStatus === 'failed').length,
      refunded: orders.filter((o) => o.paymentStatus === 'refunded').length,
      cancelado: orders.filter((o) => o.status === 'cancelado').length,
      reembolsado: orders.filter((o) => o.status === 'reembolsado').length,
    }),
    [orders]
  );

  const copyRemarketingEmails = useCallback(() => {
    const text = remarketing
      .map((o) => o.userEmail?.trim())
      .filter(Boolean)
      .join('; ');
    if (!text) {
      toast.error('Nenhum e-mail na lista');
      return;
    }
    void navigator.clipboard.writeText(text).then(() => toast.success('E-mails copiados'));
  }, [remarketing]);

  const copyRemarketingTable = useCallback(() => {
    if (remarketing.length === 0) {
      toast.error('Lista vazia');
      return;
    }
    const head =
      'Nome\tEmail\tTelefone\tCidade\tUF\tSituação\tValor\tData\tPedido\tPaymentIntent';
    const rows = remarketing.map((o) =>
      [
        o.shipping.fullName,
        o.userEmail,
        o.shipping.phone,
        o.shipping.city,
        o.shipping.state,
        remarketingTags(o).join(' | '),
        o.total.toFixed(2).replace('.', ','),
        formatDate(o.createdAt),
        o.id,
        o.paymentIntentId ?? '',
      ].join('\t')
    );
    void navigator.clipboard.writeText([head, ...rows].join('\n')).then(() =>
      toast.success('Tabela copiada (cole no Excel ou Sheets)')
    );
  }, [remarketing]);

  const { totalRevenue, totalOrders, totalItems, avgTicket } = useMemo(() => {
    const revenue = paid.reduce((acc, o) => acc + (o.total ?? 0), 0);
    const count = paid.length;
    const items = paid.reduce(
      (acc, o) => acc + o.items.reduce((a, i) => a + i.quantity, 0),
      0
    );
    return {
      totalRevenue: revenue,
      totalOrders: count,
      totalItems: items,
      avgTicket: count > 0 ? revenue / count : 0,
    };
  }, [paid]);

  const dailyData = useMemo(() => {
    const map = new Map<string, { day: string; revenue: number; orders: number }>();
    for (const o of paid) {
      const k = dayKey(tsFromOrder(o));
      if (!map.has(k)) map.set(k, { day: k, revenue: 0, orders: 0 });
      const cur = map.get(k)!;
      cur.revenue += o.total ?? 0;
      cur.orders += 1;
    }
    const arr = Array.from(map.values())
      .filter((d) => d.day !== 'sem-data')
      .sort((a, b) => a.day.localeCompare(b.day));
    return arr.slice(-14).map((d) => ({ ...d, label: dayLabel(d.day) }));
  }, [paid]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of paid) {
      for (const i of o.items) {
        const key = i.productId;
        if (!map.has(key)) map.set(key, { name: i.name, qty: 0, revenue: 0 });
        const cur = map.get(key)!;
        cur.qty += i.quantity;
        cur.revenue += i.price * i.quantity;
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 7);
  }, [paid]);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label="Receita total"
          value={formatBRL(totalRevenue)}
        />
        <KpiCard
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Pedidos"
          value={String(totalOrders)}
        />
        <KpiCard
          icon={<Crown className="h-4 w-4" />}
          label="Itens vendidos"
          value={String(totalItems)}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Ticket médio"
          value={formatBRL(avgTicket)}
        />
      </section>

    

      <section className="glass p-5">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-red">
              Receita por dia
            </h3>
            <p className="mt-1 font-serif text-xs italic text-king-silver/70">
              Últimos 14 dias com pedidos.
            </p>
          </div>
        </header>
        {dailyData.length === 0 ? (
          <p className="py-10 text-center font-serif italic text-king-silver/60">
            Ainda sem pedidos suficientes para desenhar o gráfico.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid stroke={chart.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={chart.axisStroke}
                  tick={tickProps}
                />
                <YAxis
                  stroke={chart.axisStroke}
                  tick={tickProps}
                  tickFormatter={(v) =>
                    typeof v === 'number' ? `R$${Math.round(v)}` : String(v)
                  }
                />
                <Tooltip
                  cursor={{ fill: chart.cursorFill }}
                  contentStyle={{
                    background: chart.tooltipBg,
                    border: chart.tooltipBorder,
                    borderRadius: 4,
                    fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
                    fontSize: 11,
                    color: chart.tooltipLabel,
                  }}
                  labelStyle={{ color: chart.tooltipLabel }}
                  itemStyle={{ color: chart.tooltipLabel }}
                  formatter={(v, name) => {
                    const n = typeof v === 'number' ? v : Number(v ?? 0);
                    return name === 'revenue'
                      ? [formatBRL(n), 'Receita']
                      : [String(n), 'Pedidos'];
                  }}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#c1121f"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#c1121f' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="glass p-5">
        <header className="mb-4">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-red">
            Produtos mais vendidos
          </h3>
          <p className="mt-1 font-serif text-xs italic text-king-silver/70">
            Top 7 por quantidade vendida.
          </p>
        </header>
        {topProducts.length === 0 ? (
          <p className="py-10 text-center font-serif italic text-king-silver/60">
            Sem dados de vendas ainda.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ left: 40, right: 20, top: 8, bottom: 8 }}
              >
                <CartesianGrid stroke={chart.grid} horizontal={false} />
                <XAxis
                  type="number"
                  stroke={chart.axisStroke}
                  tick={tickProps}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  stroke={chart.axisStroke}
                  tick={{ ...tickProps, fontSize: 9 }}
                />
                <Tooltip
                  cursor={{ fill: chart.cursorFill }}
                  contentStyle={{
                    background: chart.tooltipBg,
                    border: chart.tooltipBorder,
                    borderRadius: 4,
                    fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
                    fontSize: 11,
                    color: chart.tooltipLabel,
                  }}
                  labelStyle={{ color: chart.tooltipLabel }}
                  itemStyle={{ color: chart.tooltipLabel }}
                  formatter={(v, _name, item) => {
                    const n = typeof v === 'number' ? v : Number(v ?? 0);
                    const p = (item as { payload?: { revenue?: number } } | undefined)
                      ?.payload;
                    const rev = p?.revenue ?? 0;
                    return [`${n} un · ${formatBRL(rev)}`, 'Vendas'];
                  }}
                />
                <Bar dataKey="qty" fill="#c1121f" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>


      <section className="glass p-5">
        <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-king-red" />
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-red">
                Remarketing — recusa, estorno, cancelamento
              </h3>
     
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-king-silver/55">
                Recusados: {remarketingStats.failed} · Estornos: {remarketingStats.refunded} ·
                Cancelados: {remarketingStats.cancelado} · Reembolso (pedido): {remarketingStats.reembolsado} ·
                Linhas: {remarketing.length}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyRemarketingEmails}
              className="inline-flex items-center gap-2 border border-white/15 bg-white/[0.04] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-king-silver transition hover:border-king-red hover:text-king-fg"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar e-mails
            </button>
            <button
              type="button"
              onClick={copyRemarketingTable}
              className="inline-flex items-center gap-2 border border-king-red/40 bg-king-red/10 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-king-red transition hover:bg-king-red hover:text-king-bone"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar tabela
            </button>
          </div>
        </header>

        {remarketing.length === 0 ? (
          <p className="py-8 text-center font-serif italic text-king-silver/60">
            Ainda não há nenhum pedido para remarketing.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-white/10 font-mono text-[9px] uppercase tracking-[0.28em] text-king-silver/70">
                    <th className="pb-3 pr-3">Situação</th>
                    <th className="pb-3 pr-3">Nome</th>
                    <th className="pb-3 pr-3">E-mail</th>
                    <th className="pb-3 pr-3">Telefone</th>
                    <th className="pb-3 pr-3">Cidade</th>
                    <th className="pb-3 pr-3">Valor</th>
                    <th className="pb-3 pr-3">Data</th>
                    <th className="pb-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-[11px] text-king-silver">
                  {remarketing.map((o) => {
                    const wa = waDigits(o.shipping.phone);
                    const waUrl = wa
                      ? `https://wa.me/${wa}?text=${encodeURIComponent(`Olá ${o.shipping.fullName}, aqui é da KING sobre seu pedido.`)}`
                      : '';
                    return (
                      <tr key={o.id} className="border-b border-white/[0.06] align-top">
                        <td className="py-3 pr-3">
                          <div className="flex max-w-[14rem] flex-wrap gap-1">
                            {remarketingTags(o).map((tag) => (
                              <span
                                key={tag}
                                className="rounded border border-king-red/35 bg-king-red/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-king-red"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-king-fg">{o.shipping.fullName}</td>
                        <td className="py-3 pr-3 break-all">{o.userEmail}</td>
                        <td className="py-3 pr-3 whitespace-nowrap">{o.shipping.phone || '—'}</td>
                        <td className="py-3 pr-3">
                          {o.shipping.city} / {o.shipping.state}
                        </td>
                        <td className="py-3 pr-3 text-king-fg">{formatBRL(o.total)}</td>
                        <td className="py-3 pr-3 whitespace-nowrap text-king-silver/80">
                          {formatDate(o.createdAt)}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            {waUrl ? (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] uppercase tracking-[0.18em] text-emerald-400 underline-offset-2 hover:underline"
                              >
                                WhatsApp
                              </a>
                            ) : null}
                            {o.paymentIntentId ? (
                              <a
                                href={stripePaymentUrl(o.paymentIntentId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-king-silver underline-offset-2 hover:text-king-fg hover:underline"
                              >
                                Stripe
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="space-y-4 md:hidden">
              {remarketing.map((o) => {
                const wa = waDigits(o.shipping.phone);
                const waUrl = wa
                  ? `https://wa.me/${wa}?text=${encodeURIComponent(`Olá ${o.shipping.fullName}, aqui é da KING sobre seu pedido.`)}`
                  : '';
                return (
                  <li
                    key={o.id}
                    className="rounded border border-white/10 bg-king-black/40 p-4 font-mono text-[11px]"
                  >
                    <div className="mb-2 flex flex-wrap gap-1">
                      {remarketingTags(o).map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-king-red/35 bg-king-red/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-king-red"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="heading-display text-sm text-king-fg">{o.shipping.fullName}</p>
                    <p className="mt-1 break-all text-king-silver/90">{o.userEmail}</p>
                    <p className="mt-1 text-king-silver">{o.shipping.phone || '—'}</p>
                    <p className="mt-1 text-king-silver/80">
                      {o.shipping.city} / {o.shipping.state}
                    </p>
                    <p className="mt-2 text-king-fg">{formatBRL(o.total)}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-king-silver/60">
                      {formatDate(o.createdAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 underline"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      {o.paymentIntentId ? (
                        <a
                          href={stripePaymentUrl(o.paymentIntentId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-king-silver underline"
                        >
                          Stripe <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass p-4">
      <div className="flex items-center gap-2 text-king-red">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-[0.3em]">{label}</span>
      </div>
      <p className="mt-2 heading-display text-2xl text-king-fg md:text-3xl">{value}</p>
    </div>
  );
}
