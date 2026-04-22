import type { Order } from '@/services/orders.service';
import { formatBRL } from '@/utils/format';

/** Remetente KING (usado no cabeçalho da etiqueta). */
const SENDER = {
  name: 'KING OVERSIZED',
  cep: '49680-000',
  address: 'Sergipe, Brasil',
  phone: '(79) 99906-2401',
};

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function openShippingLabel(order: Order): void {
  const ship = order.shipping;
  const short = order.id.slice(0, 10).toUpperCase();
  const itemsList = order.items
    .map(
      (i) => `
        <tr>
          <td>${escapeHtml(i.name)}</td>
          <td>${escapeHtml(i.size)}</td>
          <td>${i.quantity}</td>
          ${i.stamp ? `<td>Costas: ${escapeHtml(i.stamp.name)}</td>` : '<td></td>'}
          ${i.stampFront ? `<td>Frente: ${escapeHtml(i.stampFront.name)}</td>` : '<td></td>'}
        </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8" />
<title>Etiqueta · ${short}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111;
    font-family: 'Helvetica Neue', Arial, sans-serif; }
  .page { width: 210mm; min-height: 297mm; padding: 14mm; margin: 0 auto; }
  h1 { font-size: 22px; letter-spacing: 0.25em; margin: 0; }
  .crown { letter-spacing: 0.08em; font-weight: 700; }
  .sub { color: #666; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; margin-top: 4px; }
  .row { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 10px; }
  .id { font-family: 'Courier New', monospace; font-size: 14px; border: 1px solid #000; padding: 6px 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
  .card { border: 1px solid #000; padding: 12px; }
  .card h2 { font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; margin: 0 0 8px; color: #000; }
  .card p { margin: 2px 0; font-size: 13px; }
  .card .name { font-size: 16px; font-weight: 700; }
  .cep { font-family: 'Courier New', monospace; font-size: 18px; letter-spacing: 0.1em; }
  .service { margin-top: 16px; border: 1px dashed #000; padding: 10px; text-align: center; font-weight: 700;
    letter-spacing: 0.18em; text-transform: uppercase; font-size: 12px; }
  table { width: 100%; margin-top: 18px; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #ccc; padding: 6px 4px; text-align: left; }
  th { text-transform: uppercase; letter-spacing: 0.18em; font-size: 10px; color: #444; }
  .totals { margin-top: 18px; text-align: right; font-size: 13px; }
  .totals .total { font-size: 20px; font-weight: 700; letter-spacing: 0.05em; }
  .footer { margin-top: 22px; font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.22em; text-align: center; }
  @media print {
    .no-print { display: none !important; }
    .page { padding: 10mm; }
  }
  .btn {
    display: inline-block; background: #c1121f; color: #fff; text-decoration: none;
    padding: 8px 16px; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; margin-right: 8px;
    border: none; cursor: pointer;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="no-print" style="margin-bottom:10mm;">
      <button class="btn" onclick="window.print()">Imprimir</button>
      <button class="btn" style="background:#111" onclick="window.close()">Fechar</button>
    </div>
    <div class="row">
      <div>
        <h1>KING <span class="crown">OVERSIZED</span></h1>
        <div class="sub">Etiqueta de envio</div>
      </div>
      <div class="id">#${short}</div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>Remetente</h2>
        <p class="name">${escapeHtml(SENDER.name)}</p>
        <p>${escapeHtml(SENDER.address)}</p>
        <p class="cep">${escapeHtml(SENDER.cep)}</p>
        <p>${escapeHtml(SENDER.phone)}</p>
      </div>
      <div class="card">
        <h2>Destinatário</h2>
        <p class="name">${escapeHtml(ship.fullName)}</p>
        <p>${escapeHtml(ship.address)}, ${escapeHtml(ship.number)}${
          ship.complement ? ' — ' + escapeHtml(ship.complement) : ''
        }</p>
        <p>${escapeHtml(ship.city)} / ${escapeHtml(ship.state)}</p>
        <p class="cep">${escapeHtml(ship.zip)}</p>
        <p>${escapeHtml(ship.phone)}</p>
      </div>
    </div>

    <div class="service">
      ${escapeHtml(order.shippingService?.name ?? 'Frete a combinar')} —
      ${order.shippingService?.carrier ?? ''}${
        order.shippingService?.deliveryDays
          ? ' · até ' + order.shippingService.deliveryDays + ' dias úteis'
          : ''
      }
    </div>

    <table>
      <thead>
        <tr><th>Produto</th><th>Tam.</th><th>Qt.</th><th colspan="2">Personalização</th></tr>
      </thead>
      <tbody>${itemsList}</tbody>
    </table>

    <div class="totals">
      <div>Subtotal: ${formatBRL(order.subtotal)}</div>
      <div>Frete: ${order.shippingCost === 0 ? 'Grátis' : formatBRL(order.shippingCost)}</div>
      <div class="total">Total: ${formatBRL(order.total)}</div>
    </div>

    <div class="footer">
      KING · ${escapeHtml(order.userEmail)} · Pedido gerado automaticamente — pagamento confirmado via Stripe
    </div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 400);
    });
  </script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=1200');
  if (!w) {
    alert('Habilite popups para imprimir a etiqueta.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
