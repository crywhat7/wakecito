/** Escape text for HTML (print windows). */
export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type InvoicePrintPayload = {
  company: {
    name: string;
    tax_id: string | null;
    auth_code: string | null;
    range_start: string | null;
    range_end: string | null;
    expiration_date: string | null;
  };
  invoice: {
    id: string;
    invoice_number: string | null;
    sale_date: string;
    created_at: string;
    subtotal_amount: string;
    discount_amount: string;
    tax_amount: string;
    total_amount: string;
    currency: string;
    payment_method: string | null;
    status: string;
    credit_due_date: string | null;
    notes: string | null;
    voided_at: string | null;
  };
  client_name: string | null;
  lines: {
    product_name: string;
    quantity: string;
    unit_price: string;
    line_total: string;
    sku: string | null;
  }[];
};

function sym(currency: string) {
  return currency === "HNL" || !currency ? "L" : currency;
}

function fmtMoney(amountStr: string, currency: string) {
  const n = Number.parseFloat(amountStr);
  if (Number.isNaN(n)) return `${sym(currency)} 0.00`;
  return `${sym(currency)} ${n.toFixed(2)}`;
}

function paymentLabel(method: string | null, status: string): string {
  if (status === "credit") return "A crédito";
  const m: Record<string, string> = {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    other: "Otro",
  };
  return method ? (m[method] ?? method) : "—";
}

/** Comprobante estilo ticket POS (80mm aprox). */
export function buildPosReceiptHtml(d: InvoicePrintPayload): string {
  const c = d.company;
  const inv = d.invoice;
  const cur = sym(inv.currency);

  const fiscalBlock = [
    escHtml(c.name),
    c.tax_id ? `RTN: ${escHtml(c.tax_id)}` : null,
    c.auth_code ? `C.A.I.: ${escHtml(c.auth_code)}` : null,
    c.range_start && c.range_end
      ? `RANGO AUTORIZADO: ${escHtml(c.range_start)} AL ${escHtml(c.range_end)}`
      : null,
    c.expiration_date
      ? `FECHA LÍMITE DE EMISIÓN: ${escHtml(c.expiration_date)}`
      : null,
  ]
    .filter(Boolean)
    .join("<br/>");

  const facturaLine = inv.invoice_number
    ? `NO. FACTURA: ${escHtml(inv.invoice_number)}`
    : `REFERENCIA: ${escHtml(inv.id.slice(0, 8).toUpperCase())}`;

  const rows = d.lines
    .map(
      (l) =>
        `<tr><td style="text-align:right;padding:2px 4px">${escHtml(String(Number.parseFloat(l.quantity)))}</td><td style="padding:2px 4px">${escHtml(l.product_name)}</td><td style="text-align:right;padding:2px 4px">${fmtMoney(l.line_total, inv.currency)}</td></tr>`,
    )
    .join("");

  const base =
    Number.parseFloat(inv.subtotal_amount) -
    Number.parseFloat(inv.discount_amount);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Comprobante</title></head><body style="font-family:ui-monospace,Cascadia Mono,Consolas,monospace;font-size:11px;max-width:72mm;margin:0 auto;padding:10px;">
<div style="text-align:center;font-weight:700;font-size:13px;margin-bottom:8px">${escHtml(c.name)}</div>
<div style="line-height:1.35;margin-bottom:8px">${fiscalBlock}</div>
<div style="border-top:1px dashed #000;margin:8px 0"></div>
<div style="margin-bottom:6px;line-height:1.4">${facturaLine}<br/>FECHA VENTA: ${escHtml(inv.sale_date)}<br/>FECHA/HORA EMISIÓN: ${escHtml(new Date(inv.created_at).toLocaleString("es-HN"))}<br/>CLIENTE: ${escHtml(d.client_name ?? "Consumidor final")}</div>
<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr><th style="text-align:right;width:14%">CANT.</th><th style="text-align:left">DESCRIPCIÓN</th><th style="text-align:right;width:24%">TOTAL</th></tr></thead><tbody>${rows}</tbody></table>
<div style="border-top:1px dashed #000;margin:8px 0"></div>
<p style="margin:2px 0">SUB TOTAL: ${fmtMoney(inv.subtotal_amount, inv.currency)}</p>
<p style="margin:2px 0">DESCUENTO: ${fmtMoney(inv.discount_amount, inv.currency)}</p>
<p style="margin:2px 0">BASE (APROX.): ${cur} ${Number.isNaN(base) ? "0.00" : base.toFixed(2)}</p>
<p style="margin:2px 0">I.S.V. / IMPUESTOS: ${fmtMoney(inv.tax_amount, inv.currency)}</p>
<p style="margin:8px 0;font-weight:700">TOTAL A PAGAR: ${fmtMoney(inv.total_amount, inv.currency)}</p>
<p style="margin:2px 0">MÉTODO: ${escHtml(paymentLabel(inv.payment_method, inv.status))}</p>
${inv.status === "credit" && inv.credit_due_date ? `<p style="margin:2px 0">FECHA TENTATIVA COBRO: ${escHtml(inv.credit_due_date)}</p>` : ""}
${inv.voided_at ? `<p style="margin:8px 0;font-weight:700">*** DOCUMENTO ANULADO ***</p>` : ""}
<p style="margin-top:12px;font-size:10px;text-align:center">Gracias por preferirnos.</p>
</body></html>`;
}

/** Factura original más amplia (impresión A4 / navegador). */
export function buildOriginalInvoiceHtml(d: InvoicePrintPayload): string {
  const c = d.company;
  const inv = d.invoice;

  const rows = d.lines
    .map(
      (l, i) =>
        `<tr>
          <td style="border:1px solid #ccc;padding:6px">${i + 1}</td>
          <td style="border:1px solid #ccc;padding:6px">${escHtml(l.sku ?? "—")}</td>
          <td style="border:1px solid #ccc;padding:6px">${escHtml(l.product_name)}</td>
          <td style="border:1px solid #ccc;padding:6px;text-align:right">${escHtml(String(Number.parseFloat(l.quantity)))}</td>
          <td style="border:1px solid #ccc;padding:6px;text-align:right">${fmtMoney(l.unit_price, inv.currency)}</td>
          <td style="border:1px solid #ccc;padding:6px;text-align:right">${fmtMoney(l.line_total, inv.currency)}</td>
        </tr>`,
    )
    .join("");

  const base =
    Number.parseFloat(inv.subtotal_amount) -
    Number.parseFloat(inv.discount_amount);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Factura</title></head>
<body style="font-family:system-ui,sans-serif;font-size:13px;max-width:820px;margin:0 auto;padding:24px;color:#111">
<header style="display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #333;padding-bottom:16px;margin-bottom:20px">
  <div>
    <h1 style="margin:0;font-size:20px">${escHtml(c.name)}</h1>
    ${c.tax_id ? `<p style="margin:4px 0 0">RTN: ${escHtml(c.tax_id)}</p>` : ""}
    ${c.auth_code ? `<p style="margin:4px 0 0">C.A.I.: ${escHtml(c.auth_code)}</p>` : ""}
    ${c.range_start && c.range_end ? `<p style="margin:4px 0 0">Rango autorizado: ${escHtml(c.range_start)} al ${escHtml(c.range_end)}</p>` : ""}
    ${c.expiration_date ? `<p style="margin:4px 0 0">Fecha límite de emisión: ${escHtml(c.expiration_date)}</p>` : ""}
  </div>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:700">FACTURA</div>
    <p style="margin:8px 0 0">${inv.invoice_number ? `N° ${escHtml(inv.invoice_number)}` : `Ref. ${escHtml(inv.id.slice(0, 8).toUpperCase())}`}</p>
    <p style="margin:4px 0 0">Emisión: ${escHtml(new Date(inv.created_at).toLocaleString("es-HN"))}</p>
    <p style="margin:4px 0 0">Fecha venta: ${escHtml(inv.sale_date)}</p>
  </div>
</header>
<section style="margin-bottom:20px">
  <p style="margin:0"><strong>Cliente:</strong> ${escHtml(d.client_name ?? "Consumidor final")}</p>
  ${inv.notes ? `<p style="margin:8px 0 0"><strong>Observaciones:</strong> ${escHtml(inv.notes)}</p>` : ""}
</section>
<table style="width:100%;border-collapse:collapse;font-size:12px">
  <thead>
    <tr style="background:#f4f4f4">
      <th style="border:1px solid #ccc;padding:8px;width:40px">#</th>
      <th style="border:1px solid #ccc;padding:8px">Código</th>
      <th style="border:1px solid #ccc;padding:8px;text-align:left">Descripción</th>
      <th style="border:1px solid #ccc;padding:8px;text-align:right">Cant.</th>
      <th style="border:1px solid #ccc;padding:8px;text-align:right">P. unit.</th>
      <th style="border:1px solid #ccc;padding:8px;text-align:right">Total</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div style="margin-top:20px;display:flex;justify-content:flex-end">
  <div style="min-width:280px">
    <p style="display:flex;justify-content:space-between;margin:4px 0"><span>Subtotal</span><span>${fmtMoney(inv.subtotal_amount, inv.currency)}</span></p>
    <p style="display:flex;justify-content:space-between;margin:4px 0"><span>Descuento</span><span>${fmtMoney(inv.discount_amount, inv.currency)}</span></p>
    <p style="display:flex;justify-content:space-between;margin:4px 0"><span>Base imponible (aprox.)</span><span>${sym(inv.currency)} ${Number.isNaN(base) ? "0.00" : base.toFixed(2)}</span></p>
    <p style="display:flex;justify-content:space-between;margin:4px 0"><span>ISV / impuestos</span><span>${fmtMoney(inv.tax_amount, inv.currency)}</span></p>
    <p style="display:flex;justify-content:space-between;margin:12px 0 0;font-size:16px;font-weight:700;border-top:1px solid #333;padding-top:8px"><span>Total</span><span>${fmtMoney(inv.total_amount, inv.currency)}</span></p>
    <p style="margin:12px 0 0;font-size:12px"><strong>Método de pago:</strong> ${escHtml(paymentLabel(inv.payment_method, inv.status))}</p>
    ${inv.voided_at ? `<p style="margin:16px 0;color:#b91c1c;font-weight:700">DOCUMENTO ANULADO</p>` : ""}
  </div>
</div>
</body></html>`;
}

export function openPrintWindow(html: string) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
