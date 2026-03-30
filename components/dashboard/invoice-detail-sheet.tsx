"use client";

import * as React from "react";
import {
  IconCalendar,
  IconChartLine,
  IconCrown,
  IconPencil,
  IconPrinter,
  IconReceipt,
  IconTrash,
  IconUser,
  IconWallet,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  buildOriginalInvoiceHtml,
  buildPosReceiptHtml,
  type InvoicePrintPayload,
  openPrintWindow,
} from "@/lib/invoice-print-html";
import { cn } from "@/lib/utils";

type InvoiceDetail = {
  invoice: {
    id: string;
    client_id: string | null;
    client_name: string | null;
    sale_date: string;
    status: string;
    currency: string;
    subtotal_amount: string;
    discount_amount: string;
    tax_amount: string;
    total_amount: string;
    payment_method: string | null;
    credit_due_date: string | null;
    invoice_number: string | null;
    notes: string | null;
    created_at: string;
    voided_at: string | null;
  };
  company: {
    name: string;
    tax_id: string | null;
    auth_code: string | null;
    range_start: string | null;
    range_end: string | null;
    expiration_date: string | null;
  } | null;
  lines: {
    line_number: number;
    product_name: string;
    sku: string | null;
    quantity: string;
    unit_price: string;
    line_total: string;
    image_url: string | null;
  }[];
};

function formatMoney(amountStr: string, currency: string) {
  const n = Number.parseFloat(amountStr);
  const sym = currency === "HNL" || !currency ? "L" : currency;
  return `${sym} ${Number.isNaN(n) ? "0.00" : n.toFixed(2)}`;
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

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const t = d.toLocaleTimeString("es-HN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const date = d.toLocaleDateString("es-HN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${t} | ${date}`;
}

function toPrintPayload(d: InvoiceDetail): InvoicePrintPayload {
  const co = d.company ?? {
    name: "—",
    tax_id: null,
    auth_code: null,
    range_start: null,
    range_end: null,
    expiration_date: null,
  };
  return {
    company: co,
    invoice: {
      id: d.invoice.id,
      invoice_number: d.invoice.invoice_number,
      sale_date: d.invoice.sale_date,
      created_at: d.invoice.created_at,
      subtotal_amount: d.invoice.subtotal_amount,
      discount_amount: d.invoice.discount_amount,
      tax_amount: d.invoice.tax_amount,
      total_amount: d.invoice.total_amount,
      currency: d.invoice.currency,
      payment_method: d.invoice.payment_method,
      status: d.invoice.status,
      credit_due_date: d.invoice.credit_due_date,
      notes: d.invoice.notes,
      voided_at: d.invoice.voided_at,
    },
    client_name: d.invoice.client_name,
    lines: d.lines.map((l) => ({
      product_name: l.product_name,
      quantity: l.quantity,
      unit_price: l.unit_price,
      line_total: l.line_total,
      sku: l.sku,
    })),
  };
}

export type InvoiceDetailSheetProps = {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceChanged?: () => void;
};

export function InvoiceDetailSheet({
  invoiceId,
  open,
  onOpenChange,
  onInvoiceChanged,
}: InvoiceDetailSheetProps) {
  const [loading, setLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<InvoiceDetail | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !invoiceId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`, {
          credentials: "include",
        });
        const json = (await res.json()) as
          | { success: true; data: InvoiceDetail }
          | { success: false; error: string };
        if (!res.ok || !json.success) {
          throw new Error(!json.success ? json.error : "Error");
        }
        if (!cancelled) {
          setDetail(json.data);
          setNotes(json.data.invoice.notes ?? "");
          setInvoiceNumber(json.data.invoice.invoice_number ?? "");
          setEditOpen(false);
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Error al cargar");
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, invoiceId]);

  const titleConcept = React.useMemo(() => {
    if (!detail?.lines.length) return "Factura";
    return detail.lines
      .map((l) => `${l.quantity} ${l.product_name}`)
      .join(", ");
  }, [detail]);

  const displayRef = detail
    ? (detail.invoice.invoice_number ??
      `#${detail.invoice.id.slice(0, 8).toUpperCase()}`)
    : "";

  async function saveEdit() {
    if (!invoiceId || !detail) return;
    if (detail.invoice.voided_at) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes.trim() || null,
          invoice_number: invoiceNumber.trim() || null,
        }),
      });
      const json = (await res.json()) as
        | { success: true }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        throw new Error(!json.success ? json.error : "Error");
      }
      toast.success("Cambios guardados");
      setEditOpen(false);
      onInvoiceChanged?.();
      const r = await fetch(`/api/invoices/${invoiceId}`, {
        credentials: "include",
      });
      const j = (await r.json()) as { success: true; data: InvoiceDetail };
      if (r.ok && j.success) {
        setDetail(j.data);
        setNotes(j.data.invoice.notes ?? "");
        setInvoiceNumber(j.data.invoice.invoice_number ?? "");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function voidInvoice() {
    if (!invoiceId || !detail) return;
    if (
      !confirm(
        "¿Anular esta factura? Se revertirá el stock de los productos y la venta no contará en totales.",
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/void`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as
        | { success: true }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        throw new Error(!json.success ? json.error : "Error");
      }
      toast.success("Factura anulada");
      onInvoiceChanged?.();
      const r = await fetch(`/api/invoices/${invoiceId}`, {
        credentials: "include",
      });
      const j = (await r.json()) as { success: true; data: InvoiceDetail };
      if (r.ok && j.success) setDetail(j.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al anular");
    }
  }

  function printPos() {
    if (!detail) return;
    if (!openPrintWindow(buildPosReceiptHtml(toPrintPayload(detail)))) {
      toast.error("Permití ventanas emergentes para imprimir");
    }
  }

  function printOriginal() {
    if (!detail) return;
    if (!openPrintWindow(buildOriginalInvoiceHtml(toPrintPayload(detail)))) {
      toast.error("Permití ventanas emergentes para imprimir");
    }
  }

  const isVoid = Boolean(detail?.invoice.voided_at);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-2xl"
        showCloseButton
      >
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Cargando…</p>
        ) : !detail ? (
          <p className="p-6 text-sm text-muted-foreground">
            No se encontró la factura.
          </p>
        ) : (
          <>
            <SheetHeader className="border-b pb-4 text-left">
              <SheetTitle className="line-clamp-2 pr-8 text-base leading-snug">
                {titleConcept}
              </SheetTitle>
              <SheetDescription>
                Transacción {displayRef}
                {isVoid ? (
                  <span className="ml-2 text-destructive">· Anulada</span>
                ) : null}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-4 px-6 py-4">
              <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor total</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatMoney(
                        detail.invoice.total_amount,
                        detail.invoice.currency,
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium",
                      detail.invoice.status === "paid"
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
                    )}
                  >
                    {detail.invoice.status === "paid" ? "Pagada" : "A crédito"}
                  </span>
                </div>
                <Separator className="my-3" />
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      Subtotal (líneas)
                    </dt>
                    <dd className="tabular-nums">
                      {formatMoney(
                        detail.invoice.subtotal_amount,
                        detail.invoice.currency,
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Descuento</dt>
                    <dd className="tabular-nums">
                      {formatMoney(
                        detail.invoice.discount_amount,
                        detail.invoice.currency,
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      Impuestos (ISV / otros)
                    </dt>
                    <dd className="tabular-nums">
                      {formatMoney(
                        detail.invoice.tax_amount,
                        detail.invoice.currency,
                      )}
                    </dd>
                  </div>
                </dl>
                <Separator className="my-3" />
                <ul className="space-y-2 text-xs">
                  <li className="flex gap-2">
                    <IconCalendar
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      stroke={1.5}
                    />
                    <span>
                      <span className="text-muted-foreground">
                        Fecha y hora{" "}
                      </span>
                      {formatWhen(detail.invoice.created_at)}
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <IconWallet
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      stroke={1.5}
                    />
                    <span>
                      <span className="text-muted-foreground">
                        Método de pago{" "}
                      </span>
                      {paymentLabel(
                        detail.invoice.payment_method,
                        detail.invoice.status,
                      )}
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <IconUser
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      stroke={1.5}
                    />
                    <span>
                      <span className="text-muted-foreground">Cliente </span>
                      {detail.invoice.client_name ?? "Consumidor final"}
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <IconChartLine
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      stroke={1.5}
                    />
                    <span className="text-muted-foreground">
                      Ganancia:{" "}
                      <span className="text-foreground">—</span>{" "}
                      <span className="text-[0.65rem]">
                        (próx.: costo de compra)
                      </span>
                    </span>
                  </li>
                </ul>
              </div>

              {editOpen ? (
                <div className="space-y-3 rounded-lg border border-border/80 p-4">
                  <p className="text-sm font-medium">Editar datos SAR / notas</p>
                  <div className="grid gap-1.5">
                    <Label htmlFor="inv-num">N° factura (SAR)</Label>
                    <Input
                      id="inv-num"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Ej. 000-001-01-00005008"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="inv-notes">Observaciones</Label>
                    <Input
                      id="inv-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas internas"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="bg-wakecito-mint font-semibold text-wakecito-charcoal hover:bg-wakecito-mint/85"
                      disabled={saving || isVoid}
                      onClick={() => void saveEdit()}
                    >
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditOpen(false);
                        setNotes(detail.invoice.notes ?? "");
                        setInvoiceNumber(detail.invoice.invoice_number ?? "");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  Listado de productos
                </h3>
                <ul className="space-y-3">
                  {detail.lines.map((l) => (
                    <li
                      key={l.line_number}
                      className="flex gap-3 rounded-lg border border-border/60 bg-background p-2"
                    >
                      <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {l.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={l.image_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-[0.65rem] text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{l.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number.parseFloat(l.quantity)}{" "}
                          {Number.parseFloat(l.quantity) === 1
                            ? "unidad"
                            : "unidades"}
                        </p>
                        <p className="text-sm font-medium tabular-nums">
                          {formatMoney(l.line_total, detail.invoice.currency)}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            (
                            {formatMoney(
                              l.unit_price,
                              detail.invoice.currency,
                            )}{" "}
                            × und.)
                          </span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-auto border-t bg-muted/20 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={printOriginal}
                >
                  <IconPrinter className="size-4" stroke={1.5} />
                  Imprimir
                  <span className="relative ml-0.5 inline-flex">
                    <IconCrown className="size-3.5 text-sky-600" stroke={1.5} />
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={printPos}
                >
                  <IconReceipt className="size-4" stroke={1.5} />
                  Comprobante
                  <IconCrown className="size-3.5 text-sky-600" stroke={1.5} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={isVoid}
                  onClick={() => setEditOpen((v) => !v)}
                >
                  <IconPencil className="size-4" stroke={1.5} />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isVoid}
                  onClick={() => void voidInvoice()}
                >
                  <IconTrash className="size-4" stroke={1.5} />
                  Anular
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
