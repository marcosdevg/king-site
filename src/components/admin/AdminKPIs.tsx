import { useMemo } from 'react';
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
import { Crown, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import type { Order } from '@/services/orders.service';
import { formatBRL } from '@/utils/format';

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

export default function AdminKPIs({ orders }: Props) {
  const paid = useMemo(
    () => orders.filter((o) => o.paymentStatus === 'paid' || o.status !== 'cancelado'),
    [orders]
  );

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
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(v) =>
                    typeof v === 'number' ? `R$${Math.round(v)}` : String(v)
                  }
                />
                <Tooltip
                  cursor={{ fill: 'rgba(193,18,31,0.1)' }}
                  contentStyle={{
                    background: '#0b0b0d',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: 11,
                  }}
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
                <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="rgba(255,255,255,0.4)"
                  tick={{ fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(193,18,31,0.1)' }}
                  contentStyle={{
                    background: '#0b0b0d',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: 11,
                  }}
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
