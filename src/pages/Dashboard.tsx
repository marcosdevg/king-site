import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import { HiOutlineLogout, HiOutlineDownload } from 'react-icons/hi';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useAuthStore } from '@/store/useAuthStore';
import { listOrdersByUser, type Order, type OrderStatus } from '@/services/orders.service';
import { logout } from '@/services/auth.service';
import { formatBRL, formatDate } from '@/utils/format';
import { openWhatsApp, buildOrderMessage, buildSupportMessage } from '@/utils/whatsapp';
import { cn } from '@/utils/cn';
import { useNavigate } from 'react-router-dom';

const STATUS_MAP: Record<OrderStatus, { label: string; color: string; step: number }> = {
  pendente: { label: 'Aguardando pagamento', color: 'text-king-glow', step: 1 },
  confirmado: { label: 'Pagamento confirmado', color: 'text-king-gold', step: 2 },
  enviado: { label: 'Enviado', color: 'text-blue-400', step: 3 },
  entregue: { label: 'Entregue', color: 'text-emerald-400', step: 4 },
  troca: { label: 'Em troca', color: 'text-amber-400', step: 4 },
  reembolsado: { label: 'Reembolsado', color: 'text-amber-300', step: 0 },
  cancelado: { label: 'Cancelado', color: 'text-red-500', step: 0 },
};

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const pwa = usePWAInstall();

  useEffect(() => {
    if (!user) return;
    listOrdersByUser(user.uid)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user]);

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <main className="relative min-h-screen bg-king-black py-16">
      <div className="light-rays opacity-20" />
      <div className="container-king relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end"
        >
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.4em] text-king-red">
              Sua corte
            </span>
            <h1 className="mt-2 heading-display text-5xl md:text-7xl text-king-fg">
              OLÁ, {(user?.displayName?.split(' ')[0] ?? 'Filho do Rei').toUpperCase()}
            </h1>
            <p className="mt-3 font-serif italic text-king-silver/80">
              Acompanhe seus pedidos e fale com o suporte.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => openWhatsApp(buildSupportMessage(user?.displayName ?? undefined))}
              className="group flex items-center gap-3 border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.25em] text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-400/20"
            >
              <FaWhatsapp className="text-xl" />
              Suporte WhatsApp
            </button>
            {pwa.canShow && (
              <button
                type="button"
                onClick={pwa.promptInstall}
                className="group flex items-center gap-3 border border-king-red/50 bg-king-red/10 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.25em] text-king-fg transition hover:border-king-red hover:bg-king-red/20"
              >
                <HiOutlineDownload className="text-xl text-king-red" />
                Instalar app
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 border border-white/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.25em] text-king-silver hover:border-king-red hover:text-king-red"
            >
              <HiOutlineLogout /> Sair
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard label="Pedidos" value={orders.length.toString()} />
          <StatCard
            label="Em andamento"
            value={orders.filter((o) => o.status !== 'entregue' && o.status !== 'cancelado').length.toString()}
          />
          <StatCard
            label="Total investido"
            value={formatBRL(orders.reduce((a, b) => a + b.total, 0))}
          />
        </div>

        <div className="mt-14">
          <h2 className="mb-6 heading-display text-2xl text-king-fg">
            Seus <span className="text-gradient-red">Pedidos</span>
          </h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="spinner-crown" />
            </div>
          ) : orders.length === 0 ? (
            <div className="glass flex flex-col items-center gap-4 p-14 text-center">
              <p className="heading-display text-xl text-king-fg">Nenhum pedido ainda</p>
              <p className="font-serif italic text-king-silver/70">
                Sua primeira peça real te espera na coleção.
              </p>
              <button
                onClick={() => navigate('/produtos')}
                className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-king-red hover:underline"
              >
                Explorar coleção →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order, i) => {
                const st = STATUS_MAP[order.status];
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass overflow-hidden"
                  >
                    <div className="flex flex-col gap-2 border-b border-white/5 p-5 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
                          Pedido #{order.id.slice(0, 10)}
                        </p>
                        <p className="mt-1 font-serif italic text-sm text-king-silver/70">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn('font-mono text-[11px] uppercase tracking-[0.25em]', st.color)}>
                          ● {st.label}
                        </span>
                        <span className="heading-display text-lg text-king-fg">
                          {formatBRL(order.total)}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      {order.status !== 'cancelado' && (
                        <div className="mb-5 flex items-center gap-2">
                          {['Pedido', 'Pagamento', 'Enviado', 'Entregue'].map((label, idx) => (
                            <div key={idx} className="flex flex-1 items-center gap-2">
                              <div
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[10px]',
                                  idx + 1 <= st.step
                                    ? 'border-king-red bg-king-red text-king-bone shadow-glow-red'
                                    : 'border-white/10 text-king-silver/50'
                                )}
                              >
                                {idx + 1}
                              </div>
                              <span
                                className={cn(
                                  'hidden text-[10px] font-mono uppercase tracking-[0.25em] md:inline',
                                  idx + 1 <= st.step ? 'text-king-fg' : 'text-king-silver/50'
                                )}
                              >
                                {label}
                              </span>
                              {idx < 3 && (
                                <div
                                  className={cn(
                                    'h-px flex-1',
                                    idx + 1 < st.step ? 'bg-king-red' : 'bg-white/10'
                                  )}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {order.items.map((item, j) => (
                          <li key={j} className="flex items-center gap-3">
                            <div className="h-16 w-14 shrink-0 overflow-hidden">
                              <img src={item.image} alt="" className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="heading-display truncate text-xs text-king-fg">
                                {item.name}
                              </p>
                              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-king-silver/70">
                                Tam {item.size} · {item.quantity}x · {formatBRL(item.price)}
                              </p>
                              {item.stamp && (
                                <p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.2em] text-king-red/90">
                                  Costas: {item.stamp.name}
                                </p>
                              )}
                              {item.stampFront && (
                                <p className="truncate font-mono text-[9px] uppercase tracking-[0.2em] text-king-silver/75">
                                  Frente: {item.stampFront.name}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          onClick={() =>
                            openWhatsApp(
                              buildOrderMessage(order.id, order.total, user?.displayName ?? undefined)
                            )
                          }
                          className="flex items-center gap-2 border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-emerald-300 transition hover:border-emerald-400"
                        >
                          <FaWhatsapp /> Falar sobre este pedido
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass relative overflow-hidden p-6"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-king-red/8 blur-3xl" />
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-king-silver">
        {label}
      </p>
      <p className="mt-2 heading-display text-3xl text-king-fg">{value}</p>
    </motion.div>
  );
}
