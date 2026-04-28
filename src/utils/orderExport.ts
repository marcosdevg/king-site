import * as XLSX from 'xlsx';
import type { Order } from '@/services/orders.service';

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

function formatDateBR(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function joinItems(o: Order): string {
  return o.items
    .map((i) => {
      const parts = [`${i.name} (${i.size}) x${i.quantity}`];
      if (i.stamp) parts.push(`costas: ${i.stamp.name}`);
      if (i.stampFront) parts.push(`frente: ${i.stampFront.name}`);
      return parts.join(' — ');
    })
    .join(' | ');
}

/** Gera e baixa um .xlsx com todos os pedidos fornecidos. */
export function exportOrdersToExcel(orders: Order[], filenameSuffix?: string) {
  const rows = orders.map((o) => ({
    'ID do pedido': o.id,
    Data: formatDateBR(tsFromOrder(o)),
    Status: o.status,
    Pagamento: o.paymentStatus ?? '',
    Método: o.paymentMethod,
    'ID transação': o.mpPaymentId ? String(o.mpPaymentId) : (o.paymentIntentId ?? ''),
    Cliente: o.shipping.fullName,
    Email: o.userEmail,
    Telefone: o.shipping.phone,
    CEP: o.shipping.zip,
    'Endereço': `${o.shipping.address}, ${o.shipping.number}${
      o.shipping.complement ? ' — ' + o.shipping.complement : ''
    }`,
    Cidade: o.shipping.city,
    Estado: o.shipping.state,
    Itens: joinItems(o),
    'Qtd. itens': o.items.reduce((acc, i) => acc + i.quantity, 0),
    Subtotal: o.subtotal,
    Cupom: o.coupon ? `#${o.coupon.code}` : '',
    'Cupom %': o.coupon?.discountPercent ?? '',
    Desconto: o.discount ?? 0,
    'Frete (serviço)': o.shippingService?.name ?? '',
    'Frete (valor)': o.shippingCost,
    Total: o.total,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  const widths: Record<string, number> = {
    'ID do pedido': 26,
    Data: 18,
    Status: 12,
    Pagamento: 14,
    Método: 10,
    'ID transação': 30,
    Cliente: 24,
    Email: 28,
    Telefone: 16,
    CEP: 12,
    'Endereço': 40,
    Cidade: 16,
    Estado: 6,
    Itens: 60,
    'Qtd. itens': 10,
    Subtotal: 12,
    Cupom: 14,
    'Cupom %': 8,
    Desconto: 12,
    'Frete (serviço)': 22,
    'Frete (valor)': 12,
    Total: 12,
  };
  ws['!cols'] = Object.keys(rows[0] ?? {}).map((k) => ({
    wch: widths[k] ?? 16,
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');

  const today = new Date().toISOString().slice(0, 10);
  const name = filenameSuffix
    ? `KING-pedidos-${today}-${filenameSuffix}.xlsx`
    : `KING-pedidos-${today}.xlsx`;

  XLSX.writeFile(wb, name);
}
